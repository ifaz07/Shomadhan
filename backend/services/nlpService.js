/**
 * NLP Service: Classifies civic complaints using Claude API (primary)
 * with a keyword-based fallback for when the API is unavailable.
 */

const Anthropic = require('@anthropic-ai/sdk');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Valid category values used by the app
const VALID_CATEGORIES = ['Road', 'Waste', 'Electricity', 'Water', 'Safety', 'Environment', 'Other'];

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

// Common stopwords to exclude from keyword extraction
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

/**
 * Extract meaningful keywords from text.
 */
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
 * Supports English + Bengali transliterated + Bengali Unicode keywords.
 */
function ruleBasedClassify(text) {
  const lower = text.toLowerCase();
  const original = text;

  const rules = [
    {
      category: 'Road',
      keywords: [
        'road','pothole','pavement','sidewalk','bridge','crack','construction','traffic',
        'signal','street light','streetlight','drain','culvert','asphalt','highway',
        'rasta','sarak','sadak','nirmaan','meremet','repair','jaam',
      ],
    },
    {
      category: 'Waste',
      keywords: [
        'garbage','waste','trash','litter','dump','rubbish','bin','collection','sewage',
        'smell','odor','filth','dirty','unclean','sanitation','sweeping',
        'aborzona','aborjona','mayola','porikar','ময়লা','ভাগাড়','দুর্গন্ধ','নোংরা',
      ],
    },
    {
      category: 'Electricity',
      keywords: [
        'electricity','power','outage','blackout','wire','pole','transformer','voltage',
        'wiring','light','lamp','electric','current','load shedding','loadshedding',
        'bidyut','biddut','বিদ্যুৎ','বিদ্যুত','কারেন্ট',
      ],
    },
    {
      category: 'Water',
      keywords: [
        'water','pipe','leak','flood','drainage','pump','supply','tap','overflow',
        'sewage','waterlogged','drinking water',
        'pani','jol','bonna','jalabaddata','পানি','জল','পানির লাইন','ড্রেনেজ',
      ],
    },
    {
      category: 'Safety',
      keywords: [
        'crime','theft','robbery','harassment','fight','danger','unsafe','accident',
        'violence','drug','illegal','noise','eve teasing','mugging','assault',
        'churi','dakati','durghatona','নিরাপত্তা','ডাকাতি','চুরি','হয়রানি',
      ],
    },
    {
      category: 'Environment',
      keywords: [
        'pollution','smoke','dust','air','tree','park','green','chemical','toxic',
        'environment','contamination','burn','noise pollution','air pollution',
        'dushon','poribesh','দূষণ','বায়ু দূষণ','পরিবেশ',
      ],
    },
  ];

  let best = null;
  let bestScore = 0;

  for (const rule of rules) {
    const score = rule.keywords.filter(kw => lower.includes(kw) || original.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }

  const category = best || 'Other';
  const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.1, 0.85) : 0.3;

  return { category, confidence, source: 'rule-based' };
}

/**
 * Classify complaint using Claude API.
 * Supports Bengali, English, and mixed text.
 */
async function classifyWithClaude(text) {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    system: `You are a civic complaint classifier. Classify the complaint into exactly one of these categories:
Road, Waste, Electricity, Water, Safety, Environment, Other

Rules:
- Road: road damage, potholes, traffic signals, street lights, bridges, construction
- Waste: garbage, trash, sewage smell, waste collection, dumping
- Electricity: power outage, electric wire issues, transformer, load shedding
- Water: water supply, pipe leak, flooding, drainage, waterlogging
- Safety: crime, theft, harassment, accident, violence, dangerous situation
- Environment: air/water pollution, illegal burning, toxic waste, tree cutting
- Other: anything that doesn't fit above

Respond with ONLY a JSON object: {"category": "<Category>", "confidence": <0.0-1.0>}
The text may be in Bengali, English, or mixed.`,
    messages: [
      { role: 'user', content: text.slice(0, 1500) },
    ],
  });

  const raw = response.content[0].text.trim();
  const parsed = JSON.parse(raw);

  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other';
  const confidence = typeof parsed.confidence === 'number'
    ? Math.min(Math.max(parsed.confidence, 0), 1)
    : 0.7;

  return { category, confidence, source: 'claude' };
}

/**
 * Main classification function.
 * Uses Claude API if key is set, falls back to rule-based.
 */
async function classifyComplaint(title, description) {
  const text = `${title}. ${description}`;
  const keywords = extractKeywords(text);

  let classificationResult;

  if (ANTHROPIC_API_KEY) {
    try {
      classificationResult = await classifyWithClaude(text);
    } catch (err) {
      console.warn('[NLP] Claude API failed, using rule-based fallback:', err.message);
      classificationResult = ruleBasedClassify(text);
    }
  } else {
    console.warn('[NLP] ANTHROPIC_API_KEY not set, using rule-based fallback');
    classificationResult = ruleBasedClassify(text);
  }

  const { category, confidence, source } = classificationResult;
  const department = CATEGORY_TO_DEPARTMENT[category] || CATEGORY_TO_DEPARTMENT.Other;

  return {
    category,
    department,
    keywords,
    confidence: Math.round(confidence * 100) / 100,
    source,
  };
}

module.exports = { classifyComplaint };
