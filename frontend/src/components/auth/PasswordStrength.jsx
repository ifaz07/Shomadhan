import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

// ─── Password strength meter with animated rules ─────────────────────
const PasswordStrength = ({ password }) => {
  const rules = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /\d/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
  ];

  const passedCount = rules.filter((r) => r.test(password)).length;
  const strengthPercent = (passedCount / rules.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercent <= 20) return 'bg-red-500';
    if (strengthPercent <= 40) return 'bg-orange-500';
    if (strengthPercent <= 60) return 'bg-yellow-500';
    if (strengthPercent <= 80) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strengthPercent <= 20) return 'Very Weak';
    if (strengthPercent <= 40) return 'Weak';
    if (strengthPercent <= 60) return 'Fair';
    if (strengthPercent <= 80) return 'Strong';
    return 'Very Strong';
  };

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 space-y-2"
    >
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${getStrengthColor()}`}
            initial={{ width: 0 }}
            animate={{ width: `${strengthPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className={`text-xs font-medium min-w-[70px] text-right ${
          strengthPercent === 100 ? 'text-green-600' : 'text-gray-500'
        }`}>
          {getStrengthText()}
        </span>
      </div>

      {/* Rule checklist */}
      <div className="grid grid-cols-1 gap-1">
        {rules.map((rule) => {
          const passed = rule.test(password);
          return (
            <motion.div
              key={rule.label}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {passed ? (
                <Check size={12} className="text-green-500 flex-shrink-0" />
              ) : (
                <X size={12} className="text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-[11px] ${passed ? 'text-green-600' : 'text-gray-400'}`}>
                {rule.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PasswordStrength;
