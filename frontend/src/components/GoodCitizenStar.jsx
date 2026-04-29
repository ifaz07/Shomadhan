import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const GoodCitizenStar = ({ size = 16, className = "" }) => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center justify-center bg-amber-100 text-amber-600 rounded-full p-0.5 border border-amber-200 shadow-sm ${className}`}
      title="Good Citizen of the Month"
    >
      <Star size={size} fill="currentColor" />
    </motion.div>
  );
};

export default GoodCitizenStar;
