import { useContext, useEffect, useState } from 'react';
import { LanguageContext } from '../context/LanguageContext';

const T = ({ en, children }) => {
  const { language, translateText, cache } = useContext(LanguageContext);
  const key = en || children || '';
  const [text, setText] = useState(() => {
    if (language === 'en') return key;
    const cacheKey = `${key}-${language}`;
    return cache.current[cacheKey] || key;
  });

  useEffect(() => {
    const getText = async () => {
      if (language === 'en') {
        setText(en || children || '');
        return;
      }
      const cacheKey = `${en}-${language}`;
      if (cache.current[cacheKey]) {
        setText(cache.current[cacheKey]);
        return;
      }
      const translated = await translateText(en || children || '', 'en', language);
      cache.current[cacheKey] = translated;
      setText(translated);
    };
    getText();
  }, [en, children, language, translateText, cache]);

  return <>{text}</>;
};

export default T;