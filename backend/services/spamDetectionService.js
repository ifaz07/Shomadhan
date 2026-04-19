

const Complaint = require('../models/Complaint.model');


const HF_SIMILARITY_URL =
  'https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const RADIUS_KM = 0.5;             
const SIMILARITY_THRESHOLD = 0.65; 
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
]);


function wordOverlapSimilarity(text1, text2) {
  const tokenize = (t) =>
    t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(
      (w) => w.length > 2 && !OVERLAP_STOPWORDS.has(w)
    );

  const words1 = tokenize(text1);
  const words2 = tokenize(text2);

  const bigrams = (arr) => arr.slice(0, -1).map((w, i) => `${w}_${arr[i + 1]}`);

  const tokens1 = new Set([...words1, ...bigrams(words1)]);
  const tokens2 = new Set([...words2, ...bigrams(words2)]);

  const intersection = [...tokens1].filter((t) => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}


async function callHFSimilarity(text1, text2) {
  const response = await fetch(HF_SIMILARITY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
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
  if (HF_API_KEY && HF_API_KEY !== 'your_huggingface_api_key_here') {
    try {
      const score = await callHFSimilarity(text1, text2);
      return { score, method: 'semantic' };
    } catch (err) {
      console.warn('[SpamDetection] HF similarity failed, using word-overlap fallback:', err.message);
    }
  }
  return { score: wordOverlapSimilarity(text1, text2), method: 'keyword' };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Check if a new complaint is a duplicate/spam.
 *
 * Rules:
 *  - Requires both latitude AND longitude to perform location-based check.
 *  - Compares against all non-spam complaints submitted in the last 24 hours
 *    that are within RADIUS_K  M.
 *   - Uses semantic similarity (via Hugging Face) if API key is configured, otherwise falls back to keyword overlap.
 *
 * @param {string}      title
 * @param {string}      description
 * @param {number|null} latitude
 * @param {number|null} longitude
 * @param {string}      userId - the submitting user's ID (spam check is per-user)
 * @returns {Promise<{
 *   isSpam: boolean,
 *   originalTicketId?: string,
 *   originalId?: string,
 *   similarity?: number,
 *   method?: 'semantic'|'keyword',
 * }>}
 */
async function checkForDuplicates(title, description, latitude, longitude, userId) {
  if (!userId) return { isSpam: false };

  const since = new Date(Date.now() - TIME_WINDOW_MS);
  const hasLocation = latitude != null && longitude != null;

  const recentComplaints = await Complaint.find({
    user: userId,
    createdAt: { $gte: since },
    'spamCheck.isDuplicate': { $ne: true },
  }).select('title description latitude longitude ticketId _id');

  // If both complaints have coordinates, filter by proximity.
  // If either is missing coordinates, skip location filter and check text only.
  const candidates = hasLocation
    ? recentComplaints.filter(
        (c) =>
          c.latitude != null && c.longitude != null
            ? haversineDistance(latitude, longitude, c.latitude, c.longitude) <= RADIUS_KM
            : true  
      )
    : recentComplaints;

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

module.exports = { checkForDuplicates, haversineDistance };
