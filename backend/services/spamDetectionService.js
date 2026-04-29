/**
 * Spam Detection Service
 *
 * Flags a new complaint as a duplicate/spam when ALL three conditions are met:
 *  1. A similar complaint was submitted within the last 24 hours
 *  2. The new complaint originates from within RADIUS_KM of that complaint
 *  3. Text similarity (semantic via HF embeddings, or Jaccard keyword fallback)
 *     exceeds SIMILARITY_THRESHOLD
 *
 * API used: HF Inference — sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
 *   (multilingual, handles Bengali-transliterated text too)
 */

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

module.exports = { checkForDuplicates, detectPrankComplaint };

/**
 * AI-Based Prank/Fake Complaint Detection
 * 
 * Uses multiple heuristics to detect potentially fake or prank complaints:
 * 1. Text analysis - checks for suspicious patterns, excessive punctuation, all caps
 * 2. Keyword matching - looks for prank keywords and patterns
 * 3. Length analysis - very short or very long descriptions
 * 4. Sentiment analysis - extreme or inappropriate sentiment
 * 5. Semantic analysis - uses HF model for deeper analysis if available
 * 
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {Promise<{
 *   isPrank: boolean,
 *   confidence: number,
 *   reasons: string[],
 *   modelVersion: string,
 * }>}
 */
async function detectPrankComplaint(title, description) {
  const reasons = [];
  let prankScore = 0;
  const MODEL_VERSION = '1.0.0';
  
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // 1. Check for prank keywords and patterns
  const prankKeywords = [
    'joke', 'prank', 'fake', 'lol', 'haha', 'just kidding', 'not real',
    'testing', 'funny', 'hilarious', 'bomb', 'attack', 'kill', 'die',
    'fake news', 'hoax', 'scam', 'fraud', 'lie', 'stupid', 'idiot',
    'waste of time', 'nonsense', 'rubbish', 'bullshit', 'fuck', 'shit',
    'ass', 'bitch', 'damn', 'hell', 'crap', 'suck', 'dumb', 'loser'
  ];
  
  const foundPrankKeywords = prankKeywords.filter(keyword => 
    combinedText.includes(keyword)
  );
  
  if (foundPrankKeywords.length > 0) {
    const keywordScore = Math.min(foundPrankKeywords.length * 0.15, 0.5);
    prankScore += keywordScore;
    reasons.push(`Suspicious keywords detected: ${foundPrankKeywords.join(', ')}`);
  }
  
  // 2. Check for excessive punctuation or all caps
  const exclamationCount = (title.match(/!/g) || []).length + (description.match(/!/g) || []).length;
  const questionCount = (title.match(/\?/g) || []).length + (description.match(/\?/g) || []).length;
  
  if (exclamationCount > 3) {
    prankScore += 0.2;
    reasons.push('Excessive exclamation marks detected');
  }
  
  if (questionCount > 5) {
    prankScore += 0.15;
    reasons.push('Excessive question marks detected');
  }
  
  // Check for ALL CAPS (more than 50% of words)
  const words = title.split(/\s+/) + description.split(/\s+/);
  const uppercaseWords = words.filter(w => w.length > 2 && w === w.toUpperCase());
  if (uppercaseWords.length / words.length > 0.5) {
    prankScore += 0.25;
    reasons.push('Excessive use of capital letters detected');
  }
  
  // 3. Check text length (very short or very long)
  if (description.length < 10) {
    prankScore += 0.3;
    reasons.push('Description too short (likely not genuine)');
  }
  
  if (description.length > 5000) {
    prankScore += 0.15;
    reasons.push('Description unusually long');
  }
  
  // 4. Check for repeated characters (e.g., "sooooo", "haaaa")
  const repeatedChars = combinedText.match(/(.)\1{3,}/g);
  if (repeatedChars && repeatedChars.length > 2) {
    prankScore += 0.2;
    reasons.push('Excessive repeated characters detected');
  }
  
  // 5. Check for emoji-only or symbol-only content
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = combinedText.match(emojiPattern);
  if (emojis && emojis.length > 5) {
    prankScore += 0.2;
    reasons.push('Excessive emoji usage detected');
  }
  
  // 6. Check for generic/location-less complaints
  const hasLocation = combinedText.includes('road') || 
                     combinedText.includes('street') || 
                     combinedText.includes('area') ||
                     combinedText.includes('location') ||
                     combinedText.includes('address');
  
  if (!hasLocation && description.length < 50) {
    prankScore += 0.15;
    reasons.push('No clear location mentioned in short complaint');
  }
  
  // 7. Try HF semantic analysis if available
  if (HF_API_KEY && HF_API_KEY !== 'your_huggingface_api_key_here') {
    try {
      const semanticScore = await analyzeWithHF(title, description);
      if (semanticScore > 0.7) {
        prankScore += semanticScore * 0.3;
        reasons.push(`AI semantic analysis flagged as suspicious (${Math.round(semanticScore * 100)}%)`);
      }
    } catch (err) {
      console.warn('[PrankDetection] HF analysis failed:', err.message);
    }
  }
  
  // 8. Check for time-based patterns (submitted at unusual hours)
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) {
    // Late night submissions - slightly increase score
    prankScore += 0.05;
    reasons.push('Submitted during unusual hours (late night)');
  }
  
  // Normalize score to 0-1 range
  const normalizedScore = Math.min(prankScore, 1);
  
  // Consider it a prank if confidence is above 0.5
  const isPrank = normalizedScore >= 0.5;
  
  return {
    isPrank,
    confidence: Math.round(normalizedScore * 100) / 100,
    reasons: reasons.length > 0 ? reasons : ['No issues detected'],
    modelVersion: MODEL_VERSION,
  };
}

/**
 * Use HuggingFace model for semantic analysis of prank content
 */
async function analyzeWithHF(title, description) {
  // Use a text classification model for sentiment/toxicity detection
  const HF_CLASSIFY_URL = 'https://router.huggingface.co/hf-inference/models/facebook/roberta-hate-speech-detector';
  
  const response = await fetch(HF_CLASSIFY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: `${title}. ${description}`.slice(0, 512),
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HF Classification API ${response.status}`);
  }
  
  const result = await response.json();
  
  // Extract hate speech probability (higher = more likely to be inappropriate)
  if (Array.isArray(result) && result[0]) {
    const labelScores = result[0];
    // Find the highest score among negative labels
    const negativeLabels = ['hate', 'toxic', 'offensive', 'inappropriate'];
    let maxNegativeScore = 0;
    
    for (const item of labelScores) {
      const label = item.label.toLowerCase();
      if (negativeLabels.some(neg => label.includes(neg))) {
        maxNegativeScore = Math.max(maxNegativeScore, item.score);
      }
    }
    
    return maxNegativeScore;
  }
  
  return 0;
}
