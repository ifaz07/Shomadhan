const Complaint = require("../models/Complaint.model");
const {
  normalizeDepartmentKey,
  getDepartmentComplaintValues,
} = require("../utils/departmentTaxonomy");

const HF_SIMILARITY_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const DUPLICATE_RADIUS_KM = 0.7;
const SIMILARITY_THRESHOLD = 0.6;
const SIMILAR_COMPLAINT_THRESHOLD = 0.6;
const SIMILAR_COMPLAINT_RADIUS_KM = 0.7;
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
  "the","a","an","is","it","in","on","at","to","of","and","or","but","for",
  "with","this","that","there","are","was","were","has","have","had","been",
  "be","by","from","as","not","no","so","if","we","i","my","our","your",
  "he","she","they","their","its","do","did","will","would","can","could",
  "should","may","might","am","also","very","just","more","some","any","all",
  "road","area","city","district","bangladesh",
]);

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(text = "") {
  return normalizeText(text)
    .split(" ")
    .filter((w) => w.length > 1 && !OVERLAP_STOPWORDS.has(w));
}

function charNGrams(text = "", size = 3) {
  const compact = normalizeText(text).replace(/\s+/g, "");
  if (compact.length < size) {
    return compact ? [compact] : [];
  }

  const grams = [];
  for (let i = 0; i <= compact.length - size; i += 1) {
    grams.push(compact.slice(i, i + size));
  }
  return grams;
}

function jaccardSimilarity(tokens1 = [], tokens2 = []) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = [...set1].filter((token) => set2.has(token)).length;
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

function wordOverlapSimilarity(text1, text2) {
  const words1 = tokenizeText(text1);
  const words2 = tokenizeText(text2);
  const bigrams = (arr) => arr.slice(0, -1).map((word, i) => `${word}_${arr[i + 1]}`);

  const lexicalScore = jaccardSimilarity(
    [...words1, ...bigrams(words1)],
    [...words2, ...bigrams(words2)],
  );
  const charScore = jaccardSimilarity(charNGrams(text1), charNGrams(text2));

  return Math.max(lexicalScore, charScore * 0.9);
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

  return { score: wordOverlapSimilarity(text1, text2), method: "keyword" };
}

function buildComplaintText(title = "", description = "") {
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
  const hasExistingCoords = existingLatitude != null && existingLongitude != null;

  if (hasNewCoords && hasExistingCoords) {
    return (
      haversineDistance(newLatitude, newLongitude, existingLatitude, existingLongitude) <=
      radiusKm
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

  return false;
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
    (latitude != null && longitude != null) || Boolean((location || "").trim());

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
    query.status = { $nin: ["resolved", "rejected"] };
  } else if (Array.isArray(statusExclusions) && statusExclusions.length > 0) {
    query.status = { $nin: statusExclusions };
  }
  if (latitude != null && longitude != null && !location) {
    const delta = areaRadiusKm / 111;
    query.latitude = { $gte: latitude - delta, $lte: latitude + delta };
    query.longitude = { $gte: longitude - delta, $lte: longitude + delta };
  }

  const complaints = await Complaint.find(query).select(
    "title description latitude longitude location category ticketId _id voteCount createdAt status user votes priority",
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
        matchMethod: "location-department",
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

/**
 * Detects gibberish / random keysmashing text.
 * Handles English, Bangla script, and Banglish (Bangla written in Latin).
 */
function isGibberish(text) {
  const hasBanglaScript = /[\u0980-\u09FF]/.test(text);

  // ── Bangla Script gibberish detection ────────────────────────────────────
  // In real Bangla, each syllable has a vowel matra or independent vowel.
  // Pure consonant smashing (e.g. কখগঘঙ with no matras) is gibberish.
  if (hasBanglaScript) {
    const banglaChars = text.replace(/[^\u0980-\u09FF]/g, "");
    if (banglaChars.length >= 6) {
      const independentVowels = (banglaChars.match(/[\u0985-\u0994]/g) || []).length; // অ-ঔ
      const matras = (banglaChars.match(/[\u09BE-\u09CC]/g) || []).length;            // া-ৌ
      const consonants = (banglaChars.match(/[\u0995-\u09B9]/g) || []).length;        // ক-হ
      const totalVowels = independentVowels + matras;
      const totalMeaningful = totalVowels + consonants;
      if (totalMeaningful > 0) {
        const banglaVowelRatio = totalVowels / totalMeaningful;
        // Real Bangla: vowel indicators ~20-50% of meaningful chars
        // Consonant keysmash: near 0%
        if (banglaVowelRatio < 0.08) return true;
      }
    }
  }

  // ── Latin (English / Banglish) gibberish detection ───────────────────────
  const latinOnly = text.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (latinOnly.length < 5) return false;

  const letters = latinOnly.replace(/\s+/g, "");
  if (letters.length < 4) return false;

  const vowelCount = (letters.match(/[aeiou]/g) || []).length;
  const vowelRatio = vowelCount / letters.length;

  const words = latinOnly.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return false;
  const noVowelWords = words.filter((w) => w.length > 2 && !/[aeiou]/.test(w));
  const noVowelRatio = noVowelWords.length / words.length;

  const maxConsonantCluster = words.reduce((max, w) => {
    const clusters = w.match(/[^aeiou]+/g) || [];
    const longest = Math.max(0, ...clusters.map((c) => c.length));
    return Math.max(max, longest);
  }, 0);

  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;

  // For Banglish text (mix of Bangla meaning + Latin letters),
  // be slightly more lenient since transliterations can be vowel-sparse
  const isLikelyBanglish = hasBanglaScript && latinOnly.length > 0;
  const vowelThreshold = isLikelyBanglish ? 0.08 : 0.12;
  const clusterThreshold = isLikelyBanglish ? 6 : 5;

  return (
    vowelRatio < vowelThreshold ||
    noVowelRatio > 0.6 ||
    maxConsonantCluster > clusterThreshold ||
    (avgWordLen > 8 && vowelRatio < 0.2)
  );
}

async function analyzePrankPotential(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const normalizedText = normalizeText(text);
  const tokens = tokenizeText(text);
  const titleText = normalizeText(title);
  const descriptionText = normalizeText(description);

  // ── Early exit: gibberish / random keysmashing ──────────────────────────
  if (isGibberish(`${title} ${description}`)) {
    console.log(`[AI Prank Check] Gibberish detected: "${title}"`);
    return { is_prank: true, confidence_score: 0.96 };
  }

  const prankPatterns = [
    // ── English ──
    { words: ["alien", "ufo", "space", "mars", "galaxy"], score: 0.95 },
    { words: ["ghost", "zombie", "vampire", "magic", "supernatural", "monster"], score: 0.9 },
    { words: ["superman", "batman", "spiderman", "avengers", "marvel", "superhero"], score: 0.95 },
    { words: ["biryani", "pizza", "burger", "delicious", "tasty", "eating"], score: 0.4 },
    { words: ["cow", "goat", "animal", "talking"], score: 0.3 },
    { words: ["killed me", "i am dead", "ghost of me", "dying in"], score: 0.95 },
    { words: ["prank", "joke", "just kidding", "test", "fake"], score: 0.9 },
    { words: ["dragon", "dinosaur", "mermaid", "wizard", "fairy", "time travel"], score: 0.95 },
    { words: ["flying car", "teleport", "invisible", "laser eyes", "flying man"], score: 0.95 },
    { words: ["haha", "hahaha", "lol", "lmao", "brooo", "funny"], score: 0.75 },
    { words: ["chicken fight", "dog fight", "cat fight", "animal fight", "fight between"], score: 0.75 },
    { words: ["chicken vs", "dog vs", "cat vs", "monkey vs", "animal vs"], score: 0.72 },
    { words: ["talking dog", "talking cat", "talking cow", "talking chicken", "talking animal"], score: 0.9 },
    { words: ["unicorn", "phoenix", "werewolf", "demon"], score: 0.95 },
    { words: ["i am bored", "nothing to do", "just testing", "random complaint"], score: 0.88 },
    { words: ["abc", "xyz", "abcd", "qwerty", "asdf"], score: 0.9 },
    { words: ["blah blah", "yada yada", "whatever", "idk", "idc"], score: 0.8 },
    // ── Bangla Script supernatural/absurd words ──
    { words: ["ভূত", "জিন", "পরী", "ডাইনি", "শয়তান", "অলৌকিক"], score: 0.9 },
    { words: ["যাদু", "জাদু", "জাদুকর", "ভেল্কি", "তান্ত্রিক"], score: 0.88 },
    { words: ["ড্রাগন", "ডাইনোসর", "ইউনিকর্ন", "দানব", "রাক্ষস", "পিশাচ"], score: 0.95 },
    { words: ["উড়ন্ত মানুষ", "অদৃশ্য", "টেলিপোর্ট"], score: 0.95 },
    { words: ["হাহাহা", "হিহিহি", "লোল", "ফানি", "মজার", "ইয়ার্কি", "ধাপ্পা"], score: 0.75 },
    { words: ["পরীক্ষামূলক", "টেস্ট অভিযোগ", "নকল অভিযোগ", "মিথ্যা অভিযোগ"], score: 0.9 },
    // Bangla transformation phrases ("became a dog", "turned into ghost")
    { words: ["কুকুর হয়ে গেছে", "বিড়াল হয়ে গেছে", "ভূত হয়ে গেছে", "পশু হয়ে গেছে"], score: 0.95 },
    { words: ["কুকুর হয়ে গেল", "বিড়াল হয়ে গেল", "ভূত হয়ে গেল", "জানোয়ার হয়ে গেল"], score: 0.95 },
    { words: ["মানুষ কুকুর", "মানুষ ভূত", "মানুষ পশু", "মানুষ জানোয়ার"], score: 0.88 },
    // ── Banglish (Bangla meaning written in Latin) ──
    { words: ["bhut", "bhuut", "bhoot", "bhoote", "jin", "jinn"], score: 0.88 },
    { words: ["jadu", "jaadu", "jadugori", "daini", "pori", "rakkhosh", "danob"], score: 0.88 },
    { words: ["kukur hoye", "kukur hoyeche", "kukur holo", "biral hoye", "pashu hoye"], score: 0.95 },
    { words: ["manush kukur", "manush biral", "manush bhut", "manush pashu"], score: 0.92 },
    { words: ["hoyeche kukur", "hoyeche bhut", "hoye gelo", "hoye geche"], score: 0.85 },
    { words: ["uronto manush", "udonte manush", "adrisho manush", "teleport korlo"], score: 0.93 },
    { words: ["hahaha", "hihi", "hehe", "lol re", "kire bhai test"], score: 0.75 },
  ];

  const ANIMALS = [
    "dog","cat","cow","goat","fish","bird","frog","snake","lion","tiger","wolf",
    "bear","monkey","horse","sheep","pig","chicken","duck","rabbit","elephant",
    "crocodile","dinosaur","dragon","unicorn","phoenix","werewolf","demon",
  ];

  const SURREAL_REGEXES = [
    // English: "a man became a dog", "she transformed into a wolf"
    /\b(became?|become|turned?\s+into|transform(?:ed)?\s+into|converted?\s+into|changed?\s+into|morphed?\s+into|shapeshifted?\s+into)\s+(a\s+|an\s+)?(\w+)/i,
    // English: "dog talked", "cat spoke"
    /\b(dog|cat|cow|goat|fish|bird|frog|snake|lion|tiger|wolf|monkey|chicken|duck|elephant)\s+(talk(?:ed|ing)?|spoke|speak(?:ing)?|walk(?:ed|ing)?\s+on|said|cried|scream(?:ed|ing)?|fight(?:ing)?|fought)/i,
    // English: "people are flying/invisible"
    /\bpeople\s+(are\s+)?(flying|floating|disappear(?:ing)?|vanish(?:ing)?|teleport(?:ing)?|invisible|invincible)\b/i,
    // English: "the road is alive/talking"
    /\b(road|street|sky|wall|building|house|drain|bridge)\s+(is\s+)?(alive|talk(?:ing)?|walk(?:ing)?|scream(?:ing)?|moving\s+on\s+its\s+own|fly(?:ing)?)\b/i,
    // English: "man is now a dog", "neighbor has become a ghost"
    /\b(man|woman|person|human|boy|girl|child|neighbor|uncle|aunt|bhai|apu)\b.{0,50}?\b(is\s+now|has\s+become|has\s+turned\s+into)\b.{0,30}?\b(dog|cat|cow|ghost|alien|zombie|vampire|wolf|beast|animal|monster|demon|witch|robot|fish|bird)\b/i,
    // Banglish: "ekjon manush kukur hoye gelo", "se biral hoye geche"
    /\b(manush|lok|manus|bachcha|meye|chele|poros|mahila)\b.{0,40}?\b(kukur|biral|pashu|bhut|bhuut|jin|jinn|rakkhosh|danob)\b/i,
    /\b(kukur|biral|pashu|bhut|bhuut|jin)\b.{0,30}?\b(hoye|hoyeche|holo|hoye\s+gelo|hoye\s+geche|hoye\s+jay)\b/i,
    // Bangla script: "মানুষ কুকুর হয়ে গেছে" / "[person] [animal] hoye geche"
    /[\u09AE\u09BE\u09A8\u09C1\u09B7].{0,30}?[\u0995\u09C1\u0995\u09C1\u09B0\u09AC\u09BF\u09DC\u09BE\u09B2]/,
    // Bangla script transformation: হয়ে গেছে / হয়ে গেল after animal noun
    /[\u0995\u09C1\u0995\u09C1\u09B0\u09AD\u09C2\u09A4\u09AA\u09B6\u09C1].{0,20}?\u09B9\u09AF\u09BC\u09C7/,
  ];

  let localScore = 0;

  // ── Regex-based structural absurdity detection ─────────────────────────────
  for (const regex of SURREAL_REGEXES) {
    const match = regex.exec(text);
    if (match) {
      // For transform regex: check if the target noun is an animal/impossible thing
      if (regex.source.includes("became?|become")) {
        const targetWord = match[3];
        if (ANIMALS.includes(targetWord)) {
          localScore = Math.max(localScore, 0.95);
        } else {
          localScore = Math.max(localScore, 0.75);
        }
      } else {
        localScore = Math.max(localScore, 0.92);
      }
      break;
    }
  }

  // Legacy specific combos
  if (text.includes("cow") && text.includes("eating")) localScore = Math.max(localScore, 0.9);
  if (text.includes("flying") && text.includes("man")) localScore = Math.max(localScore, 0.88);
  if (text.includes("ghost") && text.includes("road")) localScore = Math.max(localScore, 0.92);
  if (text.includes("alien") && text.includes("drain")) localScore = Math.max(localScore, 0.95);
  if (/(.)\1{4,}/.test(text)) localScore = Math.max(localScore, 0.72);
  if (/(ha){3,}|(lol){2,}/i.test(text)) localScore = Math.max(localScore, 0.75);
  if (tokens.length <= 3 && /test|fake|joke|prank/.test(normalizedText)) {
    localScore = Math.max(localScore, 0.95);
  }
  if (titleText && descriptionText && titleText === descriptionText && tokens.length <= 6) {
    localScore = Math.max(localScore, 0.7);
  }
  if (tokens.length <= 4 && !/\d/.test(normalizedText) && /bro|pls|plz|hello|helo|test/.test(normalizedText)) {
    localScore = Math.max(localScore, 0.68);
  }

  prankPatterns.forEach((pattern) => {
    if (pattern.words.some((word) => text.includes(word))) {
      localScore = Math.max(localScore, pattern.score);
    }
  });

  // Only short-circuit to avoid HF call for extremely obvious cases (score >= 0.92)
  // Lower scores (0.6-0.91) still go through HF NLP for a smarter decision
  if (localScore >= 0.92) {
    console.log(
      `[AI Prank Check] Local Rules detected prank (${localScore}): "${title}"`,
    );
    return { is_prank: true, confidence_score: localScore };
  }

  const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
  if (HF_TOKEN && HF_TOKEN !== "your_huggingface_api_key_here") {
    try {
      console.log(`[AI Prank Check] Attempting HF BART Analysis: "${title}"`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // 20-second timeout

      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `${title}: ${description}`,
            parameters: {
              candidate_labels: ["serious civic complaint", "prank or joke", "nonsense"],
              wait_for_model: true,
            },
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

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
          confidence_score: aiScore,
        };
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errData = await response.json();
        console.warn(`[AI Prank Check] HF API Error: ${errData.error || response.statusText}`);
      } else {
        console.warn(`[AI Prank Check] HF API returned non-JSON response: ${response.status}`);
      }
    } catch (err) {
      console.warn(`[AI Prank Check] HF Connection failed: ${err.message}`);
    }
  }

  // HF unavailable — use local score with a lower threshold to still catch borderline absurd content
  return {
    is_prank: localScore > 0.5,
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
  const normalizedCategory = normalizeDepartmentKey(category);
  if (!normalizedCategory) {
    return { isSpam: false };
  }

  if (latitude == null || longitude == null) {
    return { isSpam: false };
  }

  const since = new Date(Date.now() - TIME_WINDOW_MS);

  const recentComplaints = await Complaint.find({
    user: userId,
    createdAt: { $gte: since },
    status: { $ne: "rejected" },
    category: { $in: getDepartmentComplaintValues(normalizedCategory) },
  }).select("title description latitude longitude location category ticketId _id createdAt");

  const candidates = recentComplaints.filter((candidate) => {
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
      radiusKm: DUPLICATE_RADIUS_KM,
    });
  });

  if (candidates.length === 0) {
    return { isSpam: false };
  }

  const newText = buildComplaintText(title, description);

  for (const candidate of candidates) {
    const candidateText = buildComplaintText(candidate.title, candidate.description);
    const { score, method } = await computeSimilarity(newText, candidateText);

    if (score >= SIMILARITY_THRESHOLD) {
      console.log(
        `[SpamDetection] Duplicate detected - similarity: ${(score * 100).toFixed(1)}% ` +
        `(${method}) within ${DUPLICATE_RADIUS_KM}km vs ticket ${candidate.ticketId}`,
      );
      return {
        isSpam: true,
        originalTicketId: candidate.ticketId,
        originalId: candidate._id.toString(),
        similarity: Math.round(score * 100) / 100,
        method,
        distanceRadiusKm: DUPLICATE_RADIUS_KM,
      };
    }
  }

  return { isSpam: false };
}

module.exports = {
  checkForDuplicates,
  haversineDistance,
  analyzePrankPotential,
  findSimilarComplaints,
};
