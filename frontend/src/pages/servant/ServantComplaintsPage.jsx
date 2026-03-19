import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Filter,
  Loader2,
  CheckCircle2,
  ClipboardList,
  MapPin,
  ThumbsUp,
  Search,
  Timer,
  Tag,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { servantAPI } from "../../services/api";
import ServantLayout from "../../components/layout/ServantLayout";
import T from "../../components/T";

const PRIORITY_STYLE = {
  Critical: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
    dot: "bg-red-500",
  },
  High: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
    dot: "bg-orange-500",
  },
  Medium: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-300",
    dot: "bg-yellow-500",
  },
  Low: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
    dot: "bg-green-500",
  },
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
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));
  const msLeft = deadline - now;
  const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isOverdue = msLeft <= 0;
  const timeLabel = isOverdue ? "Overdue" : hoursLeft <= 24 ? `${hoursLeft}h left` : `${daysLeft}d left`;
  return { progress, daysLeft, hoursLeft, isOverdue, timeLabel };
};


const CATEGORY_LABEL = {
  Road:              "Road & Infrastructure",
  Waste:             "Sanitation & Waste",
  Electricity:       "Electricity",
  Water:             "Water Supply",
  Safety:            "Public Safety",
  Environment:       "Environment",
  "Law Enforcement": "Law Enforcement",
  Other:             "Other",
};

const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── Complaint Card ────────────────────────────────────────────────────
const ComplaintCard = ({ complaint, index }) => {
  const navigate = useNavigate();
  const pStyle = PRIORITY_STYLE[complaint.priority] || PRIORITY_STYLE.Low;
  const sStyle = STATUS_STYLE[complaint.status] || STATUS_STYLE.pending;
  const sla = getSlaInfo(complaint.slaDeadline, complaint.slaDurationHours);
  const isClosed = complaint.status === "resolved" || complaint.status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${pStyle.border} hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-start gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${pStyle.bg} ${pStyle.text}`}>
              {complaint.priority}
            </span>
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${sStyle.bg} ${sStyle.text}`}>
              {sStyle.label}
            </span>
            {complaint.ticketId && (
              <span className="text-xs text-gray-400 font-mono">{complaint.ticketId}</span>
            )}
          </div>

          {/* Title */}
          <h3
            className="font-bold text-gray-900 text-base mb-1.5 line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors"
            onClick={() => navigate(`/servant/complaints/${complaint._id}`)}
          >
            {complaint.title}
          </h3>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mb-1">
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

          {/* SLA */}
          {sla ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={sla.isOverdue ? "text-red-600 font-medium" : sla.hoursLeft <= 24 ? "text-orange-600 font-medium" : "text-gray-500"}>
                  Resolution deadline: {sla.timeLabel}
                </span>
                <span className="text-gray-400">{sla.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sla.isOverdue ? "bg-red-500" : sla.hoursLeft <= 24 ? "bg-orange-500" : "bg-teal-600"
                  }`}
                  style={{ width: `${sla.progress}%` }}
                />
              </div>
            </div>
          ) : !isClosed ? (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <Timer size={11} /> No resolution deadline set yet
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

// ─── Main Page ─────────────────────────────────────────────────────────
const ServantComplaintsPage = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter,
        priority: priorityFilter,
        page,
        limit: 12,
      };
      if (locationFilter.trim()) params.location = locationFilter.trim();
      const res = await servantAPI.getComplaints(params);
      setComplaints(res.data.data);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, locationFilter, page]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, locationFilter]);

  return (
    <ServantLayout>
      <div className="space-y-5 max-w-6xl">
        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600" />
            <T en="Department Complaints" />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} <T en="complaint" />
            {total !== 1 ? <T en="s" /> : ""} <T en="in your department" />
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={15} className="text-gray-400 shrink-0" />

            {/* Status filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["all", "pending", "in-progress", "resolved", "rejected"].map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                      statusFilter === s
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {s === "all" ? (
                      <T en="All Status" />
                    ) : (
                      <T en={STATUS_STYLE[s]?.label || s} />
                    )}
                  </button>
                ),
              )}
            </div>

            <div className="w-px h-4 bg-gray-200 hidden sm:block" />

            {/* Priority filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["all", "Critical", "High", "Medium", "Low"].map((p) => {
                const pStyle = PRIORITY_STYLE[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                      priorityFilter === p
                        ? p === "all"
                          ? "bg-gray-800 text-white border-gray-800"
                          : `${pStyle?.bg} ${pStyle?.text} ${pStyle?.border}`
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {p === "all" ? <T en="All Priority" /> : <T en={p} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Search by location..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
              />
            </div>
            {(statusFilter !== "all" || priorityFilter !== "all" || locationFilter) && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setLocationFilter("");
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                <T en="Reset filters" />
              </button>
            )}
          </div>
        </div>

        {/* ── Complaint grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-blue-500" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-gray-400">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
            <p className="font-medium text-gray-600">
              <T en="No complaints found" />
            </p>
            <p className="text-sm mt-1">
              <T en="Try changing the filters above." />
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {complaints.map((c, i) => (
              <ComplaintCard
                key={c._id}
                complaint={c}
                index={i}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <T en="Previous" />
            </button>
            <span className="text-sm text-gray-500">
              <T en="Page" /> {page} <T en="of" /> {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <T en="Next" />
            </button>
          </div>
        )}
      </div>

    </ServantLayout>
  );
};

export default ServantComplaintsPage;
