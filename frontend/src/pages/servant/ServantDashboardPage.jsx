import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { servantAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ServantLayout from '../../components/layout/ServantLayout';

const DEPT_DISPLAY = {
  public_works:    'Public Works',
  water_authority: 'Water Authority',
  electricity:     'Electricity',
  sanitation:      'Sanitation',
  public_safety:   'Public Safety',
  animal_control:  'Animal Control',
  environment:     'Environment',
  health:          'Health',
  transport:       'Transport',
  other:           'General Administration',
};

const PRIORITY_STYLE = {
  Critical: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  High:     { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  Low:      { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
};

const STATUS_STYLE = {
  pending:     { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Pending' },
  'in-progress': { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'In Progress' },
  resolved:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Resolved' },
  rejected:    { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rejected' },
};

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-2xl border ${color.border} p-5 flex items-center gap-4`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.iconBg}`}>
      <Icon size={22} className={color.iconText} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const ServantDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servantAPI.getStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deptLabel = DEPT_DISPLAY[user?.department] || 'Department';

  if (loading) {
    return (
      <ServantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      </ServantLayout>
    );
  }

  return (
    <ServantLayout>
      <div className="space-y-6 max-w-5xl">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.name}
          </h1>
          <p className="text-gray-500 mt-1">
            <span className="font-medium text-blue-600">{deptLabel}</span> Officer · Managing your department's complaints
          </p>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Assigned"
            value={stats?.total ?? 0}
            icon={ClipboardList}
            color={{ border: 'border-gray-200', iconBg: 'bg-gray-100', iconText: 'text-gray-600' }}
          />
          <StatCard
            label="Pending"
            value={stats?.pending ?? 0}
            icon={Clock}
            color={{ border: 'border-yellow-200', iconBg: 'bg-yellow-50', iconText: 'text-yellow-600' }}
          />
          <StatCard
            label="In Progress"
            value={stats?.inProgress ?? 0}
            icon={Flame}
            color={{ border: 'border-blue-200', iconBg: 'bg-blue-50', iconText: 'text-blue-600' }}
          />
          <StatCard
            label="Resolved"
            value={stats?.resolved ?? 0}
            icon={CheckCircle2}
            color={{ border: 'border-green-200', iconBg: 'bg-green-50', iconText: 'text-green-600' }}
          />
        </div>

        {/* ── Critical / High summary ── */}
        {(stats?.critical > 0 || stats?.high > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4"
          >
            <AlertTriangle size={22} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-800">
              You have{' '}
              {stats.critical > 0 && (
                <span className="font-bold text-red-700">{stats.critical} Critical</span>
              )}
              {stats.critical > 0 && stats.high > 0 && ' and '}
              {stats.high > 0 && (
                <span className="font-bold text-orange-600">{stats.high} High</span>
              )}
              {' '}priority complaint{(stats.critical + stats.high) > 1 ? 's' : ''} that need attention.
            </p>
            <Link
              to="/servant/complaints?priority=Critical"
              className="ml-auto shrink-0 text-xs font-semibold text-red-700 underline"
            >
              View all
            </Link>
          </motion.div>
        )}

        {/* ── Urgent complaints ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">Urgent Complaints</h2>
            <Link
              to="/servant/complaints"
              className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {!stats?.urgent?.length ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-green-400" />
              <p className="font-medium">No urgent complaints right now</p>
              <p className="text-sm mt-1">All critical and high priority issues are handled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.urgent.map((c, i) => {
                const pStyle = PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.Low;
                const sStyle = STATUS_STYLE[c.status] || STATUS_STYLE.pending;
                return (
                  <motion.div
                    key={c._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center gap-4"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pStyle.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pStyle.bg} ${pStyle.text}`}>
                          {c.priority}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">{c.category}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sStyle.bg} ${sStyle.text}`}>
                          {sStyle.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.ticketId}</p>
                    </div>
                    <Link
                      to="/servant/complaints"
                      className="text-xs text-blue-600 font-medium hover:underline shrink-0"
                    >
                      Manage →
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </ServantLayout>
  );
};

export default ServantDashboardPage;
