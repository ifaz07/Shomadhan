import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Loader2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Drop this next to any complaint description textarea.
 * It translates the provided `text` to the opposite language using
 * the MyMemory free API and shows the result inline.
 *
 * Props:
 *   text       – the text to translate (e.g. complaint description value)
 *   fromLang   – source language code ('en' or 'bn'), defaults to current UI lang
 *   toLang     – target language code, defaults to opposite of current UI lang
 */
const TranslateWidget = ({ text, fromLang, toLang }) => {
  const { language, translateText, t } = useLanguage();
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);

  const src = fromLang ?? language;
  const tgt = toLang ?? (language === 'en' ? 'bn' : 'en');

  const handleTranslate = async () => {
    if (!text?.trim()) return;
    setLoading(true);
    setTranslated('');
    const result = await translateText(text, src, tgt);
    setTranslated(result);
    setLoading(false);
  };

  const clear = () => setTranslated('');

  return (
    <div className="mt-2">
      {/* Translate button */}
      <button
        type="button"
        onClick={handleTranslate}
        disabled={loading || !text?.trim()}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Languages size={13} />
        )}
        {loading ? t('translating') : t('translateBtn')}
        {tgt === 'bn' ? ' → বাংলা' : ' → English'}
      </button>

      {/* Translation result */}
      <AnimatePresence>
        {translated && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 p-3 rounded-xl bg-teal-50 border border-teal-200 relative"
          >
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
            <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider mb-1">
              {t('translationLabel')}
            </p>
            <p className={`text-sm text-gray-700 leading-relaxed pr-5 ${tgt === 'bn' ? 'font-bengali' : ''}`}>
              {translated}
            </p>
            <p className="text-[10px] text-teal-400 mt-1.5">{t('translationHint')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TranslateWidget;
