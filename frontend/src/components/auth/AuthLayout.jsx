import { motion } from 'framer-motion';
import LanguageToggle from '../LanguageToggle';
import T from '../T';

// ─── Floating decorative shapes for the background ───────────────────
const FloatingShapes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Large blurred circles */}
    <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" />
    <div className="absolute top-1/3 -right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
    <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl animate-pulse-slow" />

    {/* Small geometric accents */}
    <motion.div
      className="absolute top-20 right-1/4 w-3 h-3 bg-teal-400/40 rounded-full"
      animate={{ y: [0, -15, 0], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 4, repeat: Infinity }}
    />
    <motion.div
      className="absolute bottom-32 left-20 w-2 h-2 bg-blue-400/30 rounded-full"
      animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 3, repeat: Infinity, delay: 1 }}
    />
    <motion.div
      className="absolute top-1/2 left-10 w-4 h-4 bg-cyan-400/20 rounded-full"
      animate={{ y: [0, -20, 0] }}
      transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
    />

    {/* Grid pattern overlay */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}
    />
  </div>
);

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
    <div className="min-h-screen auth-bg flex relative">
      <FloatingShapes />

      {/* Language toggle — fixed top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle variant="dark" />
      </div>

      <BrandingPanel />

      {/* Right side — form area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
