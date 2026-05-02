import { motion } from 'framer-motion';
import LanguageToggle from '../LanguageToggle';
import T from '../T';
import FloatingShapes from '../FloatingShapes';

// ─── Left-side branding panel (desktop only) ─────────────────────────
const BrandingPanel = () => (
  <div className="hidden lg:flex lg:w-5/12 relative flex-col justify-center items-center p-12 overflow-hidden">
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative z-10 text-center max-w-md"
    >
      {/* Logo / Brand icon */}
      <motion.div
        className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-teal-500/25"
        whileHover={{ scale: 1.05, rotate: 2 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <span className="text-3xl font-bold text-white font-bengali">স</span>
      </motion.div>

      <h1 className="text-4xl font-extrabold text-white mb-3 font-bengali">
        সমাধান
      </h1>
      <p className="text-lg text-teal-300 font-semibold mb-2">Somadhan</p>
      <p className="text-white/50 text-sm leading-relaxed mb-10">
        <T en="Smart Civic Issue Tracking & Resolution System. Report issues, track progress, and build a better city — together." />
      </p>

      {/* Animated stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: '10K+', label: <T en="Issues Resolved" /> },
          { value: '50+',  label: <T en="Departments" /> },
          { value: '98%',  label: <T en="Citizen Trust" /> },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.15 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10"
          >
            <p className="text-xl font-bold text-teal-300">{stat.value}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

// ─── Main Auth Layout wrapper ────────────────────────────────────────
const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen auth-page-wrapper flex relative overflow-hidden">
      {/* Background logo watermark handled by CSS class .auth-page-wrapper::before */}

      {/* Language toggle — fixed top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle variant="dark" />
      </div>

      {/* Center area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
             <img src="/assets/auth-logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4 drop-shadow-xl [clip-path:circle(50%)]" />
             <h1 className="text-3xl font-black text-white tracking-tight">Somadhan</h1>
             <div className="h-1 w-12 bg-[#a1824a] mx-auto mt-2 rounded-full" />
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-white/10">
            {children}
          </div>
        </motion.div>
        
        <p className="text-white/30 text-xs mt-12 font-medium tracking-widest uppercase">
          Government of Bangladesh
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
