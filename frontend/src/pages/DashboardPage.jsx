import { motion } from 'framer-motion';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';

// Department keys (names resolved via t() at render time)
const DEPARTMENTS = [
  { nameKey: 'dept_public_works',   icon: '🏗️', key: 'public_works',   critical: 0, pending: 0, color: 'from-orange-400 to-orange-600' },
  { nameKey: 'dept_water_authority',icon: '💧', key: 'water_authority', critical: 0, pending: 0, color: 'from-blue-400 to-blue-600'   },
  { nameKey: 'dept_electricity',    icon: '⚡', key: 'electricity',     critical: 0, pending: 0, color: 'from-yellow-400 to-yellow-600' },
  { nameKey: 'dept_sanitation',     icon: '🧹', key: 'sanitation',      critical: 0, pending: 0, color: 'from-green-400 to-green-600'  },
  { nameKey: 'dept_public_safety',  icon: '🛡️', key: 'public_safety',  critical: 0, pending: 0, color: 'from-red-400 to-red-600'     },
  { nameKey: 'dept_animal_control', icon: '🐾', key: 'animal_control',  critical: 0, pending: 0, color: 'from-purple-400 to-purple-600'},
];

// ─── Stat Card ───────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, trend, trendValue, color, delay }) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          color === 'text-gray-900' ? 'bg-gray-100' :
          color === 'text-red-600'  ? 'bg-red-50'   :
          color === 'text-blue-600' ? 'bg-blue-50'  :
          'bg-green-50'
        }`}>
          <Icon size={22} className={color} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3">
          {trend === 'up' ? (
            <TrendingUp size={14} className="text-green-500" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trendValue}
          </span>
          <span className="text-xs text-gray-400 ml-1">{t('vsLastWeek')}</span>
        </div>
      )}
    </motion.div>
  );
};

// ─── Department Card ─────────────────────────────────────────────────
const DeptCard = ({ dept, index }) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{dept.icon}</span>
          <h3 className="font-semibold text-gray-900 text-sm">{t(dept.nameKey)}</h3>
        </div>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center`}>
          <span className="text-white text-xs font-bold">{dept.critical + dept.pending}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{t('critical')}</span>
          <span className={`text-sm font-bold ${dept.critical > 0 ? 'text-red-600' : 'text-gray-300'}`}>
            {dept.critical}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{t('pendingLabel')}</span>
          <span className={`text-sm font-bold ${dept.pending > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
            {dept.pending}
          </span>
        </div>
      </div>

      <button className="flex items-center gap-1 mt-4 text-xs font-medium text-teal-600 hover:text-teal-700 group-hover:gap-2 transition-all">
        {t('viewAll')} <ArrowRight size={14} />
      </button>
    </motion.div>
  );
};

// ─── Dashboard Page ──────────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const stats = { total: 0, critical: 0, inProgress: 0, resolved: 0 };

  const roleLabel =
    user?.role === 'department_officer' ? t('rolePublicServant') : t('roleCitizen');

  return (
    <DashboardLayout>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t('welcomeGreeting')} <span className="text-teal-600">{user?.name?.split(' ')[0]}</span>!
            </h1>
            <p className="text-gray-500 text-sm mt-1">{t('cityHappenings')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
              {t('roleLabel')}: <span className="font-medium text-gray-600">{roleLabel}</span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── Stats Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText}      label={t('totalComplaints')} value={stats.total}      color="text-gray-900"  delay={0.1}  />
        <StatCard icon={AlertTriangle} label={t('criticalIssues')}  value={stats.critical}   color="text-red-600"   delay={0.15} />
        <StatCard icon={Clock}         label={t('inProgress')}       value={stats.inProgress} color="text-blue-600"  delay={0.2}  />
        <StatCard icon={CheckCircle2}  label={t('resolved')}         value={stats.resolved}   color="text-green-600" delay={0.25} />
      </div>

      {/* ─── Departments Grid ───────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('departments')}</h2>
          <button className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
            {t('viewAll')} <ArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEPARTMENTS.map((dept, i) => (
            <DeptCard key={dept.key} dept={dept} index={i} />
          ))}
        </div>
      </div>

      {/* ─── Empty state ─────────────────────────────────────────── */}
      {stats.total === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200"
        >
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-teal-500" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{t('noComplaintsYet')}</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">{t('noComplaintsDesc')}</p>
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
