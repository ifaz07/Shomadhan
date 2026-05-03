import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileDown, Search, Calendar, BarChart3, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, Loader2, Download,
  FileText, ChevronDown, X, Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import { complaintAPI, reportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getDepartmentLabel, normalizeDepartmentValue } from '../constants/departments';
import { getApiBaseUrl } from '../utils/apiBase';

const API_BASE = getApiBaseUrl();

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
      open:
        typeof item.pendingInProgress === 'number'
          ? item.pendingInProgress
          : Math.max(0, item.total - item.resolved),
    }))
    .sort((a, b) => b.total - a.total);
};

const CountUp = ({ target }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = Math.ceil(target / 30);
    const t = setInterval(() => {
      start += step;
      if (start >= target) {
        setVal(target);
        clearInterval(t);
      } else {
        setVal(start);
      }
    }, 30);
    return () => clearInterval(t);
  }, [target]);

  return <span>{val}</span>;
};

const BarChart = ({ data, max }) => {
  const colors = ['#0d3b4b', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  return (
    <div className="space-y-2 mt-3">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-28 truncate shrink-0">{item.label}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: colors[i % colors.length] }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700 w-8 text-right">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
};

const GaugeRing = ({ pct, label, color = '#10b981' }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <motion.circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="52" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f172a">
          {pct}%
        </text>
      </svg>
      <span className="text-xs font-bold text-slate-500 mt-1">{label}</span>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bg, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`rounded-2xl p-4 ${bg} border border-white/50`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color} bg-white/60`}>
        <Icon size={16} />
      </div>
    </div>
    <p className={`text-3xl font-black ${color}`}>
      <CountUp target={Number(value) || 0} />
    </p>
  </motion.div>
);

const ReportsPage = () => {
  const { user } = useAuth();
  const isMayor = user?.role === 'mayor';

  const [activeTab, setActiveTab] = useState(isMayor ? 'efficiency' : 'summary');
  const [summaryType, setSummaryType] = useState('monthly');
  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [summaryDownloading, setSummaryDownloading] = useState(false);
  const [efficiencyStats, setEfficiencyStats] = useState(null);
  const [allComplaints, setAllComplaints] = useState([]);
  const [efficiencyLoading, setEfficiencyLoading] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [complaintsListLoading, setComplaintsListLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    setActiveTab(isMayor ? 'efficiency' : 'summary');
  }, [isMayor]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (activeTab !== 'individual') return;
    setComplaintsListLoading(true);
    complaintAPI
      .getAll({ excludeRejected: 'true' })
      .then((r) => {
        const list = Array.isArray(r.data?.data) ? r.data.data : (r.data?.data?.complaints || []);
        setComplaints(list);
      })
      .catch(() => toast.error('Failed to load complaints'))
      .finally(() => setComplaintsListLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'summary') return;

    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const params = { filter: summaryType === 'monthly' ? 'monthly' : 'yearly' };
        const r = await complaintAPI.getStats(params);
        setPreviewData(r.data?.data || null);
      } catch {
        toast.error('Failed to load preview stats');
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();
  }, [activeTab, summaryType]);

  useEffect(() => {
    if (!isMayor || activeTab !== 'efficiency') return;

    const fetchEfficiencyData = async () => {
      setEfficiencyLoading(true);
      try {
        const [statsRes, complaintsRes] = await Promise.all([
          axios.get(`${API_BASE}/mayor/dashboard-stats`, { withCredentials: true }),
          complaintAPI.getAll({ excludeRejected: 'true' }),
        ]);

        if (statsRes.data?.success) {
          setEfficiencyStats(statsRes.data.data);
        }

        const complaintList = Array.isArray(complaintsRes.data?.data)
          ? complaintsRes.data.data
          : (complaintsRes.data?.data?.complaints || []);
        setAllComplaints(complaintList);
      } catch {
        toast.error('Failed to load city efficiency');
      } finally {
        setEfficiencyLoading(false);
      }
    };

    fetchEfficiencyData();
  }, [activeTab, isMayor]);

  const downloadSummary = async () => {
    setSummaryDownloading(true);
    try {
      const params = { type: summaryType, year: selYear, month: selMonth };
      const r = await reportAPI.downloadSummaryReport(params);
      const fname =
        summaryType === 'monthly'
          ? `shomadhan-monthly-${selYear}-${String(selMonth).padStart(2, '0')}.pdf`
          : `shomadhan-yearly-${selYear}.pdf`;
      triggerDownload(r.data, fname);
      toast.success('Report downloaded!');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setSummaryDownloading(false);
    }
  };

  const downloadComplaint = async () => {
    if (!selectedComplaint) return toast.error('Select a complaint first');
    setComplaintLoading(true);
    try {
      const r = await reportAPI.downloadComplaintReport(selectedComplaint._id);
      triggerDownload(r.data, `complaint-${selectedComplaint.ticketId}.pdf`);
      toast.success('Report downloaded!');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setComplaintLoading(false);
    }
  };

  const filtered = complaints.filter(
    (c) =>
      c.ticketId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const tabCls = (t) => `px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
    activeTab === t
      ? 'bg-[#0d3b4b] text-white shadow-lg shadow-[#0d3b4b]/20'
      : 'text-slate-500 hover:bg-white hover:text-[#0d3b4b]'
  }`;

  const total = previewData?.total || 0;
  const resolved = previewData?.resolved || 0;
  const critical = previewData?.critical || 0;
  const inProgress = previewData?.inProgress || 0;
  const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const deptData = previewData?.departments
    ? Object.entries(previewData.departments)
        .map(([k, v]) => ({ label: k, value: v.total || 0 }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
    : [];

  const efficiencyDepartmentStats = normalizeDepartmentStats(
    efficiencyStats?.departments?.length > 0
      ? efficiencyStats.departments
      : buildDepartmentStats(allComplaints),
  );
  const topDepartment = efficiencyDepartmentStats[0];
  const averageEfficiency = efficiencyDepartmentStats.length
    ? Math.round(
        efficiencyDepartmentStats.reduce((sum, dept) => sum + dept.rate, 0) /
          efficiencyDepartmentStats.length,
      )
    : 0;

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 px-0 sm:px-1">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-gradient-to-br from-[#0d3b4b] via-slate-800 to-blue-900 px-8 py-8 text-white shadow-xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileDown size={20} className="text-[#a1824a]" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-200">
              Report Centre
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2"> City Operations </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Generate downloadable PDF reports - individual complaint case files or aggregated
            city-wide summaries with charts, SLA data, and executive metrics.
          </p>
        </motion.div>

        <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-2 flex flex-wrap gap-2">
          {isMayor && (
            <button onClick={() => setActiveTab('efficiency')} className={tabCls('efficiency')}>
              <span className="flex items-center gap-2">
                <TrendingUp size={15} /> City Efficiency
              </span>
            </button>
          )}
          <button onClick={() => setActiveTab('summary')} className={tabCls('summary')}>
            <span className="flex items-center gap-2">
              <BarChart3 size={15} /> Summary Reports
            </span>
          </button>
          <button onClick={() => setActiveTab('individual')} className={tabCls('individual')}>
            <span className="flex items-center gap-2">
              <FileText size={15} /> Individual Case Report
            </span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isMayor && activeTab === 'efficiency' && (
            <motion.div
              key="efficiency"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="space-y-5"
            >
              {efficiencyLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-[#0d3b4b]" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-[1.75rem] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">
                        Highest Coverage
                      </p>
                      <h3 className="mt-3 text-2xl font-black text-slate-900">{topDepartment?.label || 'N/A'}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Leading complaint volume currently tracked in the city-wide operations view.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
                        Average Resolution Rate
                      </p>
                      <h3 className="mt-3 text-3xl font-black text-slate-900">{averageEfficiency}%</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Average share of resolved complaints across the listed city service groups.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                        Departments Tracked
                      </p>
                      <h3 className="mt-3 text-3xl font-black text-slate-900">{efficiencyDepartmentStats.length}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Normalized from both legacy complaint categories and current department assignments.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.9rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">City Efficiency Board</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Department performance is based on resolved complaints compared with the total complaints assigned to each service group.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span className="font-black text-slate-900">{efficiencyStats?.slaCompliance?.exceeded || 0}</span>{' '}
                        active complaints have already crossed SLA.
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      {efficiencyDepartmentStats.map((dept) => (
                        <div key={dept._id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">{dept.label}</p>
                              <p className="mt-2 text-3xl font-black text-slate-900">{dept.rate}%</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {dept.resolved} resolved out of {dept.total} complaints
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white bg-white px-4 py-3 text-right shadow-sm">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                Open Cases
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
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="space-y-5"
            >
              <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-[#a1824a]" /> Report Configuration
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Report Type</label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200">
                      {['monthly', 'yearly'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setSummaryType(t)}
                          className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                            summaryType === t ? 'bg-[#0d3b4b] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Year</label>
                    <select
                      value={selYear}
                      onChange={(e) => setSelYear(+e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d3b4b]/20"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {summaryType === 'monthly' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Month</label>
                      <select
                        value={selMonth}
                        onChange={(e) => setSelMonth(+e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d3b4b]/20"
                      >
                        {months.map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  onClick={downloadSummary}
                  disabled={summaryDownloading}
                  className="mt-5 flex items-center gap-2 bg-[#a1824a] hover:bg-[#8a6e3e] text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#a1824a]/20 disabled:opacity-60"
                >
                  {summaryDownloading ? (
                    <>
                      <Loader2 size={17} className="animate-spin" /> Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download size={17} /> Download {summaryType === 'monthly' ? months[selMonth - 1] : selYear} Report
                    </>
                  )}
                </button>
              </div>

              <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-[#a1824a]" /> Live Data Preview
                  </h2>
                  {previewLoading && <Loader2 size={18} className="animate-spin text-[#0d3b4b]" />}
                </div>

                {previewLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={28} className="animate-spin text-[#0d3b4b]" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <StatCard icon={FileText} label="Total" value={total} color="text-[#0d3b4b]" bg="bg-slate-50" delay={0} />
                      <StatCard icon={CheckCircle2} label="Resolved" value={resolved} color="text-emerald-600" bg="bg-emerald-50" delay={0.05} />
                      <StatCard icon={AlertTriangle} label="Critical" value={critical} color="text-red-600" bg="bg-red-50" delay={0.1} />
                      <StatCard icon={Clock} label="In Progress" value={inProgress} color="text-blue-600" bg="bg-blue-50" delay={0.15} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-50 rounded-2xl p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Performance Gauges</p>
                        <div className="flex gap-6 justify-center flex-wrap">
                          <GaugeRing pct={resRate} label="Resolution Rate" color="#10b981" />
                          <GaugeRing pct={total > 0 ? Math.round((critical / total) * 100) : 0} label="Critical Rate" color="#ef4444" />
                          <GaugeRing pct={total > 0 ? Math.round((inProgress / total) * 100) : 0} label="In-Progress" color="#3b82f6" />
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Department Breakdown</p>
                        {deptData.length > 0 ? (
                          <BarChart data={deptData} max={Math.max(...deptData.map((d) => d.value))} />
                        ) : (
                          <p className="text-sm text-slate-400 italic mt-4">No department data available.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 bg-[#0d3b4b]/5 rounded-2xl p-4">
                      <p className="text-xs font-bold text-[#0d3b4b] uppercase tracking-wider mb-2">
                        This PDF will include:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          'Executive Summary', 'Priority Distribution', 'Status Breakdown',
                          'SLA Compliance', 'Department Performance Board', 'Top Upvoted Cases',
                          'Good Citizen Award', 'Performance Metrics', 'Bar Charts & Tables',
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CheckCircle2 size={11} className="text-emerald-500 shrink-0" /> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'individual' && (
            <motion.div
              key="individual"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-5"
            >
              <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Search size={18} className="text-[#a1824a]" /> Select Complaint
                </h2>

                <div ref={dropRef} className="relative">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0d3b4b]/20">
                    <Search size={16} className="ml-3 text-slate-400 shrink-0" />
                    <input
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      placeholder="Search by ticket ID or title..."
                      className="flex-1 px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none bg-transparent"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedComplaint(null);
                        }}
                        className="mr-2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={15} />
                      </button>
                    )}
                    <ChevronDown size={15} className="mr-3 text-slate-400" />
                  </div>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto"
                      >
                        {complaintsListLoading ? (
                          <div className="flex justify-center py-6">
                            <Loader2 size={20} className="animate-spin text-[#0d3b4b]" />
                          </div>
                        ) : filtered.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-6 italic">No complaints found.</p>
                        ) : (
                          filtered.map((c) => (
                            <button
                              key={c._id}
                              onClick={() => {
                                setSelectedComplaint(c);
                                setSearchTerm(c.ticketId);
                                setDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-[#0d3b4b]">{c.ticketId}</p>
                                  <p className="text-xs text-slate-500 truncate max-w-xs">{c.title}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.status === 'resolved'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : c.status === 'in-progress'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {c.status}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {selectedComplaint && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-2xl border border-[#0d3b4b]/10 bg-[#0d3b4b]/5 p-5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-[#a1824a] uppercase tracking-widest">{selectedComplaint.ticketId}</p>
                          <h3 className="text-base font-black text-[#0d3b4b] mt-0.5">{selectedComplaint.title}</h3>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                          selectedComplaint.priority === 'Critical'
                            ? 'bg-red-100 text-red-700'
                            : selectedComplaint.priority === 'High'
                              ? 'bg-orange-100 text-orange-700'
                              : selectedComplaint.priority === 'Medium'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {selectedComplaint.priority}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
                        {[
                          { label: 'Category', val: selectedComplaint.category },
                          { label: 'Status', val: selectedComplaint.status },
                          { label: 'Location', val: selectedComplaint.location || 'N/A' },
                          { label: 'Upvotes', val: selectedComplaint.voteCount ?? 0 },
                          { label: 'Emergency', val: selectedComplaint.emergencyFlag ? 'Yes' : 'No' },
                          { label: 'Anonymous', val: selectedComplaint.isAnonymous ? 'Yes' : 'No' },
                        ].map((row) => (
                          <div key={row.label} className="bg-white rounded-xl p-2.5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{row.label}</p>
                            <p className="font-bold text-slate-800 mt-0.5 truncate">{String(row.val)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#0d3b4b]/5 rounded-xl p-3 mb-4">
                        <p className="text-[10px] font-bold text-[#0d3b4b] uppercase mb-2">This PDF will include:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            'Case Overview', 'Reporter Information', 'Full Description',
                            'SLA & Deadline Tracking', 'Public Engagement', 'AI Analysis Results',
                            'Escalation Records', 'Status History Timeline', 'Evidence References',
                          ].map((it) => (
                            <div key={it} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <CheckCircle2 size={11} className="text-emerald-500 shrink-0" /> {it}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={downloadComplaint}
                        disabled={complaintLoading}
                        className="w-full flex items-center justify-center gap-2 bg-[#0d3b4b] hover:bg-[#1a5260] text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#0d3b4b]/20 disabled:opacity-60"
                      >
                        {complaintLoading ? (
                          <>
                            <Loader2 size={17} className="animate-spin" /> Generating PDF...
                          </>
                        ) : (
                          <>
                            <Download size={17} /> Download Case Report - {selectedComplaint.ticketId}
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!selectedComplaint && (
                  <div className="mt-6 text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                    <FileDown size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-400">Search and select a complaint above</p>
                    <p className="text-xs text-slate-300 mt-1">A detailed PDF with full case history will be generated</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
