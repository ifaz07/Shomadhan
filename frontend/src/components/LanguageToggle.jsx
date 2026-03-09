import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Language toggle pill — switches between English and Bangla.
 *
 * variant="dark"  → white text, for use on dark/coloured backgrounds (auth pages)
 * variant="light" → gray text, for use on white backgrounds (sidebar)
 */
const LanguageToggle = ({ variant = 'dark', className = '' }) => {
  const { language, toggleLanguage } = useLanguage();
  const isBn = language === 'bn';

  const base =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 select-none';

  const dark =
    'bg-white/10 border-white/25 text-white hover:bg-white/20 backdrop-blur-sm';

  const light =
    'bg-gray-50 border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700';

  return (
    <motion.button
      onClick={toggleLanguage}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
      className={`${base} ${variant === 'dark' ? dark : light} ${className}`}
    >
      <Globe size={13} />
      {/* Active language */}
      <span className="font-bold">{isBn ? 'বাং' : 'EN'}</span>
      <span className="opacity-30">|</span>
      {/* Inactive language */}
      <span className="opacity-50">{isBn ? 'EN' : 'বাং'}</span>
    </motion.button>
  );
};

export default LanguageToggle;
