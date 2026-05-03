const Complaint = require('../models/Complaint.model');
const { normalizeDepartmentKey } = require('../utils/departmentTaxonomy');


const HF_SIMILARITY_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const RADIUS_KM = 0.5;             
const SIMILARITY_THRESHOLD = 0.65; 
const LOCATION_SIMILARITY_THRESHOLD = 0.45;
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; 

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const OVERLAP_STOPWORDS = new Set([
  'the','a','an','is','it','in','on','at','to','of','and','or','but','for',
  'with','this','that','there','are','was','were','has','have','had','been',
  'be','by','from','as','not','no','so','if','we','i','my','our','your',
  'he','she','they','their','its','do','did','will','would','can','could',
  'should','may','might','am','also','very','just','more','some','any','all',
  'and','the','for','from','road','area','city','district','bangladesh',
  'এবং','এই','সেই','একটি','একটা','করে','হচ্ছে','হয়েছে','আমার','আমাদের',
  'এখানে','ওখানে','রাস্তা','এলাকা','শহর','জেলা','বাংলাদেশ',
]);

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeText(text = "") {
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length > 1 && !OVERLAP_STOPWORDS.has(w));
}

function wordOverlapSimilarity(text1, text2) {
  const words1 = tokenizeText(text1);
  const words2 = tokenizeText(text2);
  const bigrams = (arr) => arr.slice(0, -1).map((word, i) => `${word}_${arr[i + 1]}`);

  const tokens1 = new Set([...words1, ...bigrams(words1)]);
  const tokens2 = new Set([...words2, ...bigrams(words2)]);
  const intersection = [...tokens1].filter((token) => tokens2.has(token)).length;
  const union = new Set([...tokens1, ...tokens2]).size;

  return union === 0 ? 0 : intersection / union;
}

async function callHFSimilarity(text1, text2) {
  const response = await fetch(HF_SIMILARITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {
        source_sentence: text1.slice(0, 512),
        sentences: [text2.slice(0, 512)],
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HF Similarity API ${response.status}: ${err}`);
  }

  const result = await response.json();
  return Array.isArray(result) ? result[0] : result;
}

async function computeSimilarity(text1, text2) {
  if (HF_API_KEY && HF_API_KEY !== "your_huggingface_api_key_here") {
    try {
      const score = await callHFSimilarity(text1, text2);
      return { score, method: "semantic" };
    } catch (err) {
      console.warn(
        "[SpamDetection] HF similarity failed, using word-overlap fallback:",
        err.message,
      );
    }
  }
  return { score: wordOverlapSimilarity(text1, text2), method: 'keyword' };
}

function buildComplaintText(title = '', description = '') {
  return `${title} ${description}`.trim();
}

function isSameCategory(newCategory, existingCategory) {
  const normalizedNew = normalizeDepartmentKey(newCategory);
  const normalizedExisting = normalizeDepartmentKey(existingCategory);
  if (!normalizedNew || !normalizedExisting) return true;
  return normalizedNew === normalizedExisting;
}

function isSameArea({
  newLatitude,
  newLongitude,
  existingLatitude,
  existingLongitude,
  newLocation,
  existingLocation,
  radiusKm = DUPLICATE_RADIUS_KM,
}) {
  const hasNewCoords = newLatitude != null && newLongitude != null;
  const hasExistingCoords =
    existingLatitude != null && existingLongitude != null;

  if (hasNewCoords && hasExistingCoords) {
    return (
      haversineDistance(newLatitude, newLongitude, existingLatitude, existingLongitude) <=
      RADIUS_KM
    );
  }

  const normalizedNewLocation = normalizeText(newLocation);
  const normalizedExistingLocation = normalizeText(existingLocation);

  if (!normalizedNewLocation || !normalizedExistingLocation) {
    return false;
  }

  const newTokens = tokenizeText(normalizedNewLocation);
  const existingTokens = tokenizeText(normalizedExistingLocation);
  const hasSpecificEnoughLocation = (tokens, text) => tokens.length >= 3 || text.length >= 18;

  if (
    hasSpecificEnoughLocation(newTokens, normalizedNewLocation) &&
    hasSpecificEnoughLocation(existingTokens, normalizedExistingLocation) &&
    (
      normalizedNewLocation.includes(normalizedExistingLocation) ||
      normalizedExistingLocation.includes(normalizedNewLocation)
    )
  ) {
    return true;
  }

  return (
    haversineDistance(
      newLatitude,
      newLongitude,
      existingLatitude,
      existingLongitude,
    ) <= 1.0 // Changed RADIUS_KM to 1km
  );
}

async function findSimilarComplaints({
  title,
  description,
  latitude,
  longitude,
  location,
  category,
  userId,
  onlyUser = false,
  openOnly = true,
  createdAfter = null,
  statusExclusions = null,
  limit = 4,
  minSimilarity = SIMILAR_COMPLAINT_THRESHOLD,
  areaRadiusKm = SIMILAR_COMPLAINT_RADIUS_KM,
  requireTextSimilarity = true,
}) {
  const normalizedCategory = normalizeDepartmentKey(category);
  const combinedText = buildComplaintText(title, description);
  const hasText = combinedText.length > 0;
  const hasArea =
    (latitude != null && longitude != null) || Boolean((location || '').trim());

  if (!normalizedCategory || !hasArea || (requireTextSimilarity && !hasText)) {
    return [];
  }

  const query = {};
  if (onlyUser && userId) {
    query.user = userId;
  }
  query.category = { $in: getDepartmentComplaintValues(normalizedCategory) };
  if (createdAfter) {
    query.createdAt = { $gte: createdAfter };
  }
  if (openOnly) {
    query.status = { $nin: ['resolved', 'rejected'] };
  } else if (Array.isArray(statusExclusions) && statusExclusions.length > 0) {
    query.status = { $nin: statusExclusions };
  }
  if (latitude != null && longitude != null && !location) {
    const delta = areaRadiusKm / 111;
    query.latitude = { $gte: latitude - delta, $lte: latitude + delta };
    query.longitude = { $gte: longitude - delta, $lte: longitude + delta };
  }

  const complaints = await Complaint.find(query).select(
    'title description latitude longitude location category ticketId _id voteCount createdAt status user votes priority',
  );

  const candidates = complaints.filter((candidate) => {
    if (!isSameCategory(normalizedCategory, candidate.category)) {
      return false;
    }

    return isSameArea({
      newLatitude: latitude,
      newLongitude: longitude,
      existingLatitude: candidate.latitude,
      existingLongitude: candidate.longitude,
      newLocation: location,
      existingLocation: candidate.location,
      radiusKm: areaRadiusKm,
    });
  });

  if (candidates.length === 0) {
    return [];
  }

  if (!requireTextSimilarity) {
    return candidates
      .sort((a, b) => {
        if ((b.voteCount || 0) !== (a.voteCount || 0)) {
          return (b.voteCount || 0) - (a.voteCount || 0);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .slice(0, limit)
      .map((complaint) => ({
        ...complaint.toObject(),
        similarity: null,
        matchMethod: 'location-department',
      }));
  }

  const matches = [];
  for (const candidate of candidates) {
    const candidateText = buildComplaintText(candidate.title, candidate.description);
    const { score, method } = await computeSimilarity(combinedText, candidateText);

    if (score >= minSimilarity) {
      matches.push({
        complaint: candidate,
        similarity: Math.round(score * 100) / 100,
        matchMethod: method,
      });
    }
  }

  return matches
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      if ((b.complaint.voteCount || 0) !== (a.complaint.voteCount || 0)) {
        return (b.complaint.voteCount || 0) - (a.complaint.voteCount || 0);
      }
      return new Date(b.complaint.createdAt) - new Date(a.complaint.createdAt);
    })
    .slice(0, limit)
    .map(({ complaint, similarity, matchMethod }) => ({
      ...complaint.toObject(),
      similarity,
      matchMethod,
    }));
}

async function analyzePrankPotential(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  // 1. Local Rule-Based Scorer (Always works, even without internet/keys)
  const prankPatterns = [
    { words: ['alien', 'ufo', 'space', 'mars', 'galaxy'], score: 0.95 },
    { words: ['ghost', 'zombie', 'vampire', 'magic', 'supernatural', 'monster'], score: 0.9 },
    { words: ['superman', 'batman', 'spiderman', 'avengers', 'marvel', 'superhero'], score: 0.95 },
    { words: ['biryani', 'pizza', 'burger', 'delicious', 'tasty', 'eating'], score: 0.4 }, 
    { words: ['cow', 'goat', 'animal', 'talking'], score: 0.3 },
    { words: ['killed me', 'i am dead', 'ghost of me', 'dying in'], score: 0.95 },
    { words: ['prank', 'joke', 'just kidding', 'test', 'fake'], score: 0.9 },
  ];

  let localScore = 0;
  // Dynamic combined checks for specific cases like "cow eating man"
  if (text.includes('cow') && text.includes('eating')) localScore = 0.9;
  if (text.includes('flying') && text.includes('man')) localScore = 0.85;

  prankPatterns.forEach((pattern) => {
    if (pattern.words.some((word) => text.includes(word))) {
      localScore = Math.max(localScore, pattern.score);
    }
  });

  if (localScore >= 0.85) {
    console.log(
      `[AI Prank Check] Local Rules detected prank (${localScore}): "${title}"`,
    );
    return { is_prank: true, confidence_score: localScore };
  }

  const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
  if (HF_TOKEN && HF_TOKEN !== "your_huggingface_api_key_here") {
    try {
      console.log(`[AI Prank Check] Attempting HF Analysis: "${title}"`);

      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
        {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: `${title}: ${description}`,
            parameters: {
              candidate_labels: ["serious civic complaint", "prank or joke", "nonsense"],
              wait_for_model: true
            }
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        const prankIdx = result.labels.indexOf("prank or joke");
        const nonsenseIdx = result.labels.indexOf("nonsense");
        const aiScore = Math.max(result.scores[prankIdx], result.scores[nonsenseIdx]);

        console.log(
          `[AI Prank Check] HF Success: PrankScore=${aiScore.toFixed(2)} for "${title}"`,
        );
        return {
          is_prank: aiScore > 0.7,
          confidence_score: aiScore
        };
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           const errData = await response.json();
           console.warn(`[AI Prank Check] HF API Error: ${errData.error || response.statusText}`);
        } else {
           console.warn(`[AI Prank Check] HF API returned non-JSON response: ${response.status}`);
        }
      }
    } catch (err) {
      console.warn(`[AI Prank Check] HF Connection failed: ${err.message}`);
    }
  }

  return {
    is_prank: localScore > 0.6,
    confidence_score: localScore,
  };
}

async function checkForDuplicates(
  title,
  description,
  latitude,
  longitude,
  location,
  userId,
  category,
) {
  // ✓ NEW: Return early if category/department is not selected
  if (!category || category === "Select a department") {
    return { isSpam: false }; // No similar complaints until department is picked
  }

  // ✓ NEW: Return early if location coordinates are missing
  if (latitude == null || longitude == null) {
    return { isSpam: false }; // No similar complaints until GPS location is set
  }

  const since = new Date(Date.now() - TIME_WINDOW_MS);

  const recentComplaints = await Complaint.find({
    user: userId,
    createdAt: { $gte: since },
    'spamCheck.isDuplicate': { $ne: true },
    status: { $ne: 'rejected' },
  }).select('title description latitude longitude location category ticketId _id');

  const candidates = recentComplaints.filter((candidate) => {
    if (!isSameCategory(category, candidate.category)) {
      return false;
    }

    return isSameArea({
      newLatitude: latitude,
      newLongitude: longitude,
      existingLatitude: candidate.latitude,
      existingLongitude: candidate.longitude,
      newLocation: location,
      existingLocation: candidate.location,
    });
  });

  if (candidates.length === 0) return { isSpam: false };

  const newText = `${title} ${description}`;

  for (const candidate of candidates) {
    const candidateText = `${candidate.title} ${candidate.description}`;
    const { score, method } = await computeSimilarity(newText, candidateText);

    if (score >= SIMILARITY_THRESHOLD) {
      console.log(
        `[SpamDetection] Duplicate detected — similarity: ${(score * 100).toFixed(1)}% ` +
        `(${method}) vs ticket ${candidate.ticketId}`
      );
      return {
        isSpam: true,
        originalTicketId: candidate.ticketId,
        originalId: candidate._id.toString(),
        similarity: Math.round(score * 100) / 100,
        method,
      };
    }
  }

  return { isSpam: false };
}

module.exports = { checkForDuplicates, haversineDistance, analyzePrankPotential };
