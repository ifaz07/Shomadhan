import { useContext, useEffect, useState } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { bnQuickTranslations } from '../translations';

const getLocalBanglaText = (key, language) => {
  if (language !== 'bn') return key;
  return bnQuickTranslations[key] || key;
};

const T = ({ en, children }) => {
  const { language, translateText, cache } = useContext(LanguageContext);
  const key = en || children || '';
  const [text, setText] = useState(() => getLocalBanglaText(key, language));

  useEffect(() => {
    const sourceText = en || children || '';

    if (language === 'en') {
      setText(sourceText);
      return;
    }

    const localTranslation = getLocalBanglaText(sourceText, language);
    if (localTranslation !== sourceText) {
      setText(localTranslation);
      return;
    }

    const cacheKey = `${sourceText}|en|${language}`;
    if (cache.current[cacheKey]) {
      setText(cache.current[cacheKey]);
      return;
    }

    let cancelled = false;
    translateText(sourceText, 'en', language).then((translated) => {
      if (!cancelled) setText(translated || sourceText);
    });

    return () => {
      cancelled = true;
    };
  }, [en, children, language, translateText, cache]);

  return <>{text}</>;
};

export default T;
