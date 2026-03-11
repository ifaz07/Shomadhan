

const Complaint = require('../models/Complaint.model');

// HF Sentence Similarity pipeline — accepts { source_sentence, sentences[] }
// and returns an array of similarity scores directly (no cosine math needed).
const HF_SIMILARITY_URL =
  'https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const RADIUS_KM = 0.5;             // 500-metre proximity radius
const SIMILARITY_THRESHOLD = 0.65; // 65% similarity → duplicate
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Haversine distance between two coordinates (in km).
 */
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

// Minimal stopwords for overlap fallback — keeps civic/location words unlike the NLP list
const OVERLAP_STOPWORDS = new Set([
  'the','a','an','is','it','in','on','at','to','of','and','or','but','for',
  'with','this','that','there','are','was','were','has','have','had','been',
  'be','by','from','as','not','no','so','if','we','i','my','our','your',
  'he','she','they','their','its','do','did','will','would','can','could',
  'should','may','might','am','also','very','just','more','some','any','all',
]);

/**
 * Word-level overlap similarity — keeps important civic words like "road", "pothole".
 * Uses unigrams + bigrams for better matching of paraphrased text.
 */
function wordOverlapSimilarity(text1, text2) {
  const tokenize = (t) =>
    t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(
      (w) => w.length > 2 && !OVERLAP_STOPWORDS.has(w)
    );

  const words1 = tokenize(text1);
  const words2 = tokenize(text2);

  // Build bigrams
  const bigrams = (arr) => arr.slice(0, -1).map((w, i) => `${w}_${arr[i + 1]}`);

  const tokens1 = new Set([...words1, ...bigrams(words1)]);
  const tokens2 = new Set([...words2, ...bigrams(words2)]);

  const intersection = [...tokens1].filter((t) => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── HF Sentence Similarity API ───────────────────────────────────────────────

/**
 * Call HF Sentence Similarity pipeline.
 * Correct input format: { inputs: { source_sentence, sentences: [candidate] } }
 * Returns a similarity score 0–1.
 */
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
  // Returns [score] array — one score per candidate sentence
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Compute text similarity. Tries HF semantic API first, falls back to word overlap.
 * Returns { score: number, method: 'semantic'|'keyword' }
 */
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
 *    that are within RADIUS_KM.
 *  - Returns the first match whose similarity exceeds SIMILARITY_THRESHOLD.
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
  // Requires both coordinates AND a known user (anonymous complaints are exempt)
  if (latitude == null || longitude == null || !userId) {
    return { isSpam: false };
  }

  const since = new Date(Date.now() - TIME_WINDOW_MS);

  // Only look at THIS user's recent complaints that have location data
  const recentComplaints = await Complaint.find({
    user: userId,
    createdAt: { $gte: since },
    latitude:  { $exists: true, $ne: null },
    longitude: { $exists: true, $ne: null },
    'spamCheck.isDuplicate': { $ne: true },
  }).select('title description latitude longitude ticketId _id');

  // Filter to those within the proximity radius (CPU-side; avoids geospatial index requirement)
  const nearby = recentComplaints.filter(
    (c) => haversineDistance(latitude, longitude, c.latitude, c.longitude) <= RADIUS_KM
  );

  if (nearby.length === 0) return { isSpam: false };

  const newText = `${title} ${description}`;

  for (const candidate of nearby) {
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

module.exports = { checkForDuplicates };
