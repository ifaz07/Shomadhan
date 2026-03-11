import { createContext, useContext, useState, useCallback, useRef } from 'react';

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('somadhan_lang') || 'en'
  );
  const cache = useRef({});

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'bn' : 'en';
      localStorage.setItem('somadhan_lang', next);
      return next;
    });
  };

  // Real-time translation via MyMemory free API
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
