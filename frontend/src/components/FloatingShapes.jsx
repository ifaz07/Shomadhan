import { motion } from 'framer-motion';

const FloatingShapes = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    {/* Large blurred circles */}
    <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#a1824a]/10 rounded-full blur-3xl animate-float" />
    <div className="absolute top-1/3 -right-20 w-72 h-72 bg-[#0d3b4b]/10 rounded-full blur-3xl animate-float-delayed" />
    <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-[#a1824a]/5 rounded-full blur-3xl animate-pulse-slow" />

    {/* Small geometric accents */}
    <motion.div
      className="absolute top-20 right-1/4 w-3 h-3 bg-[#a1824a]/40 rounded-full"
      animate={{ y: [0, -15, 0], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 4, repeat: Infinity }}
    />
    <motion.div
      className="absolute bottom-32 left-20 w-2 h-2 bg-[#0d3b4b]/30 rounded-full"
      animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 3, repeat: Infinity, delay: 1 }}
    />
    <motion.div
      className="absolute top-1/2 left-10 w-4 h-4 bg-[#a1824a]/20 rounded-full"
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

export default FloatingShapes;
