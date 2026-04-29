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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

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
    const key = complaint.category || 'Uncategorized';
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
    try {
      const { data } = await axios.post(`${API_BASE}/mayor/announce-winner`, {}, { withCredentials: true });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Failed to announce winner");
      }
      fetchCitizenPoints();
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to announce winner";
      toast.error(errMsg);
    }
  };

  const handleRemoveBadge = async (id) => {
    try {
      const { data } = await axios.post(`${API_BASE}/mayor/remove-badge/${id}`, {}, { withCredentials: true });
      if (data.success) {
        toast.success(data.message);
        fetchCitizenPoints();
      }
    } catch (error) {
      toast.error('Failed to remove badge');
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
      const params = {};
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
      const { data } = await complaintAPI.getAll();
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

  const departmentStats = stats?.departments?.length > 0 ? stats.departments : buildDepartmentStats(allComplaints);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:px-8 sm:py-8"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-end">
          <div className="xl:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-100">
              <Target size={12} className="text-teal-300" />
              Executive Oversight
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
              Monitor city-wide complaint flow, identify critical service delays, and coordinate public action from one dashboard.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
              <span className="font-bold text-teal-600 uppercase tracking-tighter text-xs">Executive Oversight</span> · Manage city operations
            </p>
          </div>
          <div className="xl:col-span-4">
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm xl:ml-auto xl:max-w-xs">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Live Feed</p>
              <p className="mt-1 text-sm font-semibold text-white">
                Review urgent complaints, city efficiency, and citizen activity in real time.
              </p>
            </div>
          </div>
        </div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={FileText} label="Total Cases" value={stats?.global?.total || 0} color="text-blue-600" bg="bg-blue-50" delay={0.05} onClick={() => { setActiveTab('complaints'); fetchComplaints('total'); }} isActive={activeTab === 'complaints' && activeFilter === 'total'} />
          <StatCard icon={Clock} label="Pending" value={stats?.global?.pending || 0} color="text-amber-600" bg="bg-amber-50" delay={0.1} onClick={() => { setActiveTab('complaints'); fetchComplaints('pending'); }} isActive={activeTab === 'complaints' && activeFilter === 'pending'} />
          <StatCard icon={Loader2} label="In Progress" value={stats?.global?.inProgress || 0} color="text-indigo-600" bg="bg-indigo-50" delay={0.15} onClick={() => { setActiveTab('complaints'); fetchComplaints('in-progress'); }} isActive={activeTab === 'complaints' && activeFilter === 'in-progress'} />
          <StatCard icon={CheckCircle2} label="Resolved" value={stats?.global?.resolved || 0} color="text-emerald-600" bg="bg-emerald-50" delay={0.2} onClick={() => { setActiveTab('complaints'); fetchComplaints('resolved'); }} isActive={activeTab === 'complaints' && activeFilter === 'resolved'} />
          <StatCard icon={AlertTriangle} label="Critical" value={stats?.global?.critical || 0} color="text-red-600" bg="bg-red-50" delay={0.25} onClick={() => { setActiveTab('complaints'); fetchComplaints('critical'); }} isActive={activeTab === 'complaints' && activeFilter === 'critical'} />
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button onClick={() => setActiveTab('complaints')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'complaints' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400'}`}>
            Complaints Management
          </button>
          <button onClick={() => setActiveTab('leaderboard')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'leaderboard' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400'}`}>
            Citizen Leaderboard
          </button>
        </div>

        {activeTab === 'complaints' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-gray-900 capitalize">{activeFilter} Complaints</h2>
                <span className="text-[10px] font-black text-gray-400 uppercase">{complaints.length} Items</span>
              </div>
              <div className="space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {complaints.map((c, i) => <ComplaintCard key={c._id} complaint={c} index={i} onClick={(id) => navigate(`/complaints/${id}`)} />)}
              </div>
            </section>
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wider"><Target size={16} className="text-teal-500" /> City Efficiency</h2>
                <div className="space-y-5">
                  {departmentStats.slice(0, 5).map((dept, i) => {
                    const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase"><span>{dept._id}</span><span>{rate}%</span></div>
                        <div className="h-1.5 bg-gray-50 rounded-full border border-gray-100 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} className="h-full bg-teal-500" /></div>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="bg-white p-6 rounded-2xl border border-gray-100 border-t-4 border-t-blue-500">
                <h2 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wider"><Megaphone size={16} className="text-blue-500" /> New Ad</h2>
                <form onSubmit={handleAdSubmit} className="space-y-3">
                  <input type="text" placeholder="Title" className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs outline-none" value={adForm.title} onChange={e => setAdForm({...adForm, title: e.target.value})} required />
                  <textarea rows="2" placeholder="Description" className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs outline-none" value={adForm.description} onChange={e => setAdForm({...adForm, description: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="bg-gray-50 border rounded-lg px-2 py-2 text-[10px] outline-none" value={adForm.dateOfEvent} onChange={e => setAdForm({...adForm, dateOfEvent: e.target.value})} required />
                    <input type="number" placeholder="Qty" className="bg-gray-50 border rounded-lg px-2 py-2 text-xs outline-none" value={adForm.requiredVolunteers} onChange={e => setAdForm({...adForm, requiredVolunteers: e.target.value})} required />
                  </div>
                  <input type="text" placeholder="Contact" className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs outline-none" value={adForm.contactDetails} onChange={e => setAdForm({...adForm, contactDetails: e.target.value})} required />
                  <input type="file" id="p-file" className="hidden" onChange={e => setAdForm({...adForm, poster: e.target.files[0]})} />
                  <label htmlFor="p-file" className="block w-full bg-gray-50 border border-dashed rounded-lg px-3 py-2 text-[10px] cursor-pointer truncate">{adForm.poster ? adForm.poster.name : 'Upload Poster'}</label>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-lg text-xs flex justify-center gap-2">
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Publish
                  </button>
                </form>
              </section>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 flex justify-between items-center">
              <div><h2 className="text-xl font-bold text-teal-900">Citizen Recognition</h2><p className="text-sm text-teal-700">Reward the top active citizen.</p></div>
              <button onClick={handleAnnounceWinner} className="bg-teal-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-teal-700 transition-all flex items-center gap-2"><Plus size={18} /> Announce Monthly Winner</button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-4 p-4 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span className="col-span-2">Citizen Name</span><span>Points</span><span>Status</span>
              </div>
              <div className="divide-y divide-gray-50">
                {rewardLoading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-teal-500" /></div> : (
                  citizenPoints.map(citizen => (
                    <div key={citizen._id} className="grid grid-cols-4 p-4 items-center hover:bg-gray-50 transition-colors">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">{citizen.avatar ? <img src={resolveAvatar(citizen.avatar)} className="w-full h-full object-cover" /> : <User size={18} className="text-gray-400" />}</div>
                        <div><p className="font-bold flex items-center gap-1.5">{citizen.name} {citizen.isGoodCitizen && <GoodCitizenStar size={12} />}</p><p className="text-[10px] text-gray-400 font-mono">{citizen.email}</p></div>
                      </div>
                      <div className="text-sm font-black text-teal-600">{citizen.points}</div>
                      <div className="flex items-center justify-between pr-4">
                        {citizen.isGoodCitizen ? (
                          <>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest">Current Winner</span>
                            <button 
                              onClick={() => handleRemoveBadge(citizen._id)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 ml-4 flex items-center gap-1"
                            >
                              <X size={12} /> Undo
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Citizen</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <MayorChatbot />
    </DashboardLayout>
  );
};

export default MayorDashboard;
