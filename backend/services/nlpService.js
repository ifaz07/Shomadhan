const {
  DEPARTMENT_LABELS,
} = require("../utils/departmentTaxonomy");

const HF_API_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const CATEGORY_LABELS = [
  "public works or infrastructure issue",
  "water authority or drainage issue",
  "electricity or power outage issue",
  "sanitation or garbage or sewage issue",
  "public safety or fire or emergency issue",
  "animal control or stray animal issue",
  "public health or hospital or clinic issue",
  "transport or traffic or parking issue",
  "environmental pollution or hazard issue",
  "police or crime or law enforcement issue",
];

const LABEL_TO_CATEGORY = {
  "public works or infrastructure issue": "public_works",
  "water authority or drainage issue": "water_authority",
  "electricity or power outage issue": "electricity",
  "sanitation or garbage or sewage issue": "sanitation",
  "public safety or fire or emergency issue": "public_safety",
  "animal control or stray animal issue": "animal_control",
  "public health or hospital or clinic issue": "health",
  "transport or traffic or parking issue": "transport",
  "environmental pollution or hazard issue": "environment",
  "police or crime or law enforcement issue": "police",
};

const CATEGORY_TO_DEPARTMENT = Object.entries(DEPARTMENT_LABELS).reduce(
  (acc, [key, name]) => {
    acc[key] = { name, key };
    return acc;
  },
  {},
);

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "it",
  "in",
  "on",
  "at",
  "to",
  "of",
  "and",
  "or",
  "but",
  "for",
  "with",
  "this",
  "that",
  "there",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "been",
  "be",
  "by",
  "from",
  "as",
  "not",
  "no",
  "so",
  "if",
  "we",
  "i",
  "my",
  "our",
  "your",
  "he",
  "she",
  "they",
  "their",
  "its",
  "do",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "am",
  "also",
  "very",
  "just",
  "more",
  "some",
  "any",
  "all",
  "about",
  "into",
  "than",
  "then",
  "when",
  "where",
  "which",
  "who",
  "what",
  "how",
  "please",
  "dear",
  "sir",
  "madam",
  "kindly",
  "request",
  "regarding",
  "issue",
  "problem",
  "complaint",
  "area",
  "place",
  "near",
  "since",
  "days",
  "weeks",
  "months",
  "already",
  "still",
  "now",
  "here",
  "there",
  "get",
  "got",
]);

function extractKeywords(text, maxKeywords = 8) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

function ruleBasedClassify(text) {
  const lower = text.toLowerCase();
  const rules = [
    {
      category: "public_works",
      keywords: [
        "road",
        "pothole",
        "pavement",
        "sidewalk",
        "bridge",
        "crack",
        "construction",
        "street light",
        "streetlight",
        "culvert",
        "footpath",
      ],
    },
    {
      category: "water_authority",
      keywords: [
        "water",
        "pipe",
        "leak",
        "flood",
        "drainage",
        "pump",
        "supply",
        "tap",
        "overflow",
        "waterlogged",
      ],
    },
    {
      category: "electricity",
      keywords: [
        "electricity",
        "power",
        "outage",
        "blackout",
        "wire",
        "pole",
        "transformer",
        "voltage",
        "wiring",
        "light",
        "lamp",
      ],
    },
    {
      category: "sanitation",
      keywords: [
        "garbage",
        "waste",
        "trash",
        "litter",
        "dump",
        "rubbish",
        "bin",
        "collection",
        "sewage",
        "smell",
        "odor",
      ],
    },
    {
      category: "public_safety",
      keywords: [
        "fire",
        "danger",
        "unsafe",
        "accident",
        "emergency",
        "hazard",
        "security",
        "collapse",
        "rescue",
      ],
    },
    {
      category: "animal_control",
      keywords: [
        "dog",
        "dogs",
        "stray",
        "animal",
        "animals",
        "cattle",
        "cow",
        "goat",
        "monkey",
        "rabies",
      ],
    },
    {
      category: "health",
      keywords: [
        "hospital",
        "clinic",
        "health",
        "medical",
        "ambulance",
        "doctor",
        "medicine",
        "mosquito",
        "dengue",
        "fever",
      ],
    },
    {
      category: "transport",
      keywords: [
        "traffic",
        "bus",
        "parking",
        "jam",
        "intersection",
        "signal",
        "terminal",
        "transport",
        "vehicle",
      ],
    },
    {
      category: "environment",
      keywords: [
        "pollution",
        "smoke",
        "dust",
        "air",
        "tree",
        "park",
        "green",
        "chemical",
        "toxic",
        "environment",
        "contamination",
        "burn",
      ],
    },
    {
      category: "police",
      keywords: [
        "crime",
        "theft",
        "robbery",
        "harassment",
        "fight",
        "violence",
        "drug",
        "illegal",
        "police",
        "murder",
        "assault",
      ],
    },
  ];

  let best = null;
  let bestScore = 0;

  for (const rule of rules) {
    const score = rule.keywords.filter((keyword) => lower.includes(keyword))
      .length;
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }

  const category = best || "public_works";
  const confidence =
    bestScore > 0 ? Math.min(0.5 + bestScore * 0.1, 0.85) : 0.3;

  const top2 = rules
    .map((rule) => ({
      category: rule.category,
      score: rule.keywords.filter((keyword) => lower.includes(keyword)).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => ({
      category: item.category,
      confidence: Math.min(0.5 + item.score * 0.1, 0.85),
    }));

  if (top2.length === 0) {
    top2.push({ category: "public_works", confidence: 0.3 });
  }
  if (top2.length === 1) {
    top2.push({ category: "sanitation", confidence: 0.25 });
  }

  return { category, confidence, top2, source: "rule-based" };
}

async function callHuggingFaceAPI(text) {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text.slice(0, 1000),
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
  const sorted = Array.isArray(result)
    ? result
    : result.labels.map((label, index) => ({
        label,
        score: result.scores[index],
      }));

  const top2 = sorted.slice(0, 2).map((item) => ({
    category: LABEL_TO_CATEGORY[item.label] || "public_works",
    confidence: item.score,
  }));

  return {
    category: top2[0].category,
    confidence: top2[0].confidence,
    top2,
    source: "huggingface",
  };
}

async function translateToEnglish(text) {
  // Simple check for Bangla characters (U+0980 to U+09FF)
  if (!/[\u0980-\u09FF]/.test(text)) return text;

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text.slice(0, 500)
      )}&langpair=bn|en`
    );
    const data = await res.json();
    if (data.responseData && data.responseData.translatedText) {
      console.log("[NLP] Translated Bangla to English for analysis");
      return data.responseData.translatedText;
    }
  } catch (err) {
    console.error("[Translation Error]:", err.message);
  }
  return text; // Fallback to original if translation fails
}

async function classifyComplaint(title, description) {
  // 1. Prepare and Translate if needed
  const rawText = `${title}. ${description}`;
  const text = await translateToEnglish(rawText);
  
  const keywords = extractKeywords(text);

  let classificationResult;

  if (HF_API_KEY && HF_API_KEY !== "your_huggingface_api_key_here") {
    try {
      classificationResult = await callHuggingFaceAPI(text);
    } catch (err) {
      console.warn(
        "[NLP] Hugging Face API failed, using rule-based fallback:",
        err.message,
      );
      classificationResult = ruleBasedClassify(text);
    }
  } else {
    classificationResult = ruleBasedClassify(text);
  }

  const { category, confidence, top2, source } = classificationResult;
  const department =
    CATEGORY_TO_DEPARTMENT[category] || CATEGORY_TO_DEPARTMENT.public_works;

  return {
    category,
    department,
    keywords,
    confidence: Math.round(confidence * 100) / 100,
    source,
    topCategories: top2.map((item) => ({
      category: item.category,
      confidence: Math.round(item.confidence * 100) / 100,
      department:
        CATEGORY_TO_DEPARTMENT[item.category] ||
        CATEGORY_TO_DEPARTMENT.public_works,
    })),
  };
}

module.exports = { classifyComplaint, extractKeywords };
