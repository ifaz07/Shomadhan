import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Flame,
  ArrowRight,
  Loader2,
  Filter,
  ExternalLink,
  MapPin,
  Tag,
} from "lucide-react";
import { servantAPI, complaintAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ServantLayout from "../../components/layout/ServantLayout";
import T from "../../components/T";

const DEPT_DISPLAY = {
  public_works: "Public Works",
  water_authority: "Water Authority",
  electricity: "Electricity Dept",
  sanitation: "Sanitation Dept",
  public_safety: "Public Safety Dept",
  animal_control: "Animal Control",
  environment: "Environment Dept",
  health: "Health Dept",
  transport: "Transport Dept",
  police: "Police Department",
};

const PRIORITY_CONFIG = {
  Critical: { badge: "bg-red-500 text-white", border: "border-red-400" },
  High: { badge: "bg-orange-500 text-white", border: "border-orange-400" },
  Medium: { badge: "bg-yellow-500 text-white", border: "border-yellow-400" },
  Low: { badge: "bg-green-500 text-white", border: "border-green-400" },
};

const CATEGORY_LABEL = {
  Road: "Road & Infrastructure",
  Waste: "Sanitation & Waste",
  Electricity: "Electricity",
  Water: "Water Supply",
  Safety: "Public Safety",
  Environment: "Environment",
  "Law Enforcement": "Law Enforcement",
  Other: "Other",
  public_works: "Public Works",
  water_authority: "Water Authority",
  sanitation: "Sanitation Dept",
  public_safety: "Public Safety Dept",
  animal_control: "Animal Control",
  health: "Health Dept",
  transport: "Transport Dept",
  environment: "Environment Dept",
  police: "Police Department",
};

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

const STATUS_STYLE = {
  pending: { bg: "bg-gray-100", text: "text-gray-600", label: "Pending" },
  "in-progress": {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "In Progress",
  },
  resolved: { bg: "bg-green-100", text: "text-green-700", label: "Resolved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
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
  const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isOverdue = msLeft <= 0;
  const timeLabel = isOverdue
    ? "Overdue"
    : hoursLeft <= 24
      ? `${hoursLeft}h left`
      : `${daysLeft}d left`;
  return { progress, daysLeft, hoursLeft, isOverdue, timeLabel };
};

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-2xl border ${color.border} p-5 flex items-center gap-4`}
  >
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.iconBg}`}
    >
      <Icon size={22} className={color.iconText} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const DepartmentComplaintCard = ({ complaint, index }) => {
  const pCfg = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.Low;
  const sCfg = STATUS_STYLE[complaint.status] || STATUS_STYLE.pending;
  const sla = getSlaInfo(complaint.slaDeadline, complaint.slaDurationHours);
  const isResolved = complaint.status === "resolved";
  const cardBorder = isResolved ? "border-gray-200" : pCfg.border;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${cardBorder} hover:shadow-md transition-all duration-200`}
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
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${sCfg.bg} ${sCfg.text}`}
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
          <Link
            to={`/servant/complaints/${complaint._id}`}
            className="font-bold text-gray-900 text-base mb-1.5 truncate block hover:text-blue-600 transition-colors"
          >
            {complaint.title}
          </Link>

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
              {CATEGORY_LABEL[complaint.category] || complaint.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(complaint.createdAt)}
            </span>
          </div>

          {/* SLA bar */}
          {sla && !isResolved ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span
                  className={
                    sla.isOverdue
                      ? "text-red-600 font-medium"
                      : sla.hoursLeft <= 24
                        ? "text-orange-600 font-medium"
                        : ""
                  }
                >
                  SLA: {sla.timeLabel}
                </span>
                <span>{sla.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${sla.isOverdue ? "bg-red-500" : sla.hoursLeft <= 24 ? "bg-orange-500" : "bg-gray-800"}`}
                  style={{ width: `${sla.progress}%` }}
                />
              </div>
            </div>
          ) : !isResolved ? (
            <p className="mt-3 text-xs text-gray-400 italic">
              No deadline set — awaiting department review
            </p>
          ) : null}

          {/* Link */}
          <Link
            to="/servant/complaints"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
          >
            <ExternalLink size={11} /> Manage in Department Complaints
          </Link>
        </div>

        {/* Public support count (read-only) */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1 text-center">
          <span className="text-base font-bold text-gray-700">
            {complaint.voteCount ?? 0}
          </span>
          <span className="text-[10px] text-gray-400 leading-tight">
            Public
            <br />
            Support
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const ServantDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [complaints, setComplaints] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");

  const fetchComplaints = async () => {
    setListLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (locationFilter.trim()) params.location = locationFilter.trim();
      const res = await complaintAPI.getAll(params);
      const raw = res.data.data;
      setComplaints(Array.isArray(raw) ? raw : raw?.complaints || []);
    } catch {
      setComplaints([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    servantAPI
      .getStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, priorityFilter, locationFilter]);

  const deptLabel = DEPT_DISPLAY[user?.department] || "Department";

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
      <div className="space-y-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:px-8 sm:py-8"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-end">
            <div className="xl:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-100">
                <ClipboardList size={12} className="text-teal-300" />
                Department Control Desk
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
                Manage assigned complaints, monitor SLA pressure, and keep your
                department response moving efficiently.
              </p>
              <p className="hidden mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
                <span className="font-medium text-blue-600">{deptLabel}</span>{" "}
                <T en="Officer · Managing your department's complaints" />
              </p>
            </div>
            <div className="xl:col-span-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm xl:ml-auto xl:max-w-xs">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  {deptLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Review live department workload, active investigations, and
                  resolution progress at a glance.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={<T en="Total Assigned" />}
            value={stats?.total ?? 0}
            icon={ClipboardList}
            color={{
              border: "border-gray-200",
              iconBg: "bg-gray-100",
              iconText: "text-gray-600",
            }}
          />
          <StatCard
            label={<T en="Pending" />}
            value={stats?.pending ?? 0}
            icon={Clock}
            color={{
              border: "border-yellow-200",
              iconBg: "bg-yellow-50",
              iconText: "text-yellow-600",
            }}
          />
          <StatCard
            label={<T en="In Progress" />}
            value={stats?.inProgress ?? 0}
            icon={Flame}
            color={{
              border: "border-blue-200",
              iconBg: "bg-blue-50",
              iconText: "text-blue-600",
            }}
          />
          <StatCard
            label={<T en="Resolved" />}
            value={stats?.resolved ?? 0}
            icon={CheckCircle2}
            color={{
              border: "border-green-200",
              iconBg: "bg-green-50",
              iconText: "text-green-600",
            }}
          />
        </div>

        {/* ── Department Complaint Feed (All) ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                <T en="All Department Complaints" />
              </h2>
              <span className="text-sm text-gray-400">
                ({complaints.length})
              </span>
            </div>
            <Link
              to="/servant/complaints"
              className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline"
            >
              <T en="Manage complaints" /> <ArrowRight size={14} />
            </Link>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            <T en="Read-only overview. Go to Department Complaints to update status or set SLA." />
          </p>

          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Filter size={14} /> <T en="Filters" />
            </span>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">
                <T en="All Status" />
              </option>
              <option value="pending">
                <T en="Pending" />
              </option>
              <option value="in-progress">
                <T en="In Progress" />
              </option>
              <option value="resolved">
                <T en="Resolved" />
              </option>
              <option value="rejected">
                <T en="Rejected" />
              </option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">
                <T en="All Priority" />
              </option>
              <option value="Critical">
                <T en="Critical" />
              </option>
              <option value="High">
                <T en="High" />
              </option>
              <option value="Medium">
                <T en="Medium" />
              </option>
              <option value="Low">
                <T en="Low" />
              </option>
            </select>

            <input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Location..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40"
            />

            <button
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setLocationFilter("");
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              <T en="Reset" />
            </button>
          </div>

          {listLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <T en="No department complaints match these filters" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {complaints.map((c, i) => (
                <DepartmentComplaintCard key={c._id} complaint={c} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ServantLayout>
  );
};

export default ServantDashboardPage;
