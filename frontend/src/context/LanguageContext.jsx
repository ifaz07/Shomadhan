import { createContext, useContext, useState, useCallback, useRef } from 'react';

export const LanguageContext = createContext(null);

// ─── Translation request queue ────────────────────────────────────────
// MyMemory free tier allows ~1 req/sec. This queue serialises requests
// with a small delay to avoid 429 rate-limit errors.
const queue = [];
let running = false;

const enqueue = (fn) =>
  new Promise((resolve) => {
    queue.push({ fn, resolve });
    if (!running) drain();
  });

const drain = async () => {
  running = true;
  while (queue.length) {
    const { fn, resolve } = queue.shift();
    try {
      resolve(await fn());
    } catch {
      resolve(null);
    }
    // 120 ms gap between requests keeps us well under the rate limit
    if (queue.length) await new Promise((r) => setTimeout(r, 120));
  }
  running = false;
};

// ─── Persistent localStorage cache ───────────────────────────────────
const LS_KEY = 'somadhan_trans_cache';
const loadCache = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
};
const saveCache = (cache) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); } catch {}
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('somadhan_lang') || 'en'
  );
  // In-memory cache backed by localStorage
  const cache = useRef(loadCache());

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'bn' : 'en';
      localStorage.setItem('somadhan_lang', next);
      return next;
    });
  };

  const translateText = useCallback(async (text, from = 'en', to = 'bn') => {
    if (!text?.trim()) return text;
    if (to === 'en') return text;

    const cacheKey = `${text}|${from}|${to}`;
    if (cache.current[cacheKey]) return cache.current[cacheKey];

    const result = await enqueue(async () => {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
      );
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
      return text;
    });

    const translated = result || text;
    cache.current[cacheKey] = translated;
    saveCache(cache.current);
    return translated;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, translateText, cache }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
