import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, CheckCircle2, Clock, FileText, AlertTriangle,
  TrendingUp, Hammer, Droplets, Zap, Trash2, Shield, Leaf,
  RefreshCw, MapPin, Tag, ChevronRight, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { complaintAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';

// ─── Config ───────────────────────────────────────────────────────────
const DEPT_CONFIG = {
  public_works:    { label: 'Public Works',    icon: Hammer,   color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-100', bar: 'bg-orange-500'  },
  water_authority: { label: 'Water Authority', icon: Droplets, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100',   bar: 'bg-blue-500'    },
  electricity:     { label: 'Electricity',     icon: Zap,      color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-100', bar: 'bg-yellow-500'  },
  sanitation:      { label: 'Sanitation',      icon: Trash2,   color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-100',  bar: 'bg-green-500'   },
  public_safety:   { label: 'Public Safety',   icon: Shield,   color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-100',    bar: 'bg-red-500'     },
  animal_control:  { label: 'Animal Control',  icon: Leaf,     color: 'text-teal-600',   bg: 'bg-teal-50',    border: 'border-teal-100',   bar: 'bg-teal-500'    },
};

const STATUS_CONFIG = {
  pending:       { badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400',  label: 'Pending'     },
  'in-progress': { badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',  label: 'In Progress' },
  resolved:      { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'Resolved'    },
  rejected:      { badge: 'bg-red-100 text-red-700',     dot: 'bg-red-400',   label: 'Rejected'    },
};

const PRIORITY_BADGE = {
  Critical: 'bg-red-500 text-white',
  High:     'bg-orange-500 text-white',
  Medium:   'bg-yellow-500 text-white',
  Low:      'bg-green-500 text-white',
};

const CATEGORY_TO_DEPT_LABEL = {
  Road: 'Public Works', Waste: 'Sanitation', Electricity: 'Electricity',
  Water: 'Water Authority', Safety: 'Public Safety',
  'Law Enforcement': 'Public Safety', Environment: 'Public Works', Other: 'General',
};

// ─── Helpers ──────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── Stat Card ────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, delay, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500"><T en={label} /></p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon size={22} className={color} />
      </div>
    </div>
  </motion.div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────
const SkeletonCard = ({ h = 'h-28' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 animate-pulse ${h}`} />
);

// ─── Main Page ────────────────────────────────────────────────────────
const PublicAnalyticsPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await complaintAPI.getStats();
      setStats(res.data.data);
      setLastUpdated(new Date());
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchMyComplaints = async () => {
    try {
      setLoadingMine(true);
      const res = await complaintAPI.getAll({ mine: true });
      setMyComplaints(res.data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchMyComplaints();
  }, []);

  const resolutionRate = stats && stats.total > 0
    ? Math.round((stats.resolved / stats.total) * 100)
    : 0;

  const pendingCount = stats ? stats.total - stats.resolved - stats.inProgress : 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* ─── Page Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold text-gray-900"
            >
              <T en="Public Performance Dashboard" />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="text-sm text-gray-500 mt-1"
            >
              <T en="Citywide complaint analytics, department resolution rates, and your complaint status in real time" />
            </motion.p>
          </div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => { fetchStats(); fetchMyComplaints(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm flex-shrink-0"
          >
            <RefreshCw size={14} className={loadingStats ? 'animate-spin' : ''} />
            <T en="Refresh" />
          </motion.button>
        </div>

        {/* ─── Summary Stats Row ────────────────────────────────────── */}
        {loadingStats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={FileText}      label="Total Complaints" value={stats.total}      color="text-blue-600"  bg="bg-blue-50"  delay={0.0} />
            <StatCard icon={CheckCircle2}  label="Resolved"         value={stats.resolved}   color="text-green-600" bg="bg-green-50" delay={0.05}
              subtitle={<>{resolutionRate}% <T en="resolution rate" /></>}
            />
            <StatCard icon={Clock}         label="In Progress"      value={stats.inProgress} color="text-sky-600"   bg="bg-sky-50"   delay={0.1} />
            <StatCard icon={AlertTriangle} label="Critical Cases"   value={stats.critical}   color="text-red-600"   bg="bg-red-50"   delay={0.15} />
          </div>
        )}

        {/* ─── Overall Resolution Rate ──────────────────────────────── */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp size={17} className="text-teal-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  <T en="Overall Resolution Rate" />
                </h2>
              </div>
              <span className="text-2xl font-bold text-teal-600">{resolutionRate}%</span>
            </div>

            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mt-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${resolutionRate}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
              />
            </div>

            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {stats.resolved} <T en="resolved" />
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  {stats.inProgress} <T en="in progress" />
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  {pendingCount} <T en="pending" />
                </span>
              </div>
              <span className="text-xs text-gray-400">{stats.total} <T en="total" /></span>
            </div>
          </motion.div>
        )}

        {/* ─── Department Performance ───────────────────────────────── */}
        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"
          >
            <BarChart3 size={16} className="text-teal-600" />
            <T en="Department-wise Performance" />
          </motion.h2>

          {loadingStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} h="h-44" />)}
            </div>
          ) : stats?.departments && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.departments).map(([key, dept], i) => {
                const cfg = DEPT_CONFIG[key];
                if (!cfg) return null;
                const Icon = cfg.icon;
                const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                const deptPending = dept.total - (dept.resolved || 0) - (dept.inProgress || 0);

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 + i * 0.05 }}
                    className={`bg-white rounded-2xl p-5 shadow-sm border ${cfg.border} hover:shadow-md transition-all`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Icon size={20} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          <T en={cfg.label} />
                        </p>
                        <p className="text-xs text-gray-400">
                          {dept.total} <T en={dept.total === 1 ? 'total complaint' : 'total complaints'} />
                        </p>
                      </div>
                      {dept.critical > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 flex-shrink-0">
                          {dept.critical} <T en="critical" />
                        </span>
                      )}
                    </div>

                    {/* Resolution bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500"><T en="Resolution rate" /></span>
                        <span className={`font-bold ${cfg.color}`}>{rate}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rate}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.35 + i * 0.05 }}
                          className={`h-full rounded-full ${cfg.bar}`}
                        />
                      </div>
                    </div>

                    {/* Status breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-lg font-bold text-green-600">{dept.resolved || 0}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5"><T en="Resolved" /></p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">{dept.inProgress || 0}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5"><T en="In Progress" /></p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-500">{Math.max(0, deptPending)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5"><T en="Pending" /></p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── My Complaints Real-time ──────────────────────────────── */}
        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"
          >
            <Activity size={16} className="text-teal-600" />
            <T en="My Complaint Status" />
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-600">
              <T en="LIVE" />
            </span>
          </motion.h2>

          {loadingMine ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} h="h-16" />)}
            </div>
          ) : myComplaints.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="bg-white rounded-2xl p-10 border border-gray-100 text-center"
            >
              <FileText size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                <T en="You haven't submitted any complaints yet." />
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {myComplaints.slice(0, 10).map((c, i) => {
                const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                const lastEntry = c.history?.length > 0 ? c.history[c.history.length - 1] : null;
                const deptLabel = CATEGORY_TO_DEPT_LABEL[c.category] || c.category;

                return (
                  <motion.div
                    key={c._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.04 }}
                    onClick={() => navigate(`/complaints/${c._id}`)}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status dot */}
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.title}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${PRIORITY_BADGE[c.priority] || ''}`}>
                            <T en={c.priority} />
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[11px] text-gray-400 font-mono">{c.ticketId}</span>
                          {c.location && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <MapPin size={10} />
                              {c.location.length > 28 ? c.location.slice(0, 28) + '…' : c.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Tag size={10} />
                            <T en={deptLabel} />
                          </span>
                        </div>
                      </div>

                      {/* Status + time */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${sc.badge}`}>
                          <T en={sc.label} />
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                      </div>

                      <ChevronRight size={15} className="text-gray-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                    </div>

                    {/* Latest history entry */}
                    {lastEntry && (
                      <div className="mt-2 pt-2 border-t border-gray-50 pl-5">
                        <p className="text-[11px] text-gray-400 truncate">
                          <span className="font-medium text-gray-500"><T en="Latest" />: </span>
                          {lastEntry.message || <><T en="Status changed to" /> {lastEntry.status}</>}
                          <span className="ml-1.5">&middot; {timeAgo(lastEntry.updatedAt)}</span>
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {myComplaints.length > 10 && (
                <button
                  onClick={() => navigate('/my-complaints')}
                  className="w-full py-3 rounded-2xl text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 transition-all"
                >
                  <T en="View all" /> {myComplaints.length} <T en="complaints" /> →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ───────────────────────────────────────────────── */}
        {lastUpdated && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs text-gray-400 pb-2"
          >
            <T en="Last updated" />: {lastUpdated.toLocaleTimeString()}
          </motion.p>
        )}

      </div>
    </DashboardLayout>
  );
};

export default PublicAnalyticsPage;
