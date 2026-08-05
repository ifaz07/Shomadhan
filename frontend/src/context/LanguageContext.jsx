import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { bnQuickTranslations } from '../translations';

export const LanguageContext = createContext(null);

const LOCAL_BN_TRANSLATIONS = bnQuickTranslations || {};
const inFlightRequests = new Map();

const localBanglaTranslate = (text, from = 'en', to = 'bn') => {
  if (!text || from !== 'en' || to !== 'bn') return null;
  return LOCAL_BN_TRANSLATIONS[text] || null;
};

// ─── Persistent localStorage cache ───────────────────────────────────
const LS_KEY = 'shomadhan_trans_cache';
const LEGACY_LS_KEY = 'somadhan_trans_cache';
const loadCache = () => {
  try {
    const current = localStorage.getItem(LS_KEY);
    if (current) return JSON.parse(current);
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy) return JSON.parse(legacy);
    return {};
  } catch { return {}; }
};
const saveCache = (cache) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch {}
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const current = localStorage.getItem('shomadhan_lang');
    if (current) return current;
    return localStorage.getItem('somadhan_lang') || 'en';
  });
  // In-memory cache backed by localStorage
  const cache = useRef(loadCache());

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'bn' : 'en';
      localStorage.setItem('shomadhan_lang', next);
      localStorage.removeItem('somadhan_lang');
      return next;
    });
  };

  const translateText = useCallback(async (text, from = 'en', to = 'bn') => {
    if (!text?.trim()) return text;
    if (to === 'en') return text;

    const cacheKey = `${text}|${from}|${to}`;
    if (cache.current[cacheKey]) return cache.current[cacheKey];

    const localTranslation = localBanglaTranslate(text, from, to);
    if (localTranslation) {
      cache.current[cacheKey] = localTranslation;
      saveCache(cache.current);
      return localTranslation;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const request = fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
    )
      .then(async (res) => {
        const data = await res.json();
        const translated = data.responseStatus === 200 && data.responseData?.translatedText
          ? data.responseData.translatedText
          : text;

        cache.current[cacheKey] = translated;
        saveCache(cache.current);
        return translated;
      })
      .catch(() => text)
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, request);
    return request;
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
