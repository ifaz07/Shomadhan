import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Tag,
  Building2,
  ArrowRight,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { complaintAPI } from "../services/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import T from "../components/T";

// ─── Config ───────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  Critical: { badge: "bg-red-500 text-white", dot: "bg-red-500" },
  High: { badge: "bg-orange-500 text-white", dot: "bg-orange-500" },
  Medium: { badge: "bg-yellow-500 text-white", dot: "bg-yellow-500" },
  Low: { badge: "bg-green-500 text-white", dot: "bg-green-500" },
};

const STATUS_CONFIG = {
  pending: {
    badge: "bg-gray-100 text-gray-600",
    label: "Pending",
    icon: Clock,
    ring: "ring-gray-200",
  },
  "in-progress": {
    badge: "bg-blue-100 text-blue-700",
    label: "In Progress",
    icon: RefreshCw,
    ring: "ring-blue-200",
  },
  resolved: {
    badge: "bg-green-100 text-green-700",
    label: "Resolved",
    icon: CheckCircle2,
    ring: "ring-green-200",
  },
  rejected: {
    badge: "bg-red-100 text-red-700",
    label: "Rejected",
    icon: XCircle,
    ring: "ring-red-200",
  },
};

const CATEGORY_LABEL = {
  Road: "Road & Infrastructure",
  Waste: "Sanitation & Waste",
  Electricity: "Electricity",
  Water: "Water Supply",
  Safety: "Public Safety",
  Environment: "Environment",
  Other: "Other",
};

const DEPT_LABEL = {
  public_works: "Public Works",
  water_authority: "Water Authority",
  electricity: "Electricity Dept",
  sanitation: "Sanitation Dept",
  public_safety: "Public Safety",
  animal_control: "Animal Control",
};

// Status steps in order
const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "assigned", label: "Assigned" },
  { key: "in-progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

const getStepIndex = (status) => {
  if (status === "rejected") return 1;
  if (status === "pending") return 0;
  if (status === "in-progress") return 2;
  if (status === "resolved") return 3;
  return 0;
};

// ─── Helpers ──────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getSlaInfo = (createdAt, slaDeadline) => {
  if (!slaDeadline) return null;
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const deadline = new Date(slaDeadline).getTime();
  const total = deadline - created;
  const elapsed = now - created;
  const progress = Math.min(
    100,
    Math.max(0, Math.round((elapsed / total) * 100)),
  );
  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  return { progress, daysLeft };
};

// ─── Status Stepper ───────────────────────────────────────────────────
const StatusStepper = ({ status }) => {
  const currentStep = getStepIndex(status);
  const isRejected = status === "rejected";

  return (
    <div className="flex items-center gap-0 mt-4">
      {STEPS.map((step, i) => {
        const done = i <= currentStep && !isRejected;
        const current = i === currentStep && !isRejected;
        const rejected = isRejected && i === 1;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  rejected
                    ? "border-red-400 bg-red-100"
                    : done
                      ? current && status !== "resolved"
                        ? "border-blue-500 bg-blue-500"
                        : "border-teal-500 bg-teal-500"
                      : "border-gray-200 bg-white"
                }`}
              >
                {rejected ? (
                  <XCircle size={12} className="text-red-500" />
                ) : done ? (
                  <CheckCircle2 size={12} className="text-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium text-center leading-tight whitespace-nowrap ${
                  rejected
                    ? "text-red-500"
                    : done
                      ? current && status !== "resolved"
                        ? "text-blue-600"
                        : "text-teal-600"
                      : "text-gray-300"
                }`}
              >
                <T en={step.label} />
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 mx-1 transition-all ${
                  i < currentStep && !isRejected ? "bg-teal-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium">
          <T en={label} />
        </p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}
      >
        <Icon size={20} className={color} />
      </div>
    </div>
  </motion.div>
);

// ─── Complaint Card ───────────────────────────────────────────────────
const ComplaintCard = ({ complaint, index, onView }) => {
  const [expanded, setExpanded] = useState(false);

  const pCfg = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.Low;
  const sCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending;
  const sla = getSlaInfo(complaint.createdAt, complaint.slaDeadline);
  const history = complaint.history || [];
  const isResolved = complaint.status === "resolved";
  const catLabel = CATEGORY_LABEL[complaint.category] || complaint.category;
  const deptLabel = DEPT_LABEL[complaint.department] || complaint.department;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
    >
      {/* ── Top accent bar ── */}
      <div
        className={`h-1 w-full ${
          isResolved
            ? "bg-green-500"
            : complaint.priority === "Critical"
              ? "bg-red-500"
              : complaint.priority === "High"
                ? "bg-orange-500"
                : complaint.priority === "Medium"
                  ? "bg-yellow-500"
                  : "bg-green-500"
        }`}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {!isResolved && (
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold ${pCfg.badge}`}
              >
                {complaint.priority}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold ${sCfg.badge}`}
            >
              <T en={sCfg.label} />
            </span>
            {complaint.ticketId && (
              <span className="text-xs font-mono text-gray-400">
                {complaint.ticketId}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {timeAgo(complaint.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-sm mb-2 leading-snug">
          {complaint.title}
        </h3>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-1">
          {complaint.category && (
            <span className="flex items-center gap-1">
              <Tag size={11} className="text-gray-400" />
              <T en={catLabel} />
            </span>
          )}
          {complaint.department && (
            <span className="flex items-center gap-1">
              <Building2 size={11} className="text-gray-400" />
              <T en={deptLabel} />
            </span>
          )}
          {complaint.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-gray-400" />
              {complaint.location}
            </span>
          )}
        </div>

        {/* Status stepper */}
        <StatusStepper status={complaint.status} />

        {/* SLA bar */}
        {sla &&
          complaint.status !== "resolved" &&
          complaint.status !== "rejected" && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>
                  SLA:{" "}
                  <span
                    className={
                      sla.daysLeft <= 0
                        ? "text-red-600 font-semibold"
                        : sla.daysLeft <= 2
                          ? "text-orange-600 font-medium"
                          : "text-gray-500"
                    }
                  >
                    {sla.daysLeft > 0 ? (
                      <>
                        {sla.daysLeft} <T en="days left" />
                      </>
                    ) : (
                      <T en="Overdue" />
                    )}
                  </span>
                </span>
                <span>{sla.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    sla.daysLeft <= 0
                      ? "bg-red-500"
                      : sla.daysLeft <= 2
                        ? "bg-orange-500"
                        : "bg-gray-700"
                  }`}
                  style={{ width: `${sla.progress}%` }}
                />
              </div>
            </div>
          )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              <T en="Submitted" /> {formatDate(complaint.createdAt)}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <ThumbsUp size={11} className="text-gray-400" />
              {complaint.voteCount ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? <T en="Hide" /> : <T en="History" />}
              </button>
            )}
            <button
              onClick={() => onView(complaint._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <T en="View Details" />
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Expandable history */}
        <AnimatePresence>
          {expanded && history.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  <T en="Status History" />
                </p>
                {history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-gray-700">
                        {h.message || h.status}
                      </span>
                      {h.updatedAt && (
                        <span className="text-[10px] text-gray-400 ml-2">
                          {formatDate(h.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────
const EmptyState = ({ tab, onSubmit }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"
  >
    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
      <FileText size={28} className="text-teal-400" />
    </div>
    <h3 className="font-semibold text-gray-800 text-base mb-1">
      {tab === "All" ? (
        <T en="No complaints yet" />
      ) : (
        <>
          <T en="No" /> {tab.toLowerCase()} <T en="complaints" />
        </>
      )}
    </h3>
    <p className="text-sm text-gray-400 text-center max-w-xs mb-5">
      {tab === "All" ? (
        <T en="You haven't submitted any complaints yet. Help improve your community by reporting an issue." />
      ) : (
        <>
          <T en="You don't have any complaints with" /> "{tab}"{" "}
          <T en="status." />
        </>
      )}
    </p>
    {tab === "All" && (
      <button
        onClick={onSubmit}
        className="px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
      >
        <T en="Submit Your First Complaint" />
      </button>
    )}
  </motion.div>
);

// ─── Tabs ─────────────────────────────────────────────────────────────
const TABS = ["All", "Pending", "In Progress", "Resolved", "Rejected"];

// ─── Main Page ────────────────────────────────────────────────────────
const MyComplaintsPage = () => {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  const fetchComplaints = () => {
    setLoading(true);
    complaintAPI
      .getAll({ mine: true })
      .then((r) => {
        const raw = r.data.data;
        setComplaints(Array.isArray(raw) ? raw : raw?.complaints || []);
      })
      .catch(() => toast.error("Failed to load your complaints"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter(
    (c) => c.status === "in-progress",
  ).length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const rejected = complaints.filter((c) => c.status === "rejected").length;

  const tabCounts = {
    All: total,
    Pending: pending,
    "In Progress": inProgress,
    Resolved: resolved,
    Rejected: rejected,
  };

  const filtered =
    activeTab === "All"
      ? complaints
      : complaints.filter((c) => {
          if (activeTab === "Pending") return c.status === "pending";
          if (activeTab === "In Progress") return c.status === "in-progress";
          if (activeTab === "Resolved") return c.status === "resolved";
          if (activeTab === "Rejected") return c.status === "rejected";
          return true;
        });

  return (
    <DashboardLayout>
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <T en="My Complaints" />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <T en="Track the status and progress of all your submitted complaints" />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchComplaints}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => navigate("/submit-complaint")}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
          >
            <FileText size={15} />
            <T en="New Complaint" />
          </button>
        </div>
      </motion.div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={FileText}
          label="Total Submitted"
          value={total}
          color="text-gray-800"
          bg="bg-gray-100"
          delay={0.05}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={pending}
          color="text-gray-600"
          bg="bg-gray-100"
          delay={0.1}
        />
        <StatCard
          icon={RefreshCw}
          label="In Progress"
          value={inProgress}
          color="text-blue-600"
          bg="bg-blue-50"
          delay={0.15}
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={resolved}
          color="text-green-600"
          bg="bg-green-50"
          delay={0.2}
        />
      </div>

      {/* ── Resolution rate ─────────────────────────────────────── */}
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              <T en="Overall Resolution Rate" />
            </span>
            <span className="text-sm font-bold text-teal-600">
              {total > 0 ? Math.round((resolved / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-700"
              style={{
                width: `${total > 0 ? Math.round((resolved / total) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-xs text-gray-400">
            <span>
              {resolved} <T en="resolved out of" /> {total} <T en="submitted" />
            </span>
            {rejected > 0 && (
              <span className="text-red-400">
                {rejected} <T en="rejected" />
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <T en={tab} />
            {tabCounts[tab] > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab
                    ? tab === "Rejected"
                      ? "bg-red-100 text-red-600"
                      : tab === "In Progress"
                        ? "bg-blue-100 text-blue-600"
                        : tab === "Resolved"
                          ? "bg-teal-100 text-teal-600"
                          : "bg-gray-100 text-gray-600"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Complaint List ───────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">
            <T en="Loading your complaints…" />
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          tab={activeTab}
          onSubmit={() => navigate("/submit-complaint")}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((c, i) => (
            <ComplaintCard
              key={c._id}
              complaint={c}
              index={i}
              onView={(id) =>
                navigate(`/complaints/${id}`, {
                  state: { from: "/my-complaints", label: "My Complaints" },
                })
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyComplaintsPage;
