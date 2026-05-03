import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertTriangle, Clock, CheckCircle2, 
  Users, Megaphone, Calendar, MapPin, Tag, ThumbsUp,
  Target, Loader2, Upload, Plus, ChevronRight, X, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';
import { useAuth } from '../context/AuthContext';
import { complaintAPI } from '../services/api';
import MayorChatbot from '../components/MayorChatbot';
import GoodCitizenStar from '../components/GoodCitizenStar';
import { getDepartmentLabel, normalizeDepartmentValue } from '../constants/departments';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// ─── Helpers ──────────────────────────────────
const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
};

const resolveAvatar = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE.replace('/api/v1', '')}${url}`;
};

const getCurrentAwardMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentAwardPeriodLabel = () =>
  new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

const formatAwardHistoryLabel = (award) => {
  if (!award) return '';
  if (award.label) return award.label;
  if (award.awardMonth && award.awardYear) {
    return new Date(award.awardYear, award.awardMonth - 1, 1).toLocaleString(
      'default',
      { month: 'long', year: 'numeric' },
    );
  }
  if (award.awardedAt) {
    return new Date(award.awardedAt).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }
  return '';
};

const COMPLAINT_FILTERS = [
  { key: 'total', label: 'All Complaints' },
  { key: 'critical', label: 'Critical' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_CONFIG = {
  pending:       { badge: 'bg-amber-100 text-amber-700', label: 'Pending' },
  'in-progress': { badge: 'bg-blue-100 text-blue-700',   label: 'In Progress' },
  resolved:      { badge: 'bg-emerald-100 text-emerald-700', label: 'Resolved' },
  rejected:      { badge: 'bg-red-100 text-red-700',     label: 'Rejected' },
};

const PRIORITY_CONFIG = {
  Critical: { badge: 'bg-red-500 text-white', border: 'border-red-400' },
  High: { badge: 'bg-orange-500 text-white', border: 'border-orange-400' },
  Medium: { badge: 'bg-yellow-500 text-white', border: 'border-yellow-400' },
  Low: { badge: 'bg-green-500 text-white', border: 'border-green-400' },
};

const getSlaInfo = (slaDeadline, slaDurationHours) => {
  if (!slaDeadline || !slaDurationHours) return null;
  const now = Date.now();
  const deadline = new Date(slaDeadline).getTime();
  const totalMs = slaDurationHours * 60 * 60 * 1000;
  const slaSetAt = deadline - totalMs;
  const elapsed = Math.max(0, now - slaSetAt);
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));
  const msLeft = deadline - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isOverdue = msLeft <= 0;
  return { progress, daysLeft, isOverdue };
};

const buildDepartmentStats = (items = []) => {
  const grouped = items.reduce((acc, complaint) => {
    const normalizedKey = normalizeDepartmentValue(complaint.category);
    const key = normalizedKey || complaint.category || 'other';
    if (!acc[key]) {
      acc[key] = { _id: key, resolved: 0, total: 0 };
    }
    acc[key].total += 1;
    if (complaint.status === 'resolved') {
      acc[key].resolved += 1;
    }
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => b.total - a.total);
};

const normalizeDepartmentStats = (items = []) => {
  const merged = items.reduce((acc, item) => {
    const normalizedKey = normalizeDepartmentValue(item._id);
    const key = normalizedKey || item._id || 'other';
    if (!acc[key]) {
      acc[key] = { _id: key, resolved: 0, total: 0, pendingInProgress: 0 };
    }
    acc[key].resolved += item.resolved || 0;
    acc[key].total += item.total || 0;
    acc[key].pendingInProgress += item.pendingInProgress || 0;
    return acc;
  }, {});

  return Object.values(merged)
    .map((item) => ({
      ...item,
      label: getDepartmentLabel(item._id) || 'Other',
      rate: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0,
      open: typeof item.pendingInProgress === 'number'
        ? item.pendingInProgress
        : Math.max(0, item.total - item.resolved),
    }))
    .sort((a, b) => b.total - a.total);
};

// ─── Sub-Components ───────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color, bg, delay, onClick, isActive }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}
    className={`bg-white rounded-2xl p-5 border transition-all duration-200 cursor-pointer group ${
      isActive 
        ? `ring-2 ring-offset-2 ${color.replace('text-', 'ring-')} border-transparent shadow-md scale-[1.02]` 
        : 'border-gray-100 shadow-sm hover:shadow-md hover:border-teal-100'
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${bg}`}>
        <Icon size={20} className={color} />
      </div>
    </div>
  </motion.div>
);

const ComplaintCard = ({ complaint, index, onClick }) => {
  const pCfg = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.Low;
  const sCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending;
  const sla = getSlaInfo(complaint.slaDeadline, complaint.slaDurationHours);
  const isResolved = complaint.status === 'resolved';
  const cardBorder = isResolved ? 'border-gray-200' : pCfg.border;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick(complaint._id)}
      className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${cardBorder} hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.995]`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {!isResolved && (
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${pCfg.badge}`}>
                {complaint.priority}
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${sCfg.badge}`}>
              {sCfg.label}
            </span>
            <span className="text-xs text-gray-400 font-mono">{complaint.ticketId}</span>
          </div>
          <h3 className="font-bold text-gray-900 text-base truncate mb-1.5">{complaint.title}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1 truncate max-w-[420px]">
              <MapPin size={11} /> {complaint.location}
            </span>
            <span className="flex items-center gap-1">
              <Tag size={11} /> {complaint.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> {timeAgo(complaint.createdAt)}
            </span>
          </div>
          {sla && !isResolved ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>
                  SLA Deadline: {sla.isOverdue ? 'Overdue' : `${sla.daysLeft} day${sla.daysLeft === 1 ? '' : 's'} left`}
                </span>
                <span>{sla.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sla.isOverdue ? 'bg-red-500' : sla.daysLeft <= 1 ? 'bg-red-500' : sla.daysLeft <= 3 ? 'bg-orange-500' : 'bg-gray-800'
                  }`}
                  style={{ width: `${sla.progress}%` }}
                />
              </div>
            </div>
          ) : !isResolved ? (
            <p className="mt-3 text-xs text-gray-400 italic">No deadline assigned yet</p>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1">
          <ThumbsUp size={18} className="text-gray-400" />
          <span className="text-base font-bold text-gray-800 leading-tight">{complaint.voteCount ?? 0}</span>
          <span className="text-xs text-gray-400">Upvotes</span>
        </div>
      </div>
    </motion.div>
  );
};

const ActionConfirmModal = ({
  open,
  title,
  message,
  confirmLabel,
  confirmTone = 'teal',
  onConfirm,
  onClose,
  loading = false,
}) => {
  if (!open) return null;

  const confirmClass =
    confirmTone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-200'
      : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-200';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-md rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Confirmation
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────

const MayorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [allComplaints, setAllComplaints] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('total'); 
  const [activeTab, setActiveTab] = useState('complaints'); 
  const [citizenPoints, setCitizenPoints] = useState([]);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: null,
    citizen: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '', description: '', poster: null, 
    dateOfEvent: '', requiredVolunteers: 10, contactDetails: ''
  });

  useEffect(() => {
    fetchStats();
    fetchComplaints('total');
    fetchAllComplaints();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') fetchCitizenPoints();
  }, [activeTab]);

  const fetchCitizenPoints = async () => {
    setRewardLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/mayor/citizens-points`, { withCredentials: true });
      if (data.success) setCitizenPoints(data.data);
    } catch (error) {
      toast.error('Failed to load points');
    } finally {
      setRewardLoading(false);
    }
  };

  const handleAnnounceWinner = async () => {
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/mayor/announce-winner`, {}, { withCredentials: true });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Failed to announce winner");
      }
      await fetchCitizenPoints();
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to announce winner";
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false, type: null, citizen: null });
    }
  };

  const handleRemoveBadge = async (id) => {
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/mayor/remove-badge/${id}`, {}, { withCredentials: true });
      if (data.success) {
        toast.success(data.message);
        await fetchCitizenPoints();
      }
    } catch (error) {
      toast.error('Failed to remove badge');
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false, type: null, citizen: null });
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/mayor/dashboard-stats`, { withCredentials: true });
      if (data.success) setStats(data.data);
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async (filterType) => {
    setListLoading(true);
    setActiveFilter(filterType);
    try {
      const params = { excludeRejected: 'true' };
      if (filterType === 'pending') params.status = 'pending';
      if (filterType === 'in-progress') params.status = 'in-progress';
      if (filterType === 'resolved') params.status = 'resolved';
      if (filterType === 'critical') params.priority = 'Critical';
      const { data } = await complaintAPI.getAll(params);
      setComplaints(data.data || []);
    } catch (error) {
      toast.error('Failed to load complaints');
    } finally {
      setListLoading(false);
    }
  };

  const fetchAllComplaints = async () => {
    try {
      const { data } = await complaintAPI.getAll({ excludeRejected: 'true' });
      const complaintList = Array.isArray(data.data) ? data.data : (data.data?.complaints || []);
      setAllComplaints(complaintList);
    } catch (error) {
      console.error('Failed to fetch department stats', error);
    }
  };

  const handleAdSubmit = async (e) => {
    e.preventDefault();
    if (!adForm.poster) return toast.error('Please select a poster image');
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(adForm).forEach(key => formData.append(key, adForm[key]));
      const { data } = await axios.post(`${API_BASE}/volunteer-ads`, formData, { 
        withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) {
        toast.success('Advertisement Published!');
        setAdForm({ title: '', description: '', poster: null, dateOfEvent: '', requiredVolunteers: 10, contactDetails: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-teal-500" />
        </div>
      </DashboardLayout>
    );
  }

  const departmentStats = normalizeDepartmentStats(
    stats?.departments?.length > 0 ? stats.departments : buildDepartmentStats(allComplaints)
  );
  const headerStats = [
    { label: "Total Complaints", value: stats?.global?.total || 0, accent: "text-blue-200" },
    { label: "Critical", value: stats?.global?.critical || 0, accent: "text-red-200" },
    { label: "In Progress", value: stats?.global?.inProgress || 0, accent: "text-cyan-200" },
    { label: "Resolved", value: stats?.global?.resolved || 0, accent: "text-emerald-200" },
  ];
  const topDepartment = departmentStats[0];
  const averageEfficiency = departmentStats.length
    ? Math.round(departmentStats.reduce((sum, dept) => sum + dept.rate, 0) / departmentStats.length)
    : 0;
  const tabButtonClass = (key) => `rounded-full px-5 py-3 text-sm font-bold transition-all ${
    activeTab === key
      ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
      : 'text-slate-500 hover:bg-white hover:text-slate-900'
  }`;
  const currentAwardMonthKey = getCurrentAwardMonthKey();
  const currentAwardPeriodLabel = getCurrentAwardPeriodLabel();
  const activeFilterLabel =
    COMPLAINT_FILTERS.find((filter) => filter.key === activeFilter)?.label || 'All Complaints';
  const currentWinner = citizenPoints.find((citizen) =>
    citizen.awardHistory?.some((award) => award.monthKey === currentAwardMonthKey),
  );
  const announceLocked = Boolean(currentWinner);
  const openAnnounceConfirm = () =>
    setConfirmState({ open: true, type: 'announce', citizen: currentWinner || null });
  const openUndoConfirm = (citizen) =>
    setConfirmState({ open: true, type: 'undo', citizen });
  const closeConfirm = () => {
    if (actionLoading) return;
    setConfirmState({ open: false, type: null, citizen: null });
  };
  const handleConfirmAction = () => {
    if (confirmState.type === 'announce') {
      handleAnnounceWinner();
      return;
    }
    if (confirmState.type === 'undo' && confirmState.citizen?._id) {
      handleRemoveBadge(confirmState.citizen._id);
    }
  };
  const confirmTitle =
    confirmState.type === 'undo'
      ? 'Undo Monthly Winner'
      : 'Announce Monthly Winner';
  const confirmMessage =
    confirmState.type === 'undo'
      ? `This will remove the ${currentAwardPeriodLabel} Good Citizen award from ${confirmState.citizen?.name || 'this citizen'}. Their older badge history will stay intact.`
      : `This will officially declare the top-ranked citizen as the Good Citizen winner for ${currentAwardPeriodLabel}. This month can only be awarded once.`;
  const confirmLabel =
    confirmState.type === 'undo' ? 'Confirm Undo' : 'Confirm Announcement';

  return (
    <DashboardLayout>
      <ActionConfirmModal
        open={confirmState.open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        confirmTone={confirmState.type === 'undo' ? 'danger' : 'teal'}
        onConfirm={handleConfirmAction}
        onClose={closeConfirm}
        loading={actionLoading}
      />
      <div className="mx-auto max-w-[1390px] space-y-6 px-0 sm:px-1">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-teal-800 via-slate-800 to-blue-900 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-8"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-end">
          <div className="xl:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-100">
              <Target size={12} className="text-teal-300" />
              <T en="Executive Oversight" />
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              <T en="Welcome back" />{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
              <T en="Monitor city-wide complaint flow, identify critical service delays, and coordinate public action from one dashboard." />
            </p>
          </div>
          <div className="xl:col-span-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {headerStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                    <T en={item.label} />
                  </p>
                  <p className={`mt-2 text-2xl font-black ${item.accent}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('complaints')} className={tabButtonClass('complaints')}>
              <T en="Complaints Management" />
            </button>
            <button onClick={() => setActiveTab('leaderboard')} className={tabButtonClass('leaderboard')}>
              <T en="Citizen Leaderboard" />
            </button>
            <button onClick={() => setActiveTab('efficiency')} className={tabButtonClass('efficiency')}>
              <T en="City Efficiency" />
            </button>
            <button onClick={() => setActiveTab('ads')} className={tabButtonClass('ads')}>
              <T en="New Ad" />
            </button>
          </div>
        </div>

        {activeTab === 'complaints' ? (
          <section className="space-y-4">
              <div className="flex items-center justify-between px-1 lg:px-2">
                <h2 className="text-lg font-bold text-gray-900">{activeFilterLabel}</h2>
                <span className="text-[10px] font-black text-gray-400 uppercase">{complaints.length} Items</span>
              </div>
              <div className="flex flex-wrap gap-2 px-1 lg:px-2">
                {COMPLAINT_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => fetchComplaints(filter.key)}
                    disabled={listLoading && activeFilter === filter.key}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                      activeFilter === filter.key
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                        : 'border border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-teal-700'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <T en={filter.label} />
                  </button>
                ))}
              </div>
              <div className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
                <div className="space-y-3 max-h-[780px] overflow-y-auto pr-1 custom-scrollbar">
                  {listLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={22} className="animate-spin text-teal-500" />
                    </div>
                  ) : complaints.length > 0 ? (
                    complaints.map((c, i) => (
                      <ComplaintCard
                        key={c._id}
                        complaint={c}
                        index={i}
                        onClick={(id) => navigate(`/complaints/${id}`)}
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center text-sm font-medium text-slate-400">
                      No complaints matched this filter.
                    </div>
                  )}
                </div>
              </div>
          </section>
        ) : activeTab === 'leaderboard' ? (
          <section className="space-y-5">
              <div className="bg-teal-50 p-6 rounded-[1.75rem] border border-teal-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-teal-900"><T en="Citizen Recognition" /></h2>
                  <p className="text-sm text-teal-700">
                    {currentWinner
                      ? `${currentAwardPeriodLabel} winner already declared: ${currentWinner.name}.`
                      : 'Reward the top active citizen for this month.'}
                  </p>
                </div>
                <button
                  onClick={openAnnounceConfirm}
                  disabled={announceLocked}
                  className="bg-teal-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-teal-600"
                >
                  <Plus size={18} /> <T en="Announce Monthly Winner" />
                </button>
              </div>
              <div className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm">
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <span className="col-span-4"><T en="Citizen Name" /></span>
                  <span className="col-span-2"><T en="Points" /></span>
                  <span className="col-span-2"><T en="Badges" /></span>
                  <span className="col-span-4"><T en="Award History" /></span>
                </div>
                <div className="max-h-[760px] overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                  {rewardLoading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-teal-500" /></div> : (
                    citizenPoints.map(citizen => (
                      <div key={citizen._id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">{citizen.avatar ? <img src={resolveAvatar(citizen.avatar)} className="w-full h-full object-cover" /> : <User size={18} className="text-gray-400" />}</div>
                          <div className="min-w-0"><p className="font-bold flex items-center gap-1.5 truncate">{citizen.name} {citizen.isGoodCitizen && <GoodCitizenStar size={12} />}</p><p className="text-[10px] text-gray-400 font-mono truncate">{citizen.email}</p></div>
                        </div>
                        <div className="col-span-2 text-sm font-black text-teal-600">{citizen.points}</div>
                        <div className="col-span-2">
                          <div className="inline-flex flex-col rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">Total Awards</span>
                            <span className="mt-1 text-sm font-black text-amber-800">{citizen.badgeCount || 0}</span>
                          </div>
                        </div>
                        <div className="col-span-4 flex flex-col gap-3 pr-2">
                          {citizen.isGoodCitizen ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"><T en="Current Winner" /></span>
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                                {citizen.latestAward?.label || currentAwardPeriodLabel}
                              </span>
                              <button 
                                onClick={() => openUndoConfirm(citizen)}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 whitespace-nowrap"
                              >
                                <X size={12} /> <T en="Undo This Month" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest"><T en="Citizen" /></span>
                          )}
                          {citizen.awardHistory?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {citizen.awardHistory.slice(0, 4).map((award) => (
                                <span
                                  key={`${citizen._id}-${award.monthKey || award.awardedAt}`}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600"
                                >
                                  <Calendar size={11} className="text-slate-400" />
                                  {formatAwardHistoryLabel(award)}
                                </span>
                              ))}
                              {citizen.awardHistory.length > 4 && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-400">
                                  +{citizen.awardHistory.length - 4} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">No awards yet</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
          </section>
        ) : activeTab === 'efficiency' ? (
          <section className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.75rem] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">
                  <T en="Highest Coverage" />
                </p>
                <h3 className="mt-3 text-2xl font-black text-slate-900">{topDepartment?.label || 'N/A'}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  <T en="Leading complaint volume currently tracked in the city-wide operations view." />
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
                  <T en="Average Resolution Rate" />
                </p>
                <h3 className="mt-3 text-3xl font-black text-slate-900">{averageEfficiency}%</h3>
                <p className="mt-2 text-sm text-slate-600">
                  <T en="Average share of resolved complaints across the listed city service groups." />
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  <T en="Departments Tracked" />
                </p>
                <h3 className="mt-3 text-3xl font-black text-slate-900">{departmentStats.length}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  <T en="Normalized from both legacy complaint categories and current department assignments." />
                </p>
              </div>
            </div>

            <div className="rounded-[1.9rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    <T en="City Efficiency Board" />
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    <T en="Department performance is based on resolved complaints compared with the total complaints assigned to each service group." />
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-black text-slate-900">{stats?.slaCompliance?.exceeded || 0}</span>{' '}
                  <T en="active complaints have already crossed SLA." />
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {departmentStats.map((dept) => (
                  <div key={dept._id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">{dept.label}</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">{dept.rate}%</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dept.resolved} <T en="resolved out of" /> {dept.total} <T en="complaints" />
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white px-4 py-3 text-right shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                          <T en="Open Cases" />
                        </p>
                        <p className="mt-2 text-xl font-black text-amber-600">{dept.open}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${dept.rate}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[1.9rem] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="rounded-[1.75rem] border border-slate-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
                  <Megaphone size={13} className="text-blue-500" />
                  <T en="Campaign Publisher" />
                </div>
                <h2 className="mt-4 text-2xl font-black text-slate-900">
                  <T en="Publish a new city volunteer advertisement" />
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  <T en="Create a polished public call for volunteers with the event date, required headcount, contact details, and poster in one place." />
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      <T en="Suggested Use" />
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      <T en="Flood response, public cleanup drives, health camps, and neighborhood outreach." />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      <T en="Best Practice" />
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      <T en="Use a clear event title, exact date, and a reachable phone or email before publishing." />
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAdSubmit} className="space-y-4 rounded-[1.75rem] border border-slate-100 bg-slate-50/80 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    <T en="New Ad" />
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    <T en="Fill in the campaign details below to publish the announcement to citizens." />
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Title"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={adForm.title}
                  onChange={e => setAdForm({ ...adForm, title: e.target.value })}
                  required
                />
                <textarea
                  rows="5"
                  placeholder="Description"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={adForm.description}
                  onChange={e => setAdForm({ ...adForm, description: e.target.value })}
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="date"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    value={adForm.dateOfEvent}
                    onChange={e => setAdForm({ ...adForm, dateOfEvent: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    value={adForm.requiredVolunteers}
                    onChange={e => setAdForm({ ...adForm, requiredVolunteers: e.target.value })}
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Contact"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={adForm.contactDetails}
                  onChange={e => setAdForm({ ...adForm, contactDetails: e.target.value })}
                  required
                />
                <input type="file" id="p-file" className="hidden" onChange={e => setAdForm({ ...adForm, poster: e.target.files[0] })} />
                <label htmlFor="p-file" className="block w-full cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500 transition hover:border-blue-300 hover:bg-blue-50/40">
                  {adForm.poster ? adForm.poster.name : 'Upload Poster'}
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  <T en="Publish" />
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
      <MayorChatbot />
    </DashboardLayout>
  );
};

export default MayorDashboard;
