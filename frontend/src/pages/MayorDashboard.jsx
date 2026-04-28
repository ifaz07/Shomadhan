import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertTriangle, Clock, CheckCircle2, 
  Users, Megaphone, Calendar, MapPin, Tag, ThumbsUp,
  Target, Loader2, Upload, Plus, ChevronRight, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';
import { useAuth } from '../context/AuthContext';
import { complaintAPI } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// ─── Helpers (Same as DashboardPage) ──────────────────────────────────
const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
};

const STATUS_CONFIG = {
  pending:       { badge: 'bg-amber-100 text-amber-700', label: 'Pending' },
  'in-progress': { badge: 'bg-blue-100 text-blue-700',   label: 'In Progress' },
  resolved:      { badge: 'bg-emerald-100 text-emerald-700', label: 'Resolved' },
  rejected:      { badge: 'bg-red-100 text-red-700',     label: 'Rejected' },
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
  const sCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick(complaint._id)}
      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all flex gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sCfg.badge}`}>
            {sCfg.label}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">{complaint.ticketId}</span>
        </div>
        <h3 className="font-bold text-gray-900 text-sm truncate mb-1">{complaint.title}</h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1 truncate max-w-[150px]">
            <MapPin size={12} className="text-gray-400" /> {complaint.location}
          </span>
          <span className="flex items-center gap-1">
            <Tag size={12} className="text-gray-400" /> {complaint.category}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-gray-400" /> {timeAgo(complaint.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center border-l border-gray-50 pl-4 min-w-[60px]">
        <ThumbsUp size={16} className="text-teal-500 mb-0.5" />
        <span className="text-sm font-black text-gray-900">{complaint.voteCount || 0}</span>
        <span className="text-[8px] text-gray-400 uppercase font-bold">Votes</span>
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
  
  // List management
  const [complaints, setComplaints] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('total'); // 'total', 'pending', 'in-progress', 'resolved', 'critical'

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '', description: '', poster: null, 
    dateOfEvent: '', requiredVolunteers: 10, contactDetails: ''
  });

  useEffect(() => {
    fetchStats();
    fetchComplaints('total');
  }, []);

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl font-bold text-gray-900">
              <T en="Welcome!" /> {user?.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-bold text-teal-600 uppercase tracking-tighter text-xs">Executive Oversight</span>{' '}
              · <T en="Manage city operations and mobilization" />
            </p>
          </motion.div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Clock size={12} />
            Live Data Feed
          </div>
        </div>

        {/* ── Stat Cards (Clickable) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={FileText}      label={<T en="Total Cases" />}
            value={stats?.global?.total || 0} color="text-blue-600"  bg="bg-blue-50"  delay={0.05}
            onClick={() => fetchComplaints('total')} isActive={activeFilter === 'total'}
          />
          <StatCard
            icon={Clock}         label={<T en="Pending" />}
            value={stats?.global?.pending || 0} color="text-amber-600" bg="bg-amber-50" delay={0.1}
            onClick={() => fetchComplaints('pending')} isActive={activeFilter === 'pending'}
          />
          <StatCard
            icon={Loader2}       label={<T en="In Progress" />}
            value={stats?.global?.inProgress || 0} color="text-indigo-600" bg="bg-indigo-50" delay={0.15}
            onClick={() => fetchComplaints('in-progress')} isActive={activeFilter === 'in-progress'}
          />
          <StatCard
            icon={CheckCircle2}  label={<T en="Resolved" />}
            value={stats?.global?.resolved || 0} color="text-emerald-600" bg="bg-emerald-50" delay={0.2}
            onClick={() => fetchComplaints('resolved')} isActive={activeFilter === 'resolved'}
          />
          <StatCard
            icon={AlertTriangle} label={<T en="Critical" />}
            value={stats?.global?.critical || 0} color="text-red-600" bg="bg-red-50" delay={0.25}
            onClick={() => fetchComplaints('critical')} isActive={activeFilter === 'critical'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Dynamic Complaint List (Filtered by Stat Cards) ── */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 capitalize">
                {activeFilter} <T en="Complaints" />
                {listLoading && <Loader2 size={16} className="animate-spin text-teal-500" />}
              </h2>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {complaints.length} Items found
              </span>
            </div>

            <div className="space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {complaints.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center"
                  >
                    <FileText size={40} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-400 font-bold text-sm">No complaints found in this category.</p>
                  </motion.div>
                ) : (
                  complaints.map((c, i) => (
                    <ComplaintCard 
                      key={c._id} 
                      complaint={c} 
                      index={i} 
                      onClick={(id) => navigate(`/complaints/${id}`)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* ── Sidebar: Dept Stats & Volunteer Ads ── */}
          <div className="space-y-6">
            {/* Department Performance */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6 uppercase tracking-wider">
                <Target size={16} className="text-teal-500" />
                City Efficiency
              </h2>
              <div className="space-y-5">
                {stats?.departments?.slice(0, 5).map((dept, i) => {
                  const resolutionRate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-gray-600">{dept._id}</span>
                        <span className="text-teal-600">{resolutionRate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${resolutionRate}%` }}
                          className="h-full bg-gradient-to-r from-teal-400 to-teal-500" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Volunteer Form */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-blue-500">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4 uppercase tracking-wider">
                <Megaphone size={16} className="text-blue-500" />
                New Ad
              </h2>
              <form onSubmit={handleAdSubmit} className="space-y-3">
                <input 
                  type="text" placeholder="Event Title"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-teal-400 outline-none"
                  value={adForm.title} onChange={e => setAdForm({...adForm, title: e.target.value})} required
                />
                <textarea 
                  rows="2" placeholder="Description"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-teal-400 outline-none"
                  value={adForm.description} onChange={e => setAdForm({...adForm, description: e.target.value})} required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="date" className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-[10px] outline-none"
                    value={adForm.dateOfEvent} onChange={e => setAdForm({...adForm, dateOfEvent: e.target.value})} required
                  />
                  <input 
                    type="number" placeholder="Qty" className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none"
                    value={adForm.requiredVolunteers} onChange={e => setAdForm({...adForm, requiredVolunteers: e.target.value})} required
                  />
                </div>
                <input 
                  type="text" placeholder="Contact Info"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-teal-400 outline-none"
                  value={adForm.contactDetails} onChange={e => setAdForm({...adForm, contactDetails: e.target.value})} required
                />
                <div className="relative">
                  <input type="file" id="m-poster" className="hidden" onChange={e => setAdForm({...adForm, poster: e.target.files[0]})} />
                  <label htmlFor="m-poster" className="flex items-center gap-2 bg-gray-50 border border-gray-200 border-dashed rounded-lg px-3 py-2 text-[10px] text-gray-500 cursor-pointer hover:bg-gray-100">
                    <Upload size={14} />
                    <span className="truncate">{adForm.poster ? adForm.poster.name : 'Poster Image'}</span>
                  </label>
                </div>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-lg hover:bg-black transition-all flex items-center justify-center gap-2 text-xs"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Publish
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MayorDashboard;
