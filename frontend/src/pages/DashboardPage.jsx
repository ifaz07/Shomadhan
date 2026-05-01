import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ThumbsUp,
  MapPin,
  Tag,
  Filter,
  Search,
  Navigation,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { complaintAPI } from "../services/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import T from "../components/T";
import { getDepartmentLabel } from "../constants/departments";
import { useAuth } from "../context/AuthContext";

// ─── Config ───────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  Critical: { badge: "bg-red-500 text-white", border: "border-red-400" },
  High: { badge: "bg-orange-500 text-white", border: "border-orange-400" },
  Medium: { badge: "bg-yellow-500 text-white", border: "border-yellow-400" },
  Low: { badge: "bg-green-500 text-white", border: "border-green-400" },
};

const STATUS_CONFIG = {
  pending: { badge: "bg-gray-100 text-gray-600", label: "Pending" },
  "in-progress": { badge: "bg-blue-100 text-blue-700", label: "In Progress" },
  resolved: { badge: "bg-green-100 text-green-700", label: "Resolved" },
  rejected: { badge: "bg-red-100 text-red-700", label: "Rejected" },
};


// ─── Helpers ──────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const getSlaInfo = (slaDeadline, slaDurationHours) => {
  if (!slaDeadline || !slaDurationHours) return null;
  const now = Date.now();
  const deadline = new Date(slaDeadline).getTime();
  const totalMs = slaDurationHours * 60 * 60 * 1000;
  const slaSetAt = deadline - totalMs;
  const elapsed = Math.max(0, now - slaSetAt);
  const progress = Math.min(
    100,
    Math.max(0, Math.round((elapsed / totalMs) * 100)),
  );
  const msLeft = deadline - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isOverdue = msLeft <= 0;
  return { progress, daysLeft, isOverdue };
};

// ─── Stat Card ────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}
      >
        <Icon size={22} className={color} />
      </div>
    </div>
  </motion.div>
);

// ─── Complaint Card ───────────────────────────────────────────────────
const ComplaintCard = ({ complaint, index, onClick }) => {
  const pCfg = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.Low;
  const sCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending;
  const sla = getSlaInfo(complaint.slaDeadline, complaint.slaDurationHours);
  const isResolved = complaint.status === "resolved";
  const cardBorder = isResolved ? "border-gray-200" : pCfg.border;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onClick(complaint._id)}
      className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${cardBorder} hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.995]`}
    >
      <div className="flex items-start gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {!isResolved && (
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${pCfg.badge}`}
              >
                {complaint.priority}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${sCfg.badge}`}
            >
              {sCfg.label}
            </span>
            {complaint.ticketId && (
              <span className="text-xs text-gray-400 font-mono">
                {complaint.ticketId}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-gray-900 text-base mb-1.5 truncate">
            {complaint.title}
          </h3>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {complaint.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {complaint.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {getDepartmentLabel(complaint.category)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(complaint.createdAt)}
            </span>
          </div>

          {/* SLA */}
          {sla && !isResolved ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>
                  SLA Deadline:{" "}
                  {sla.isOverdue
                    ? "Overdue"
                    : `${sla.daysLeft} day${sla.daysLeft === 1 ? "" : "s"} left`}
                </span>
                <span>{sla.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sla.isOverdue
                      ? "bg-red-500"
                      : sla.daysLeft <= 1
                        ? "bg-red-500"
                        : sla.daysLeft <= 3
                          ? "bg-orange-500"
                          : "bg-gray-800"
                  }`}
                  style={{ width: `${sla.progress}%` }}
                />
              </div>
            </div>
          ) : !isResolved ? (
            <p className="mt-3 text-xs text-gray-400 italic">
              No deadline assigned yet
            </p>
          ) : null}
        </div>

        {/* Upvotes */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1">
          <ThumbsUp size={18} className="text-gray-400" />
          <span className="text-base font-bold text-gray-800 leading-tight">
            {complaint.voteCount ?? 0}
          </span>
          <span className="text-xs text-gray-400">Upvotes</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────────────
const DashboardPage = () => {
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationSearch, setLocationSearch] = useState("");
  const [nearMode, setNearMode] = useState(false); // GPS near-me mode

  // Fetch stats once on mount
  useEffect(() => {
    complaintAPI
      .getStats()
      .then((r) => setStats(r.data.data || {}))
      .catch(() => {});
  }, []);

  // Fetch complaint list whenever filters change (debounced for location text)
  useEffect(() => {
    if (nearMode) return; // near-me mode manages its own fetch

    clearTimeout(debounceRef.current);
    const doFetch = () => {
      setListLoading(true);
      const params = { excludeRejected: "true" };
      if (priorityFilter !== "All") params.priority = priorityFilter;
      if (statusFilter !== "All") params.status = statusFilter;
      if (locationSearch.trim()) params.location = locationSearch.trim();

      complaintAPI
        .getAll(params)
        .then((r) => {
          const raw = r.data.data;
          setComplaints(Array.isArray(raw) ? raw : raw?.complaints || []);
        })
        .catch(() => toast.error("Failed to load complaints"))
        .finally(() => {
          setLoading(false);
          setListLoading(false);
        });
    };

    // Debounce only when typing location; instant otherwise
    if (locationSearch.trim()) {
      debounceRef.current = setTimeout(doFetch, 500);
    } else {
      doFetch();
    }

    return () => clearTimeout(debounceRef.current);
  }, [priorityFilter, statusFilter, locationSearch, nearMode]);

  // "Near Me" — get GPS then call /complaints/nearby
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setNearMode(true);
    setListLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        complaintAPI
          .getNearby(latitude, longitude, 5, "", {
            priority: priorityFilter !== "All" ? priorityFilter : undefined,
            status: statusFilter !== "All" ? statusFilter : undefined,
          }) // 5 km radius
          .then((r) => {
            const raw = r.data.data;
            setComplaints(Array.isArray(raw) ? raw : []);
            toast.success("Showing complaints within 5 km of you");
          })
          .catch(() => toast.error("Failed to fetch nearby complaints"))
          .finally(() => setListLoading(false));
      },
      () => {
        toast.error(
          "Could not get your location. Please allow location access.",
        );
        setNearMode(false);
        setListLoading(false);
      },
    );
  };

  const clearNearMe = () => {
    setNearMode(false);
    setLocationSearch("");
  };

  const filtered = complaints; // filtering is now done server-side
  const hasActiveFilters =
    nearMode ||
    priorityFilter !== "All" ||
    statusFilter !== "All" ||
    Boolean(locationSearch.trim());
  const headerStats = [
    { label: "Total Complaints", value: stats.total ?? 0, accent: "text-blue-200" },
    { label: "Critical", value: stats.critical ?? 0, accent: "text-red-200" },
    { label: "In Progress", value: stats.inProgress ?? 0, accent: "text-cyan-200" },
    { label: "Resolved", value: stats.resolved ?? 0, accent: "text-emerald-200" },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:px-8 sm:py-8"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-end">
          <div className="xl:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-100">
              <FileText size={12} className="text-teal-300" />
              <T en="Citizen Overview" />
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              <T en="Welcome back" />{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
              <T en="Track active complaints, review local issues around you, and stay updated on which reports are moving forward." />
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

      {/* ─── Filter Bar ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 mb-4 flex flex-wrap items-center gap-3"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
          <Filter size={14} />
          <T en="Filters:" />
        </span>

        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setNearMode(false);
          }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
        >
          <option value="All"><T en="All Priorities" /></option>
          <option value="Critical"><T en="Critical" /></option>
          <option value="High"><T en="High" /></option>
          <option value="Medium"><T en="Medium" /></option>
          <option value="Low"><T en="Low" /></option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setNearMode(false);
          }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
        >
          <option value="All"><T en="All Status" /></option>
          <option value="pending"><T en="Pending" /></option>
          <option value="in-progress"><T en="In Progress" /></option>
          <option value="resolved"><T en="Resolved" /></option>
          <option value="rejected"><T en="Rejected" /></option>
        </select>

        {/* Location text search */}
        {!nearMode && (
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-teal-400">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search location..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="text-sm text-gray-700 outline-none bg-transparent w-36 placeholder-gray-400"
            />
            {locationSearch && (
              <button
                onClick={() => setLocationSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Near Me toggle */}
        {nearMode ? (
          <button
            onClick={clearNearMe}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Navigation size={13} />
            <T en="Near Me" />
            <X size={13} className="ml-0.5" />
          </button>
        ) : (
          <button
            onClick={handleNearMe}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors"
          >
            <Navigation size={13} />
            <T en="Near Me" />
          </button>
        )}

        <span className="ml-auto text-sm text-gray-400 flex items-center gap-2">
          {listLoading && (
            <span className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin inline-block" />
          )}
          <T en="Showing" />{" "}
          <span className="font-medium text-gray-700">{filtered.length}</span>{" "}
          <T en="complaints" />
        </span>
      </motion.div>

      {/* ─── Complaint List ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200"
        >
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {hasActiveFilters
              ? "No complaints match your filters"
              : "No complaints available right now"}
          </p>
          {hasActiveFilters && (
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting the filters above
            </p>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((c, i) => (
            <ComplaintCard
              key={c._id}
              complaint={c}
              index={i}
              onClick={(id) => navigate(`/complaints/${id}`)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
