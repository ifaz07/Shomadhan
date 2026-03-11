
const HF_API_URL = 'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Labels used for zero-shot classification (HF model input)
const CATEGORY_LABELS = [
  'road damage or infrastructure problem',
  'waste management or garbage problem',
  'electricity or power outage issue',
  'water supply or drainage problem',
  'public safety or crime or security issue',
  'environmental pollution or hazard',
  'other civic administrative problem',
];

// Map HF label → app category enum
const LABEL_TO_CATEGORY = {
  'road damage or infrastructure problem': 'Road',
  'waste management or garbage problem': 'Waste',
  'electricity or power outage issue': 'Electricity',
  'water supply or drainage problem': 'Water',
  'public safety or crime or security issue': 'Safety',
  'environmental pollution or hazard': 'Environment',
  'other civic administrative problem': 'Other',
};

// Category → responsible department
const CATEGORY_TO_DEPARTMENT = {
  Road:        { name: 'Public Works',        key: 'public_works' },
  Waste:       { name: 'Sanitation',          key: 'sanitation' },
  Electricity: { name: 'Electricity',         key: 'electricity' },
  Water:       { name: 'Water Authority',     key: 'water_authority' },
  Safety:      { name: 'Public Safety',       key: 'public_safety' },
  Environment: { name: 'Environment',         key: 'environment' },
  Other:       { name: 'General Administration', key: 'other' },
};

// Common English + Bengali-transliterated stopwords to exclude from keywords
const STOPWORDS = new Set([
  'the','a','an','is','it','in','on','at','to','of','and','or','but','for',
  'with','this','that','there','are','was','were','has','have','had','been',
  'be','by','from','as','not','no','so','if','we','i','my','our','your',
  'he','she','they','their','its','do','did','will','would','can','could',
  'should','may','might','am','also','very','just','more','some','any',
  'all','about','into','than','then','when','where','which','who','what',
  'how','please','dear','sir','madam','kindly','request','regarding','issue',
  'problem','complaint','area','place','road','street','near','since','days',
  'weeks','months','already','still','now','here','there','get','got',
]);


function extractKeywords(text, maxKeywords = 8) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));

  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Rule-based fallback classifier using keyword matching.
 * Used when HF API is unavailable or key is not set.
 */
function ruleBasedClassify(text) {
  const lower = text.toLowerCase();

  const rules = [
    { category: 'Road',        keywords: ['road','pothole','pavement','sidewalk','bridge','crack','construction','traffic','signal','street light','streetlight','drain','culvert'] },
    { category: 'Waste',       keywords: ['garbage','waste','trash','litter','dump','rubbish','bin','collection','sewage','smell','odor','smell'] },
    { category: 'Electricity', keywords: ['electricity','power','outage','blackout','wire','pole','transformer','voltage','wiring','light','lamp'] },
    { category: 'Water',       keywords: ['water','pipe','leak','flood','drainage','pump','supply','tap','overflow','sewage','waterlogged'] },
    { category: 'Safety',      keywords: ['crime','theft','robbery','harassment','fight','danger','unsafe','accident','violence','drug','illegal','noise'] },
    { category: 'Environment', keywords: ['pollution','smoke','dust','air','tree','park','green','chemical','toxic','environment','contamination','burn'] },
  ];

  let best = null;
  let bestScore = 0;

  for (const rule of rules) {
    const score = rule.keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }

  const category = best || 'Other';
  const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.1, 0.85) : 0.3;

  // Build top2 from rule scores
  const allScores = rules
    .map(rule => ({ category: rule.category, score: rule.keywords.filter(kw => lower.includes(kw)).length }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const top2 = allScores.slice(0, 2).map(r => ({
    category: r.category,
    confidence: Math.min(0.5 + r.score * 0.1, 0.85),
  }));

  if (top2.length === 0) top2.push({ category: 'Other', confidence: 0.3 });
  if (top2.length === 1) top2.push({ category: 'Other', confidence: 0.3 });

  return { category, confidence, top2, source: 'rule-based' };
}

/**
 * Call Hugging Face zero-shot classification API.
 */
async function callHuggingFaceAPI(text) {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text.slice(0, 1000), // Limit input length
      parameters: {
        candidate_labels: CATEGORY_LABELS,
        multi_label: false,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HF API error ${response.status}: ${err}`);
  }

  const result = await response.json();

  // Response is an array sorted by score descending: [{label, score}, ...]
  const sorted = Array.isArray(result) ? result : result.labels.map((l, i) => ({ label: l, score: result.scores[i] }));
  const top2 = sorted.slice(0, 2).map(item => ({
    category: LABEL_TO_CATEGORY[item.label] || 'Other',
    confidence: item.score,
  }));

  return { category: top2[0].category, confidence: top2[0].confidence, top2, source: 'huggingface' };
}

/**
 * Main classification function.
 * Tries Hugging Face API first, falls back to rule-based.
 *
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {Promise<{category, department, keywords, confidence, source}>}
 */
async function classifyComplaint(title, description) {
  const text = `${title}. ${description}`;
  const keywords = extractKeywords(text);

  let classificationResult;

  if (HF_API_KEY && HF_API_KEY !== 'your_huggingface_api_key_here') {
    try {
      classificationResult = await callHuggingFaceAPI(text);
    } catch (err) {
      console.warn('[NLP] Hugging Face API failed, using rule-based fallback:', err.message);
      classificationResult = ruleBasedClassify(text);
    }
  } else {
    classificationResult = ruleBasedClassify(text);
  }

  const { category, confidence, top2, source } = classificationResult;
  const department = CATEGORY_TO_DEPARTMENT[category] || CATEGORY_TO_DEPARTMENT.Other;

  return {
    category,
    department,
    keywords,
    confidence: Math.round(confidence * 100) / 100,
    source,
    topCategories: top2.map(t => ({
      category: t.category,
      confidence: Math.round(t.confidence * 100) / 100,
      department: CATEGORY_TO_DEPARTMENT[t.category] || CATEGORY_TO_DEPARTMENT.Other,
    })),
  };
}

module.exports = { classifyComplaint, extractKeywords };
