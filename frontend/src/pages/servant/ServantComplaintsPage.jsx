import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  ClipboardList,
  MapPin,
  ThumbsUp,
  Search,
  Navigation,
  Timer,
  Tag,
  Clock,
  FileDown,
  Download,
  ChevronRight,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { servantAPI } from "../../services/api";
import ServantLayout from "../../components/layout/ServantLayout";
import T from "../../components/T";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../context/AuthContext";

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

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in-progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Rejected" },
];

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

const CATEGORY_LABEL = {
  Road: "Road & Infrastructure",
  Waste: "Sanitation & Waste",
  Electricity: "Electricity",
  Water: "Water Supply",
  Safety: "Public Safety",
  Environment: "Environment",
  "Law Enforcement": "Law Enforcement",
  Other: "Other",
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
const ComplaintCard = ({ complaint, index, onDownload }) => {
  const navigate = useNavigate();
  const pStyle = PRIORITY_STYLE[complaint.priority] || PRIORITY_STYLE.Low;
  const sStyle = STATUS_STYLE[complaint.status] || STATUS_STYLE.pending;
  const sla = getSlaInfo(complaint.slaDeadline, complaint.slaDurationHours);
  const isClosed =
    complaint.status === "resolved" || complaint.status === "rejected";
  const isResolved = complaint.status === "resolved";
  const cardBorder = isResolved ? "border-gray-200" : pStyle.border;

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
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${pStyle.bg} ${pStyle.text}`}
              >
                {complaint.priority}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${sStyle.bg} ${sStyle.text}`}
            >
              {sStyle.label}
            </span>
            {complaint.ticketId && (
              <span className="text-xs text-gray-400 font-mono">
                {complaint.ticketId}
              </span>
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
          {sla && !isResolved ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={
                    sla.isOverdue
                      ? "text-red-600 font-medium"
                      : sla.hoursLeft <= 24
                        ? "text-orange-600 font-medium"
                        : "text-gray-500"
                  }
                >
                  Resolution deadline: {sla.timeLabel}
                </span>
                <span className="text-gray-400">{sla.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sla.isOverdue
                      ? "bg-red-500"
                      : sla.hoursLeft <= 24
                        ? "bg-orange-500"
                        : "bg-teal-600"
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

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0 pt-1">
          <div className="flex flex-col items-center gap-0.5">
            <ThumbsUp size={18} className="text-gray-400" />
            <span className="text-base font-bold text-gray-800 leading-tight">
              {complaint.voteCount ?? 0}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
              Upvotes
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(complaint);
            }}
            className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
            title="Download PDF Record"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────
const ServantComplaintsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [nearMode, setNearMode] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const closeDropdown = () => setIsDropdownOpen(false);
    if (isDropdownOpen) window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  }, [isDropdownOpen]);

  const generateDeptReportPDF = async (filterType) => {
    if (!user?.department)
      return toast.error("User department information missing");
    setIsGenerating(true);
    try {
      // 1. Fetch ALL complaints for this period (not just first page)
      const res = await servantAPI.getComplaints({
        filter: filterType,
        limit: 1000,
      });
      const deptComplaints = res.data.data || [];

      // 2. Fetch stats for summary
      const statsRes = await servantAPI.getStats({ filter: filterType });
      const stats = statsRes.data.data;

      if (deptComplaints.length === 0) {
        toast.error("No complaints found for the selected period.");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const deptName = user.department.replace(/_/g, " ").toUpperCase();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.text(`${deptName} - DEPARTMENTAL REPORT`, pageWidth / 2, 20, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Generated by: ${user.name} | Period: ${filterType.toUpperCase()}`,
        pageWidth / 2,
        28,
        { align: "center" },
      );
      doc.text(`Date: ${new Date().toLocaleString()}`, pageWidth / 2, 34, {
        align: "center",
      });

      // Summary Table
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Performance Summary", 14, 50);

      autoTable(doc, {
        startY: 55,
        head: [["Metric", "Value"]],
        body: [
          ["Total Complaints Received", stats.total],
          ["Successfully Resolved", stats.resolved],
          ["Currently In-Progress", stats.inProgress],
          ["Pending Review", stats.pending],
          ["Critical Issues", stats.critical],
        ],
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
      });

      // Detailed Records
      doc.setFontSize(14);
      doc.text("Complaint Logs", 14, doc.lastAutoTable.finalY + 15);

      const rows = deptComplaints.map((c) => [
        c.ticketId,
        c.title,
        c.priority,
        c.status.toUpperCase(),
        new Date(c.createdAt).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [["Ticket ID", "Subject", "Priority", "Status", "Filed On"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
      });

      doc.save(`${user.department}_${filterType}_Report.pdf`);
      toast.success("Department report generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCasePDF = (complaint) => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const deptName = user.department.replace(/_/g, " ").toUpperCase();

      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235);
      doc.text(`${deptName} - OFFICIAL RECORD`, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Ticket ID: ${complaint.ticketId}`, 14, 26);

      autoTable(doc, {
        startY: 35,
        head: [["Category", "Details"]],
        body: [
          ["Title", complaint.title],
          ["Category", complaint.category],
          ["Priority", complaint.priority],
          ["Status", complaint.status.toUpperCase()],
          ["Filed On", new Date(complaint.createdAt).toLocaleString()],
          ["Location", complaint.location || "N/A"],
        ],
        theme: "plain",
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: "bold", width: 40 } },
      });

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Description:", 14, doc.lastAutoTable.finalY + 10);
      doc.setFontSize(10);
      const splitDesc = doc.splitTextToSize(
        complaint.description,
        pageWidth - 28,
      );
      doc.text(splitDesc, 14, doc.lastAutoTable.finalY + 16);

      doc.save(`Case_${complaint.ticketId}.pdf`);
      toast.success("Case record saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate case PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter,
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
  }, [statusFilter, locationFilter, page]);

  useEffect(() => {
    if (nearMode) return;
    fetchComplaints();
  }, [fetchComplaints, nearMode]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, locationFilter, nearMode]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setNearMode(true);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await servantAPI.getComplaints({
            status: statusFilter,
            lat: latitude,
            lng: longitude,
            radius: 5,
            page: 1,
            limit: 12,
          });
          setComplaints(res.data.data || []);
          setTotal(res.data.total || 0);
          setTotalPages(res.data.pages || 1);
          setPage(1);
          toast.success("Showing department complaints within 5 km of you");
        } catch {
          toast.error("Failed to fetch nearby department complaints");
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error("Could not get your location. Please allow location access.");
        setNearMode(false);
        setLoading(false);
      },
    );
  };

  const clearNearMe = () => {
    setNearMode(false);
    setLocationFilter("");
  };

  if (!user) return null;

  return (
    <ServantLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-4 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:px-8 sm:py-5"
        >
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 xl:items-start">
            <div className="xl:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-100">
                <ClipboardList size={12} className="text-teal-300" />
                Department Control Center
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                <T en="Department Complaints" />
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
                {total} <T en="complaint" />
                {total !== 1 ? <T en="s" /> : ""} <T en="in your department" />
              </p>
            </div>
            <div className="xl:col-span-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  <T en="Quick Overview" />
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      <T en="Total Cases" />
                    </span>
                    <span className="font-bold text-base text-white">
                      {total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      <T en="Pending" />
                    </span>
                    <span className="font-bold text-base text-yellow-300">
                      {complaints.filter((c) => c.status === "pending").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      <T en="In Progress" />
                    </span>
                    <span className="font-bold text-base text-blue-300">
                      {
                        complaints.filter((c) => c.status === "in-progress")
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      <T en="Resolved" />
                    </span>
                    <span className="font-bold text-base text-green-300">
                      {complaints.filter((c) => c.status === "resolved").length}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/18 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileDown size={18} />
                )}
                <T en="Generate Report" />
                <ChevronRight
                  size={14}
                  className={`transition-transform ${isDropdownOpen ? "rotate-90" : ""}`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Dropdown Menu */}
        <div className="relative">
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] text-gray-900 overflow-hidden"
              >
                <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Period Selection
                </p>
                {["monthly", "yearly", "all"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      generateDeptReportPDF(opt);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-blue-50 hover:text-blue-600 capitalize flex items-center justify-between group"
                  >
                    {opt} Summary
                    <ChevronRight
                      size={14}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                    />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status.key}
                  onClick={() => {
                    setStatusFilter(status.key);
                    setNearMode(false);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    statusFilter === status.key
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700"
                  }`}
                >
                  <T en={status.label} />
                </button>
              ))}
            </div>

            {!nearMode && (
              <div className="relative flex-1 max-w-xs">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Search by location..."
                  className="w-full pl-8 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                {locationFilter && (
                  <button
                    onClick={() => setLocationFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {nearMode ? (
              <button
                onClick={clearNearMe}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Navigation size={13} />
                <T en="Near Me" />
                <X size={13} />
              </button>
            ) : (
              <button
                onClick={handleNearMe}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                <Navigation size={13} />
                <T en="Near Me" />
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
                onDownload={generateCasePDF}
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
