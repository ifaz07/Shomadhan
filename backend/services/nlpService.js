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

// Comprehensive English & Bangla Stopwords
const STOPWORDS = new Set([
  "the", "a", "an", "is", "it", "in", "on", "at", "to", "of", "and", "or", "but", "for", "with",
  "this", "that", "there", "are", "was", "were", "has", "have", "had", "been", "be", "by", "from",
  "as", "not", "no", "so", "if", "we", "i", "my", "our", "your", "he", "she", "they", "their", "its",
  "do", "did", "will", "would", "can", "could", "should", "may", "might", "am", "also", "very",
  "just", "more", "some", "any", "all", "about", "into", "than", "then", "when", "where", "which",
  "who", "what", "how", "please", "dear", "sir", "madam", "kindly", "request", "regarding", "issue",
  "problem", "complaint", "area", "place", "near", "since", "days", "weeks", "months", "already",
  "still", "now", "here", "there", "get", "got", "hello", "helo", "hi", "hey", "pls", "plz",
  // Bangla Stopwords
  "এই", "সেই", "আমাদের", "আমার", "আপনার", "তারা", "তাদের", "এখানে", "সেখানে", "আছে", "হয়েছে",
  "হচ্ছে", "করা", "জন্য", "এবং", "বা", "কিন্তু", "অত্যন্ত", "খুব", "অনেক", "দিন", "ধরে", "হতে",
  "থেকে", "চেয়ে", "প্লিজ", "ভাই", "স্যার", "ম্যাডাম", "নমস্কার", "হ্যালো", "একটি", "একটা"
]);

/**
 * Unicode-aware keyword extraction supporting English, Bangla script, and Banglish.
 */
function extractKeywords(text, maxKeywords = 8) {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));

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
 * Multilingual Rule-Based Classification (English, Bangla Unicode, Phonetic Banglish)
 */
function ruleBasedClassify(text) {
  const lower = text.toLowerCase();
  const rules = [
    {
      category: "public_works",
      keywords: [
        "road", "pothole", "pavement", "sidewalk", "footpath", "bridge", "crack", "construction",
        "street light", "streetlight", "culvert", "asphalt", "hole", "broken road",
        // Bangla
        "রাস্তা", "সড়ক", "পথহোল", "গর্ত", "ফুটপাত", "সেতু", "পুল", "কালভার্ট", "রাস্তার", "ভাঙা", "ভাংগা", "মেরামত", "নির্মাণ",
        // Banglish
        "rasta", "rastar", "gorto", "khana khond", "khankhond", "pothole", "footpath", "bhanga", "bhanga rasta"
      ],
    },
    {
      category: "water_authority",
      keywords: [
        "water", "pipe", "leak", "leakage", "flood", "flooding", "drain", "drainage", "sewage",
        "pump", "supply", "tap", "overflow", "waterlogged", "clogged", "blocked drain",
        // Bangla
        "পানি", "জলাবদ্ধতা", "নর্দমা", "ড্রেন", "ড্রেনেজ", "পাইপ", "লিক", "পয়ঃনিষ্কাশন", "পয়নিষ্কাশন", "পাম্প", "সাপ্লাই", "কল", "পানি জমে", "পানির",
        // Banglish
        "pani", "panir", "pipe", "paip", "drain", "draine", "drainage", "noddama", "nordoma", "nordama", "nodi", "jalabaddhata", "leak", "leakage"
      ],
    },
    {
      category: "electricity",
      keywords: [
        "electricity", "power", "outage", "blackout", "wire", "pole", "post", "transformer",
        "voltage", "wiring", "light", "lamp", "electric", "spark", "cable", "current",
        // Bangla
        "বিদ্যুৎ", "কারেন্ট", "তার", "পোস্টার", "পোস্ট", "পোল", "খাম্বা", "ট্রান্সফরমার", "ভোল্টেজ", "বাতি", "লাইটিং", "স্পার্ক", "বিদ্যুতের",
        // Banglish
        "biddut", "bidduter", "current", "karant", "karent", "tar", "khamba", "pole", "transformer", "voltage", "bati", "light", "spark"
      ],
    },
    {
      category: "sanitation",
      keywords: [
        "garbage", "waste", "trash", "litter", "dump", "rubbish", "bin", "dustbin", "collection",
        "cleanliness", "smell", "odor", "stink", "rotten", "filth", "sweeper",
        // Bangla
        "ময়লা", "আবর্জনা", "গার্বেজ", "ডাস্টবিন", "দুর্গন্ধ", "বর্জ্য", "পরিষ্কার", "পরিচ্ছন্নতা", "পচা", "গন্ধ", "ঝাড়ুদার",
        // Banglish
        "moyla", "moylar", "abarjona", "garbage", "waste", "trash", "dustbin", "durgondho", "smell", "stink", "poca", "borjjo"
      ],
    },
    {
      category: "public_safety",
      keywords: [
        "fire", "danger", "dangerous", "unsafe", "accident", "emergency", "hazard", "security",
        "collapse", "rescue", "blast", "gas leak",
        // Bangla
        "আগুন", "বিপদ", "বিজ্জনক", "দুর্ঘটনা", "জরুরি", "গ্যাস লিক", "ধস", "উদ্ধার", "নিরাপত্তা", "বিস্ফোরণ",
        // Banglish
        "agun", "fire", "bipod", "bipodjonok", "accident", "emergency", "gas leak", "gas", "dhos", "blast"
      ],
    },
    {
      category: "animal_control",
      keywords: [
        "dog", "dogs", "stray", "animal", "animals", "cattle", "cow", "goat", "monkey", "rabies",
        "bite", "biting", "barking",
        // Bangla
        "কুকুর", "বিড়াল", "পশু", "প্রাণী", "গরু", "ছাগল", "কামড়", "রেবিস", "পাগল কুকুর",
        // Banglish
        "kukur", "kukurdar", "dog", "stray", "animal", "kamor", "bite", "biral"
      ],
    },
    {
      category: "health",
      keywords: [
        "hospital", "clinic", "health", "medical", "ambulance", "doctor", "medicine", "mosquito",
        "dengue", "fever", "disease", "epidemic", "outbreak",
        // Bangla
        "হাসপাতাল", "ক্লিনিক", "স্বাস্থ্য", "চিকিৎসা", "অ্যাম্বুলেন্স", "ডাক্তার", "ঔষধ", "মশা", "ডেঙ্গু", "জ্বর", "রোগ",
        // Banglish
        "hospital", "clinic", "swasthya", "doctor", "medicine", "mosa", "mosha", "dengue", "jhor", "ambulance"
      ],
    },
    {
      category: "transport",
      keywords: [
        "traffic", "jam", "traffic jam", "bus", "parking", "signal", "terminal", "transport",
        "vehicle", "roadblock", "rickshaw", "auto",
        // Bangla
        "যানজট", "ট্রাফিক", "বাস", "পার্কিং", "সিগন্যাল", "টার্মিনাল", "পরিবহন", "গাড়ি", "রিকশা",
        // Banglish
        "tranjot", "janjot", "jam", "traffic", "bus", "parking", "signal", "gari", "rickshaw"
      ],
    },
    {
      category: "environment",
      keywords: [
        "pollution", "smoke", "dust", "air", "tree", "park", "green", "chemical", "toxic",
        "contamination", "burn", "noise", "sound",
        // Bangla
        "দূষণ", "ধোঁয়া", "ধুলো", "বাতাস", "গাছ", "পার্ক", "রাসায়নিক", "শব্দ দূষণ", "পরিবেশ",
        // Banglish
        "duson", "dussom", "dhoa", "dhula", "gach", "park", "rasayonik", "environment", "pollution"
      ],
    },
    {
      category: "police",
      keywords: [
        "crime", "theft", "robbery", "harassment", "fight", "violence", "drug", "illegal",
        "police", "murder", "assault", "snatching", "thief",
        // Bangla
        "অপরাধ", "চুরি", "ডাকাতি", "ছিনতাই", "হয়রানি", "মারামারি", "সহিংসতা", "মাদক", "অবৈধ", "পুলিশ", "খুন",
        // Banglish
        "churi", "chintai", "dakati", "police", "hoyrani", "maramari", "crime", "theft", "snatching"
      ],
    },
  ];

  let best = null;
  let bestScore = 0;

  for (const rule of rules) {
    const score = rule.keywords.filter((keyword) => lower.includes(keyword)).length;
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }

  const hasMeaningfulMatch = bestScore > 0;
  const category = hasMeaningfulMatch ? best : null;
  const confidence = hasMeaningfulMatch ? Math.min(0.5 + bestScore * 0.1, 0.85) : 0;

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

  return {
    category,
    confidence,
    top2: hasMeaningfulMatch ? top2 : [],
    isLowConfidence: !hasMeaningfulMatch,
    needsManualReview: !hasMeaningfulMatch,
    manualReviewMessage:
      !hasMeaningfulMatch
        ? "No relevant department keywords were detected. Please select the department manually."
        : null,
    source: "rule-based",
  };
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
  if (!result || (!Array.isArray(result) && (!result.labels || !Array.isArray(result.labels)))) {
    throw new Error("Invalid response structure from Hugging Face API");
  }

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

/**
 * Translates Bangla text to English via API and returns combined text (Original + English Translation)
 */
async function translateToEnglish(text) {
  if (!text || !text.trim()) return "";
  const hasBangla = /[\u0980-\u09FF]/.test(text);
  if (!hasBangla) return text;

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text.slice(0, 500)
      )}&langpair=bn|en`
    );
    const data = await res.json();
    if (data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      console.log(`[NLP Translation] Translated Bangla -> English: "${translated.slice(0, 60)}"`);
      return `${text} ${translated}`;
    }
  } catch (err) {
    console.error("[Translation Error]:", err.message);
  }
  return text;
}

function buildClassificationContext(title, description) {
  const safeTitle = (title || "").trim();
  const safeDescription = (description || "").trim();
  const hasTextDetails = Boolean(safeDescription);
  const hasTitle = Boolean(safeTitle);

  const combinedRaw = [safeTitle, safeDescription].filter(Boolean).join(". ");
  const rawText = combinedRaw || "Civic Complaint";

  return {
    title: safeTitle,
    description: safeDescription,
    hasTextDetails,
    hasTitle,
    combinedRaw,
    rawText,
  };
}

function calculateConfidence(score, matchedKeywordsCount, hasTitle, hasTextDetails) {
  const base = Math.min(0.5 + score * 0.1, 0.85);
  const titleBonus = hasTitle ? 0.04 : 0;
  const detailBonus = hasTextDetails ? 0.04 : 0;
  const keywordBonus = matchedKeywordsCount >= 2 ? 0.05 : 0;
  return Math.min(base + titleBonus + detailBonus + keywordBonus, 0.95);
}

/**
 * Evaluates title and detailed description together for department classification.
 * If only the title is available, confidence is reduced and a manual-review notice is returned.
 */
async function classifyComplaint(title, description) {
  const context = buildClassificationContext(title, description);
  const textToAnalyze = await translateToEnglish(context.rawText);
  const keywords = extractKeywords(textToAnalyze);

  let classificationResult;

  if (HF_API_KEY && HF_API_KEY !== "your_huggingface_api_key_here") {
    try {
      classificationResult = await callHuggingFaceAPI(textToAnalyze);
    } catch (err) {
      console.warn("[NLP] Hugging Face API failed, using rule-based fallback:", err.message);
      classificationResult = ruleBasedClassify(textToAnalyze);
    }
  } else {
    classificationResult = ruleBasedClassify(textToAnalyze);
  }

  const { category, confidence, top2, source, isLowConfidence, needsManualReview, manualReviewMessage } = classificationResult;
  const department = category ? CATEGORY_TO_DEPARTMENT[category] || CATEGORY_TO_DEPARTMENT.public_works : null;
  const hasMeaningfulSuggestion = Boolean(category && department);
  const confidenceScore = hasMeaningfulSuggestion
    ? calculateConfidence(confidence, keywords.length, context.hasTitle, context.hasTextDetails)
    : 0;

  const shouldRequestManualReview = !hasMeaningfulSuggestion || (!context.hasTextDetails && !context.hasTitle);

  return {
    category: category || null,
    department,
    keywords,
    confidence: Math.round(confidenceScore * 100) / 100,
    source,
    isLowConfidence: Boolean(isLowConfidence || shouldRequestManualReview),
    needsManualReview: Boolean(needsManualReview || shouldRequestManualReview),
    manualReviewMessage:
      shouldRequestManualReview && !manualReviewMessage
        ? context.hasTextDetails
          ? "Department suggestion is based on the title only because no detailed description text was available. Please review the department manually if needed."
          : "No relevant department keywords were detected. Please select the department manually."
        : manualReviewMessage || null,
    topCategories: top2.map((item) => ({
      category: item.category,
      confidence: Math.round(Math.min(item.confidence, 0.95) * 100) / 100,
      department: CATEGORY_TO_DEPARTMENT[item.category] || CATEGORY_TO_DEPARTMENT.public_works,
    })),
    evidence: {
      hasTitle: context.hasTitle,
      hasTextDetails: context.hasTextDetails,
      translatedText: textToAnalyze,
    },
  };
}

module.exports = { classifyComplaint, extractKeywords };
