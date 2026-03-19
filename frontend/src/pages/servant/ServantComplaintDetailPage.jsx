import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Clock, Tag, Building2, ThumbsUp,
  CheckCircle, Activity, MessageSquare, AlertCircle,
  Shield, Timer, X, Loader2,
  Video as VideoIcon,
} from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import toast from "react-hot-toast";
import { complaintAPI, servantAPI } from "../../services/api";
import ServantLayout from "../../components/layout/ServantLayout";
import T from "../../components/T";

const defaultIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ─── Config ───────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  Critical: { badge: "bg-red-500 text-white",    border: "border-red-400",   headerBg: "bg-red-50"    },
  High:     { badge: "bg-orange-500 text-white",  border: "border-orange-400", headerBg: "bg-orange-50" },
  Medium:   { badge: "bg-yellow-500 text-white",  border: "border-yellow-400", headerBg: "bg-yellow-50" },
  Low:      { badge: "bg-green-500 text-white",   border: "border-green-400",  headerBg: "bg-green-50"  },
};

const STATUS_CONFIG = {
  pending:       { badge: "bg-gray-100 text-gray-600",   label: "Pending"     },
  "in-progress": { badge: "bg-blue-100 text-blue-700",   label: "In Progress" },
  resolved:      { badge: "bg-green-100 text-green-700", label: "Resolved"    },
  rejected:      { badge: "bg-red-100 text-red-700",     label: "Rejected"    },
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

// Derive department name from category (complaints don't store department)
const CATEGORY_TO_DEPT = {
  Road:              "Public Works / Transport",
  Waste:             "Sanitation Dept",
  Electricity:       "Electricity Dept",
  Water:             "Water Authority",
  Safety:            "Public Safety",
  Environment:       "Environment / Animal Control",
  "Law Enforcement": "Police Department",
  Other:             "General Administration",
};

const SLA_PRESETS = [
  { label: "8h",     hours: 8   },
  { label: "12h",    hours: 12  },
  { label: "24h",    hours: 24  },
  { label: "48h",    hours: 48  },
  { label: "72h",    hours: 72  },
  { label: "1 week", hours: 168 },
];

// ─── Helpers ──────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
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
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));
  const msLeft = deadline - now;
  const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isOverdue = msLeft <= 0;
  const timeLabel = isOverdue ? "Overdue" : hoursLeft <= 24 ? `${hoursLeft}h left` : `${daysLeft}d left`;
  const deadlineStr = new Date(slaDeadline).toLocaleString("en-BD", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  return { progress, daysLeft, hoursLeft, isOverdue, timeLabel, deadlineStr };
};

const isVideo = (url) => /\.(mp4|mov|avi|webm|mkv)$/i.test(url || "");

const resolveUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1").replace("/api/v1", "");
  return `${base}${url}`;
};

// ─── Timeline Icon ─────────────────────────────────────────────────
const TimelineIcon = ({ message }) => {
  const isSla = message?.toLowerCase().includes("sla");
  if (isSla) return (
    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
      <Timer size={14} className="text-green-600" />
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
      <Activity size={14} className="text-blue-600" />
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────
const ServantComplaintDetailPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Status modal state
  const [statusOpen,   setStatusOpen]   = useState(false);
  const [newStatus,    setNewStatus]    = useState("");
  const [statusNote,   setStatusNote]   = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  // SLA modal state
  const [slaOpen,   setSlaOpen]   = useState(false);
  const [slaHours,  setSlaHours]  = useState("");
  const [slaSaving, setSlaSaving] = useState(false);

  useEffect(() => {
    complaintAPI.getOne(id)
      .then((res) => {
        const data = res.data.data || res.data;
        setComplaint(data);
      })
      .catch(() => toast.error("Failed to load complaint"))
      .finally(() => setLoading(false));
  }, [id]);

  const isClosed = complaint?.status === "resolved" || complaint?.status === "rejected";

  // ── Status update ──────────────────────────────────────────────
  const handleStatusSave = async () => {
    if (!newStatus) return toast.error("Select a status");
    setStatusSaving(true);
    try {
      await servantAPI.updateStatus(id, newStatus, statusNote);
      setComplaint((prev) => ({
        ...prev,
        status: newStatus,
        history: [
          ...(prev.history || []),
          {
            status: newStatus,
            message: `Status changed to '${newStatus}'.${statusNote ? ` Note: ${statusNote}` : ""}`,
            updatedAt: new Date().toISOString(),
          },
        ],
      }));
      toast.success("Status updated");
      setStatusOpen(false);
      setNewStatus("");
      setStatusNote("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  // ── SLA save ───────────────────────────────────────────────────
  const handleSlaSave = async () => {
    const h = Number(slaHours);
    if (!h || h <= 0 || h > 168) return toast.error("Enter hours between 1 and 168");
    setSlaSaving(true);
    try {
      const res = await servantAPI.setSLA(id, h);
      const updated = res.data.data;
      setComplaint((prev) => ({
        ...prev,
        slaDeadline: updated.slaDeadline,
        slaDurationHours: updated.slaDurationHours,
        history: updated.history,
      }));
      toast.success(`Deadline set to ${h}h`);
      setSlaOpen(false);
      setSlaHours("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to set SLA");
    } finally {
      setSlaSaving(false);
    }
  };

  const slaPreviewDate = slaHours
    ? new Date(Date.now() + Number(slaHours) * 3600000).toLocaleString("en-BD", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <ServantLayout>
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    </ServantLayout>
  );

  if (!complaint) return (
    <ServantLayout>
      <div className="text-center py-24">
        <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Complaint not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    </ServantLayout>
  );

  const pCfg     = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.Low;
  const sCfg     = STATUS_CONFIG[complaint.status]     || STATUS_CONFIG.pending;
  const sla      = getSlaInfo(complaint.slaDeadline, complaint.slaDurationHours);
  const evidence = complaint.evidence  || [];
  const timeline = complaint.history   || [];
  const hasMap   = complaint.latitude && complaint.longitude;
  const deptName = CATEGORY_TO_DEPT[complaint.category] || "General Administration";

  const allowedNext = {
    pending:       ["in-progress", "rejected"],
    "in-progress": ["resolved",    "rejected"],
    resolved:      [],
    rejected:      [],
  }[complaint.status] || [];

  return (
    <ServantLayout>
      {/* Back row */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <ArrowLeft size={15} />
          <T en="Back" />
        </button>
        <span className="text-sm text-gray-400">
          <T en="Viewing as:" />{" "}
          <span className="font-medium text-blue-600"><T en="Department Officer" /></span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ══ Left main column ══════════════════════════════════ */}
        <div className="lg:col-span-3 flex flex-col gap-5">

          {/* ── Main complaint card ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl shadow-sm border-2 ${pCfg.border} overflow-hidden`}
          >
            {/* Coloured header strip */}
            <div className={`${pCfg.headerBg} px-6 py-4 border-b border-gray-100`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${pCfg.badge}`}>
                    {complaint.priority}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${sCfg.badge}`}>
                    {sCfg.label}
                  </span>
                  {complaint.ticketId && (
                    <span className="text-xs text-gray-400 font-mono">{complaint.ticketId}</span>
                  )}
                </div>
                {/* Public support read-only */}
                <div className="flex items-center gap-1.5 flex-shrink-0 bg-white/70 rounded-xl px-3 py-1.5 border border-gray-200">
                  <ThumbsUp size={13} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">{complaint.voteCount ?? 0}</span>
                  <span className="text-xs text-gray-400">public support</span>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="px-6 py-5">
              {/* Title */}
              <h1 className="text-xl font-bold text-gray-900 mb-2">{complaint.title}</h1>

              {/* Description */}
              {complaint.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {complaint.description}
                </p>
              )}

              {/* Date + location row */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {timeAgo(complaint.createdAt)}
                </span>
                {complaint.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} />
                    {complaint.location}
                  </span>
                )}
              </div>

              {/* Category + Department grid */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1"><T en="Category" /></p>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Tag size={13} className="text-gray-400" />
                    {CATEGORY_LABEL[complaint.category] || complaint.category || "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1"><T en="Responsible Department" /></p>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Building2 size={13} className="text-gray-400" />
                    {deptName}
                  </p>
                </div>
              </div>

              {/* SLA bar */}
              <div className="mb-5">
                {sla ? (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-blue-800 flex items-center gap-1.5">
                        <Timer size={12} /> <T en="Resolution Deadline" />
                      </span>
                      <span className={`font-semibold ${sla.isOverdue ? "text-red-600" : sla.hoursLeft <= 24 ? "text-orange-600" : "text-blue-700"}`}>
                        {sla.timeLabel} · <span className="text-gray-500 font-normal">{sla.deadlineStr}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          sla.isOverdue ? "bg-red-500" :
                          sla.hoursLeft <= 24 ? "bg-orange-500" : "bg-teal-600"
                        }`}
                        style={{ width: `${sla.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{sla.progress}% elapsed of {complaint.slaDurationHours}h window</p>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-center gap-2">
                    <Timer size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700 font-medium">
                      <T en="No resolution deadline set yet" />
                    </p>
                  </div>
                )}
              </div>

              {/* ── Officer Action Buttons (inside card) ── */}
              {!isClosed ? (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setStatusOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Activity size={15} />
                    <T en="Update Status" />
                    <span className={`ml-1 px-2 py-0.5 rounded-md text-xs font-semibold ${sCfg.badge}`}>
                      {sCfg.label}
                    </span>
                  </button>
                  <button
                    onClick={() => setSlaOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Timer size={15} />
                    {sla ? <T en="Update Deadline" /> : <T en="Set Deadline" />}
                    {sla && (
                      <span className={`ml-1 text-xs font-medium opacity-90 ${sla.isOverdue ? "text-red-200" : sla.hoursLeft <= 24 ? "text-orange-200" : ""}`}>
                        ({sla.timeLabel})
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <CheckCircle size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-500">
                      <T en="This complaint is" />{" "}
                      <span className={`font-semibold px-1.5 py-0.5 rounded-md text-xs ${sCfg.badge}`}>{sCfg.label}</span>{" "}
                      — <T en="no further actions allowed" />.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            {evidence.length > 0 && (
              <div className="px-6 pb-5">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  <T en="Attachments" /> ({evidence.length})
                </p>
                <div className="flex gap-3 flex-wrap">
                  {evidence.map((item, i) => {
                    const url = item?.url || item;
                    return isVideo(url) ? (
                      <a
                        key={i}
                        href={resolveUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-20 h-20 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <VideoIcon size={24} className="text-gray-400" />
                      </a>
                    ) : (
                      <a
                        key={i}
                        href={resolveUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                      >
                        <img src={resolveUrl(url)} alt={`attachment-${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* Activity Timeline */}
          {timeline.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                <T en="Activity Timeline" />
              </h2>
              <div className="flex flex-col gap-0">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <TimelineIcon message={item.message} />
                      {i < timeline.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 my-2 min-h-[16px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {item.message?.toLowerCase().includes("sla") ? "SLA Update" : "Status Update"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {timeAgo(item.updatedAt || item.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center"
            >
              <MessageSquare size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400"><T en="No activity recorded yet" /></p>
            </motion.div>
          )}
        </div>

        {/* ══ Right sidebar ════════════════════════════════════ */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Officer status summary (read-only summary, actions are in card) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield size={15} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900"><T en="Case Overview" /></h3>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500"><T en="Status" /></span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${sCfg.badge}`}>{sCfg.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500"><T en="Priority" /></span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${pCfg.badge}`}>{complaint.priority}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500"><T en="Deadline" /></span>
                <span className={`text-xs font-semibold ${!sla ? "text-amber-600" : sla.isOverdue ? "text-red-600" : sla.hoursLeft <= 24 ? "text-orange-600" : "text-teal-700"}`}>
                  {sla ? sla.timeLabel : "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500"><T en="Submitted" /></span>
                <span className="text-gray-700 text-xs">{timeAgo(complaint.createdAt)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 italic flex items-center gap-1">
              <Activity size={11} /> <T en="Use the action buttons in the complaint card to update." />
            </p>
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin size={14} className="text-red-500" />
              <T en="Location" />
            </h3>
            {hasMap ? (
              <div className="rounded-xl overflow-hidden mb-3 border border-gray-200" style={{ height: "160px" }}>
                <MapContainer
                  center={[complaint.latitude, complaint.longitude]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                  scrollWheelZoom={false}
                  dragging={false}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[complaint.latitude, complaint.longitude]} icon={defaultIcon} />
                </MapContainer>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3" style={{ height: "120px" }}>
                <MapPin size={28} className="text-gray-200" />
              </div>
            )}
            {complaint.location && (
              <p className="text-sm text-gray-700 flex items-start gap-1.5">
                <MapPin size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                {complaint.location}
              </p>
            )}
          </motion.div>

          {/* Submitted by */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-3"><T en="Submitted By" /></h3>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-blue-500" />
              </div>
              <div>
                {complaint.isAnonymous ? (
                  <p className="text-sm font-medium text-gray-700"><T en="Anonymous Citizen" /></p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">
                      {complaint.user?.name || complaint.submittedBy?.name || "Citizen"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {complaint.user?.email || complaint.submittedBy?.email || ""}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-0.5"><T en="Public Support" /></p>
                <p className="font-bold text-gray-900 text-sm">{complaint.voteCount ?? 0} <span className="font-normal text-gray-400 text-xs">votes</span></p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-0.5"><T en="Submitted" /></p>
                <p className="font-bold text-gray-900 text-xs">{timeAgo(complaint.createdAt)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══ Status Update Modal ══════════════════════════════════ */}
      <AnimatePresence>
        {statusOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setStatusOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" />
                  <T en="Update Status" />
                </h3>
                <button onClick={() => setStatusOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                <T en="Current:" />{" "}
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${sCfg.badge}`}>{sCfg.label}</span>
              </p>

              <div className="flex flex-col gap-2 mb-4">
                {allowedNext.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left ${
                        newStatus === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.badge} mr-2`}>{cfg.label}</span>
                      {s === "in-progress" && "Mark as being worked on"}
                      {s === "resolved"    && "Mark as fixed / completed"}
                      {s === "rejected"    && "Reject (out of scope / invalid)"}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add a note (optional)..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setStatusOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <T en="Cancel" />
                </button>
                <button
                  onClick={handleStatusSave}
                  disabled={!newStatus || statusSaving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {statusSaving && <Loader2 size={14} className="animate-spin" />}
                  <T en="Save Status" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SLA Modal ════════════════════════════════════════════ */}
      <AnimatePresence>
        {slaOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSlaOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Timer size={18} className="text-teal-600" />
                  {sla ? <T en="Update Resolution Deadline" /> : <T en="Set Resolution Deadline" />}
                </h3>
                <button onClick={() => setSlaOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                <T en="The deadline starts from now. Citizens will see this on their complaint detail page." />
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {SLA_PRESETS.map((p) => (
                  <button
                    key={p.hours}
                    onClick={() => setSlaHours(String(p.hours))}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                      slaHours === String(p.hours)
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-teal-400 mb-3">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={slaHours}
                  onChange={(e) => setSlaHours(e.target.value)}
                  placeholder="Custom hours (1–168)"
                  className="flex-1 text-sm outline-none"
                />
                <span className="text-xs text-gray-400">hours</span>
              </div>

              {slaPreviewDate && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 text-xs text-teal-700 mb-4">
                  <T en="Deadline will be" />: <span className="font-semibold">{slaPreviewDate}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSlaOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <T en="Cancel" />
                </button>
                <button
                  onClick={handleSlaSave}
                  disabled={!slaHours || slaSaving}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {slaSaving && <Loader2 size={14} className="animate-spin" />}
                  <T en="Set Deadline" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ServantLayout>
  );
};

export default ServantComplaintDetailPage;
