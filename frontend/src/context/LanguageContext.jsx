import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('somadhan_lang') || 'en'
  );

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'bn' : 'en';
      localStorage.setItem('somadhan_lang', next);
      return next;
    });
  };

  // Lookup a static UI string by key
  const t = useCallback(
    (key) => translations[language]?.[key] ?? translations['en']?.[key] ?? key,
    [language]
  );

  // Real-time translation of arbitrary text via MyMemory free API
  // Usage: await translateText("road is broken", "en", "bn")
  const translateText = useCallback(async (text, from = 'en', to = 'bn') => {
    if (!text?.trim()) return text;
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
      );
      const data = await res.json();
      if (data.responseStatus === 200) return data.responseData.translatedText;
      return text;
    } catch {
      return text;
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
