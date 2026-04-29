import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, CheckCircle2, Clock, FileText, AlertTriangle,
  TrendingUp, Hammer, Droplets, Zap, Trash2, Shield, Leaf,
  RefreshCw, MapPin, Tag, ChevronRight, Activity, Download,
  FileDown, Calendar as CalendarIcon, Printer, Loader2,
  PieChart as PieChartIcon, Target, Users, ZapOff
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import { complaintAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';
import { useAuth } from '../context/AuthContext';
import GoodCitizenStar from '../components/GoodCitizenStar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Config ───────────────────────────────────────────────────────────
const DEPT_CONFIG = {
  public_works:    { label: 'Public Works',    icon: Hammer,   color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-100', bar: 'bg-orange-500', chart: '#f97316' },
  water_authority: { label: 'Water Authority', icon: Droplets, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100',   bar: 'bg-blue-500',   chart: '#3b82f6' },
  electricity:     { label: 'Electricity',     icon: Zap,      color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-100', bar: 'bg-yellow-500', chart: '#eab308' },
  sanitation:      { label: 'Sanitation',      icon: Trash2,   color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-100',  bar: 'bg-green-500',  chart: '#22c55e' },
  public_safety:   { label: 'Public Safety',   icon: Shield,   color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-100',    bar: 'bg-red-500',    chart: '#ef4444' },
  animal_control:  { label: 'Animal Control',  icon: Leaf,     color: 'text-teal-600',   bg: 'bg-teal-50',    border: 'border-teal-100',   bar: 'bg-teal-500',   chart: '#0d9488' },
};

const STATUS_CONFIG = {
  pending:       { badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400',  label: 'Pending'     },
  'in-progress': { badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',  label: 'In Progress' },
  resolved:      { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'Resolved'    },
  rejected:      { badge: 'bg-red-100 text-red-700',     dot: 'bg-red-400',   label: 'Rejected'    },
};

const PRIORITY_THEME = {
  Critical: { badge: 'bg-red-100 text-red-700',   icon: AlertTriangle, border: 'border-red-200' },
  High:     { badge: 'bg-orange-100 text-orange-700', icon: TrendingUp, border: 'border-orange-200' },
  Medium:   { badge: 'bg-yellow-100 text-yellow-700', icon: Clock,      border: 'border-yellow-200' },
  Low:      { badge: 'bg-teal-100 text-teal-700',   icon: Activity,   border: 'border-teal-200' },
};

const PRIORITY_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#0d9488' };

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

// ─── Sub-Components ───────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, delay, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className={`text-3xl font-black mt-1 ${color}`}>{value ?? '—'}</p>
        {subtitle && <p className="text-[10px] text-gray-400 mt-1 font-medium">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon size={22} className={color} />
      </div>
    </div>
  </motion.div>
);

const SkeletonCard = ({ h = 'h-28' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 animate-pulse ${h}`} />
);

// ─── Main Page ────────────────────────────────────────────────────────
const PublicAnalyticsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const closeDropdown = () => setIsDropdownOpen(false);
    if (isDropdownOpen) window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, [isDropdownOpen]);

  const fetchStats = async (filter = 'all') => {
    try {
      setLoadingStats(true);
      const params = filter !== 'all' ? { filter } : {};
      const res = await complaintAPI.getStats(params);
      if (res.data?.success) setStats(res.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchMyComplaints = async () => {
    try {
      setLoadingMine(true);
      const res = await complaintAPI.getAll({ mine: 'true' });
      if (res.data?.success) setMyComplaints(res.data.data || []);
    } catch (err) {} finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    fetchStats(timeFilter);
    fetchMyComplaints();
  }, [timeFilter]);

  // ─── PDF Functions ───────────────────────────────────────────────
  const generatePersonalReportPDF = async (filterType) => {
    setIsGenerating(true);
    const isExecutive = ["admin", "mayor"].includes(user?.role);
    try {
      // If executive, get all complaints (city-wide), else get only mine
      const res = await complaintAPI.getAll({ 
        mine: isExecutive ? 'false' : 'true', 
        filter: filterType 
      });
      const complaints = res.data.data || [];
      if (complaints.length === 0) return toast.error('No complaints found.');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(22);
      doc.setTextColor(13, 148, 136);
      
      const reportTitle = isExecutive ? 'City-Wide Intelligence Report' : 'Somadhan Personal Activity Report';
      doc.text(reportTitle, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      const subtitle = isExecutive ? `Generated by: Mayor ${user?.name}` : `Citizen: ${user?.name}`;
      doc.text(`${subtitle} | Period: ${filterType.toUpperCase()}`, pageWidth / 2, 28, { align: 'center' });

      const resCount = complaints.filter(c => c.status === 'resolved').length;
      const ipCount = complaints.filter(c => c.status === 'in-progress').length;

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: [
          ['Total Submitted', complaints.length],
          ['Successfully Resolved', resCount],
          ['Currently In-Progress', ipCount],
          ['Resolution Rate', `${complaints.length > 0 ? Math.round((resCount/complaints.length)*100) : 0}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }
      });

      const rows = complaints.map(c => [c.ticketId, c.title, c.category, c.status.toUpperCase(), new Date(c.createdAt).toLocaleDateString()]);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Ticket ID', 'Title', 'Category', 'Status', 'Date']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 8 }
      });

      doc.save(`My_Somadhan_Report_${filterType}.pdf`);
      toast.success('Report downloaded!');
    } catch (err) {
      toast.error('PDF Error');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCasePDF = (complaint) => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(13, 148, 136);
      doc.text('Official Complaint Record', 14, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['Field', 'Details']],
        body: [
          ['Citizen Name', user?.name || 'N/A'],
          ['Ticket ID', complaint.ticketId],
          ['Title', complaint.title],
          ['Category', complaint.category],
          ['Status', complaint.status.toUpperCase()],
          ['Priority', complaint.priority],
          ['Date Filed', new Date(complaint.createdAt).toLocaleString()],
        ],
        theme: 'plain',
        columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
      });

      doc.setFontSize(12);
      doc.text('Description:', 14, doc.lastAutoTable.finalY + 10);
      doc.setFontSize(10);
      const splitDesc = doc.splitTextToSize(complaint.description, 180);
      doc.text(splitDesc, 14, doc.lastAutoTable.finalY + 16);

      doc.save(`Case_${complaint.ticketId}.pdf`);
      toast.success('Case Record Saved!');
    } catch (err) {
      toast.error('Download Failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const resolutionRate = stats && stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const pendingCountTotal = stats ? stats.total - stats.resolved - stats.inProgress : 0;

  // Data for Charts
  const deptData = stats?.departments ? Object.entries(stats.departments).map(([key, d]) => ({
    name: DEPT_CONFIG[key]?.label || key,
    total: d.total,
    resolved: d.resolved,
    critical: d.critical,
    fill: DEPT_CONFIG[key]?.chart || '#94a3b8'
  })) : [];

  const priorityData = stats ? [
    { name: 'Critical', value: stats.critical, fill: PRIORITY_COLORS.Critical },
    { name: 'High', value: 15, fill: PRIORITY_COLORS.High }, 
    { name: 'Medium', value: 25, fill: PRIORITY_COLORS.Medium },
    { name: 'Low', value: 40, fill: PRIORITY_COLORS.Low },
  ] : [];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-slate-900 to-teal-900 p-8 rounded-[2.5rem] shadow-2xl text-white">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Activity className="text-teal-400" />
              <T en="City Intelligence & Reports" />
            </h1>
            <p className="text-teal-100/60 text-sm max-w-md"><T en="Real-time transparency into city operations and your personal civic impact." /></p>
          </div>
          
          <div className="flex gap-3 relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-white text-slate-900 hover:bg-teal-50 transition-all shadow-xl"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
              <T en="Generate Official PDF" />
              <ChevronRight size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-3 w-60 bg-white rounded-[1.5rem] shadow-2xl border border-gray-100 py-3 z-[100] text-gray-900 overflow-hidden"
                >
                  <p className="px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Scope</p>
                  {['monthly', 'yearly', 'all'].map((opt) => (
                    <button 
                      key={opt} onClick={() => { setIsDropdownOpen(false); generatePersonalReportPDF(opt); }}
                      className="w-full text-left px-5 py-3.5 text-sm font-bold hover:bg-teal-50 hover:text-teal-600 capitalize flex items-center justify-between group"
                    >
                      {opt} Summary
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Good Citizen Spotlight ── */}
        {!loadingStats && stats?.goodCitizen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 border border-amber-200 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-amber-500/5"
          >
            <div className="flex items-center gap-6">
               <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
                     {stats.goodCitizen.avatar ? (
                       <img src={`${API_BASE}${stats.goodCitizen.avatar}`} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-3xl">
                          {stats.goodCitizen.name.charAt(0)}
                       </div>
                     )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
                     <GoodCitizenStar size={24} />
                  </div>
               </div>
               <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-200">Featured Spotlight</span>
                    <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
                  </div>
                  <h2 className="text-2xl font-black text-amber-900 mt-2">
                     {stats.goodCitizen.name}
                  </h2>
                  <p className="text-amber-700 font-medium">Good Citizen of the Month</p>
               </div>
            </div>
            
            <div className="flex items-center gap-12 bg-white/50 backdrop-blur-sm px-10 py-6 rounded-3xl border border-white">
               <div className="text-center">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Reputation</p>
                  <p className="text-2xl font-black text-amber-900 leading-none">{stats.goodCitizen.points}</p>
               </div>
               <div className="w-px h-10 bg-amber-200" />
               <div className="text-center">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Impact Rank</p>
                  <p className="text-2xl font-black text-amber-900 leading-none">#1</p>
               </div>
            </div>
          </motion.div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingStats ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />) : (
            <>
              <StatCard icon={FileText} label="Total Volume" value={stats?.total} color="text-blue-600" bg="bg-blue-50" subtitle="City-wide submissions" />
              <StatCard icon={CheckCircle2} label="Resolved" value={stats?.resolved} color="text-emerald-600" bg="bg-emerald-50" subtitle={`${resolutionRate}% total efficiency`} />
              <StatCard icon={Clock} label="In Progress" value={stats?.inProgress} color="text-indigo-600" bg="bg-indigo-50" subtitle="Active investigations" />
              <StatCard icon={AlertTriangle} label="Critical" value={stats?.critical} color="text-red-600" bg="bg-red-50" subtitle="Immediate priority" />
            </>
          )}
        </div>

        {/* ── Overall Resolution Rate ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600"><TrendingUp size={20} /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Overall City Resolution Velocity</h3>
                <p className="text-xs text-gray-400 font-medium">Aggregated performance across all departments</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-teal-600 leading-none">{resolutionRate}%</span>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Success Rate</p>
            </div>
          </div>
          <div className="w-full h-4 bg-gray-50 rounded-full overflow-hidden border border-gray-100 mt-4 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${resolutionRate}%` }}
              transition={{ duration: 1.5, ease: 'circOut' }}
              className="h-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-full border-t border-dashed border-white" />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stats?.resolved} Resolved</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400" /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stats?.inProgress} In-Progress</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-300" /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{pendingCountTotal} Pending</span></div>
            </div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stats?.total} Records Analyzed</span>
          </div>
        </motion.div>

        {/* ── Charts Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-8 uppercase tracking-wider text-sm"><Target size={18} className="text-teal-500" />Departmental Load Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-8 uppercase tracking-wider text-sm"><PieChartIcon size={18} className="text-teal-500" />Priority Spectrum</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {priorityData.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Detailed Department Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats?.departments && Object.entries(stats.departments).map(([key, dept]) => {
            const cfg = DEPT_CONFIG[key] || { label: key, icon: Activity, color: 'text-gray-600', bg: 'bg-gray-50', bar: 'bg-gray-500' };
            const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
            return (
              <motion.div key={key} whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg}`}><cfg.icon size={24} className={cfg.color} /></div>
                  <div><p className="font-black text-gray-900 leading-tight">{cfg.label}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{dept.total} Total Cases</p></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Resolution</span><span className={cfg.color}>{rate}%</span></div>
                  <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100"><motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 1 }} className={`h-full ${cfg.bar}`} /></div>
                  <div className="flex justify-between pt-2">
                    <div className="text-center"><p className="text-sm font-black text-gray-900">{dept.resolved}</p><p className="text-[8px] font-bold text-gray-400 uppercase">Resolved</p></div>
                    <div className="text-center"><p className="text-sm font-black text-blue-600">{dept.inProgress}</p><p className="text-[8px] font-bold text-gray-400 uppercase">Active</p></div>
                    <div className="text-center"><p className="text-sm font-black text-red-500">{dept.critical}</p><p className="text-[8px] font-bold text-gray-400 uppercase">Critical</p></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── My Personal Activity ── */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 bg-slate-50/50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3"><Users size={24} className="text-teal-600" />My Personal Impact</h2>
            <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100">Verified Activity</span>
          </div>
          
          <div className="p-8">
            {loadingMine ? <SkeletonCard h="h-40" /> : myComplaints.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium italic">No personal activity recorded yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {myComplaints.slice(0, 6).map((c) => {
                  const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                  const theme = PRIORITY_THEME[c.priority] || PRIORITY_THEME.Medium;
                  const PriIcon = theme.icon;

                  return (
                    <motion.div 
                      key={c._id} 
                      whileHover={{ scale: 1.01 }}
                      className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/5 transition-all flex items-center justify-between relative overflow-hidden"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-50 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors`}>
                          <PriIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${theme.badge} border ${theme.border}`}>
                              {c.priority}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${sc.badge}`}>
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 truncate">{c.title}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                            <span className="text-slate-300">#{c.ticketId}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                            {c.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 z-10">
                        <button onClick={(e) => { e.stopPropagation(); generateCasePDF(c); }} className="p-3 bg-slate-50 text-slate-400 hover:bg-teal-600 hover:text-white rounded-xl transition-all shadow-sm" title="Download Report">
                          <Download size={16} />
                        </button>
                        <button onClick={() => navigate(`/complaints/${c._id}`)} className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {myComplaints.length > 6 && (
              <button onClick={() => navigate('/my-complaints')} className="w-full mt-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.99]">
                View Full Personal Ledger ({myComplaints.length} Records)
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PublicAnalyticsPage;
