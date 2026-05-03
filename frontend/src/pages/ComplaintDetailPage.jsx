import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ThumbsUp,
  MapPin,
  Clock,
  Tag,
  Building2,
  MessageSquare,
  User,
  Activity,
  AlertCircle,
  Video as VideoIcon,
  Trash2,
  Mic,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import toast from "react-hot-toast";
import { complaintAPI } from "../services/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import T from "../components/T";
import VoiceMessagePlayer from "../components/VoiceMessagePlayer";
import VerifiedBadge from "../components/VerifiedBadge";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

// Fix Leaflet default icon
const defaultIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  electricity: "Electricity Dept",
  sanitation: "Sanitation Dept",
  public_safety: "Public Safety Dept",
  animal_control: "Animal Control",
  health: "Health Dept",
  transport: "Transport Dept",
  environment: "Environment Dept",
  police: "Police Department",
};

const DEPT_LABEL = {
  public_works: "Public Works",
  water_authority: "Water Authority",
  electricity: "Electricity Dept",
  sanitation: "Sanitation Dept",
  public_safety: "Public Safety Dept",
  animal_control: "Animal Control",
  health: "Health Dept",
  transport: "Transport Dept",
  environment: "Environment Dept",
  police: "Police Department",
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const getEvidenceUrl = (item) => {
  if (!item) return "";
  return typeof item === "string" ? item : item.url || "";
};

const isVideo = (item) => {
  const url = getEvidenceUrl(item);
  const type = typeof item === "object" ? item?.type : "";
  return type === "video" || /\.(mp4|mov|avi|webm|mkv)$/i.test(url || "");
};

const isAudio = (item) => {
  const url = getEvidenceUrl(item);
  const type = typeof item === "object" ? item?.type : "";
  return type === "audio" || /\.(mp3|wav|ogg|webm|m4a)$/i.test(url || "");
};

const isVoiceDescription = (item) => {
  const url = getEvidenceUrl(item);
  return isAudio(item) && url.toLowerCase().endsWith(".webm");
};

const resolveUrl = (item) => {

  const url = getEvidenceUrl(item);
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
  ).replace("/api/v1", "");
  return `${base}${url}`;
};

const resolveAvatar = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
  ).replace("/api/v1", "");
  return `${base}${url}`;
};

// â”€â”€â”€ Timeline Icon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TimelineIcon = ({ role }) => {
  if (role === "system")
    return (
      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
        <Activity size={14} className="text-purple-600" />
      </div>
    );
  if (role === "field_inspector")
    return (
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <MessageSquare size={14} className="text-green-600" />
      </div>
    );
  // officer / department_officer
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
      <Clock size={14} className="text-blue-600" />
    </div>
  );
};

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ComplaintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const backPath = state?.from || -1;
  const backLabel = state?.label || "Back";
  const isMyComplaint = state?.from === "/my-complaints";
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  const loadComplaint = () => {
    setLoading(true);
    complaintAPI
      .getOne(id)
      .then((res) => {
        const data = res.data.data || res.data;
        setComplaint(data);
        setVoteCount(data.voteCount ?? 0);
        setHasVoted(Boolean(data.hasVoted));
      })
      .catch(() => toast.error("Failed to load complaint"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const handleVote = async () => {
    if (
      complaint?.canVote === false ||
      complaint?.status === "resolved" ||
      complaint?.status === "rejected"
    )
      return;

    try {
      const res = await complaintAPI.vote(id);
      setHasVoted(Boolean(res.data.voted));
      setVoteCount(res.data.voteCount ?? 0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to vote");
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await complaintAPI.delete(id);
      toast.success("Complaint deleted successfully");
      navigate("/my-complaints");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete complaint");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading)
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );

  // â”€â”€ Not found â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!complaint)
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            <T en="Complaint not found" />
          </p>
          <button
            onClick={() => navigate(backPath)}
            className="mt-4 text-sm text-teal-600 hover:underline"
          >
            <T en="Go back" />
          </button>
        </div>
      </DashboardLayout>
    );

  const pCfg = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.Low;
  const sCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending;
  const sla = getSlaInfo(complaint.slaDeadline, complaint.slaDurationHours);
  const isResolved = complaint.status === "resolved";
  const headerBorder = isResolved ? "border-gray-200" : pCfg.border;
  const evidence = complaint.evidence || [];
  const timeline = complaint.history || [];
  const hasMap = complaint.latitude && complaint.longitude;
  const submitterAvatar = resolveAvatar(complaint.submittedBy?.avatar);

  return (
    <DashboardLayout>
      {/* Back row */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <ArrowLeft size={15} />
          <T en={backLabel} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* â•â• Left main column â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Header card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl p-6 shadow-sm border ${headerBorder}`}
          >
            {/* Badges + upvote */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
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
                  <T en={sCfg.label} />
                </span>
                {complaint.ticketId && (
                  <span className="text-xs text-gray-400 font-mono">
                    {complaint.ticketId}
                  </span>
                )}
              </div>

              <button
                onClick={handleVote}
                disabled={complaint.canVote === false}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                  complaint.canVote === false
                    ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                    : hasVoted
                    ? "bg-teal-50 border-teal-300 text-teal-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
                title={
                  complaint.isOwnComplaint
                    ? "You cannot vote on your own complaint"
                    : isResolved || complaint.status === "rejected"
                    ? "Closed complaints can no longer receive public support"
                    : hasVoted
                    ? "Remove vote"
                    : "Show public support"
                }
              >
                <ThumbsUp
                  size={16}
                  className={complaint.canVote === false ? "text-gray-300" : hasVoted ? "text-teal-600" : "text-gray-400"}
                />
                <span className="text-base font-bold leading-none">
                  {voteCount}
                </span>
                <span className="text-[11px] text-gray-400 leading-none">
                  <T en={isResolved || complaint.status === "rejected" ? "rejected" : "Upvotes"} />
                </span>
              </button>
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900 mt-3 mb-2">
              {complaint.title}
            </h1>

            {/* Description */}
            {complaint.description && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">
                  <T en="Description" />
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <T en={complaint.description} />
                  </p>
                  
                  {/* Inline Audio Player for Voice Description */}
                  {evidence.filter(isVoiceDescription).map((url, i) => (
                    <div key={`voice-${i}`} className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Activity size={10} />
                        Voice Description Recording
                      </p>
                      <VoiceMessagePlayer 
                        src={resolveUrl(url)} 
                        className="!max-w-full !bg-white/80 backdrop-blur-sm shadow-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date + location */}
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

            {/* Category + Department */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  <T en="Category" />
                </p>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Tag size={13} className="text-gray-400" />
                  <T
                    en={
                      CATEGORY_LABEL[complaint.category] ||
                      complaint.category ||
                      "â€”"
                    }
                  />
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  <T en="Department" />
                </p>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Building2 size={13} className="text-gray-400" />
                  <T
                    en={
                      DEPT_LABEL[complaint.department] ||
                      complaint.department ||
                      "â€”"
                    }
                  />
                </p>
              </div>
            </div>

            {/* SLA */}
            {!isResolved && (
              <div className="mb-5">
                {sla ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span className="font-medium">Resolution Deadline</span>
                      <span
                        className={
                          sla.isOverdue
                            ? "text-red-600 font-semibold"
                            : sla.hoursLeft <= 24
                              ? "text-orange-600 font-semibold"
                              : ""
                        }
                      >
                        {sla.timeLabel}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No resolution deadline assigned yet â€” department review
                    pending
                  </p>
                )}
              </div>
            )}

            {/* Attachments */}
            {evidence.filter(url => !isVoiceDescription(url)).length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  <T en="Attachments" /> ({evidence.filter(url => !isVoiceDescription(url)).length})
                </p>
                <div className="flex gap-3 flex-wrap">
                  {evidence.filter(url => !isVoiceDescription(url)).map((url, i) =>
                    isVideo(url) ? (
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
                        <img
                          src={resolveUrl(url)}
                          alt={`attachment-${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Activity Timeline */}
          {timeline.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-base font-bold text-gray-900 mb-5">
                <T en="Activity Timeline" />
              </h2>
              <div className="flex flex-col gap-0">
                {timeline.map((item, i) => {
                  const isSla = item.message?.toLowerCase().includes("sla");
                  const role = isSla ? "field_inspector" : "officer";

                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <TimelineIcon role={role} />
                        {i < timeline.length - 1 && (
                          <div className="w-px flex-1 bg-gray-100 my-2 min-h-[16px]" />
                        )}
                      </div>
                      <div className="flex-1 pb-5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold text-gray-800">
                            {isSla ? (
                              <T en="SLA Update" />
                            ) : (
                              <T en="Status Update" />
                            )}
                          </span>
                          <span className="text-xs text-gray-400">
                            {timeAgo(item.updatedAt || item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Comments (read-only notice) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 flex flex-col items-center justify-center"
          >
            <MessageSquare size={30} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 text-center">
              <T en="Users can view and upvote complaints but cannot add comments" />
            </p>
          </motion.div>
        </div>

        {/* â•â• Right sidebar â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Location */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <h3 className="text-base font-bold text-gray-900 mb-3">
              <T en="Location" />
            </h3>

            {hasMap ? (
              <div
                className="rounded-xl overflow-hidden mb-3 border border-gray-200"
                style={{ height: "160px" }}
              >
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
                  <Marker
                    position={[complaint.latitude, complaint.longitude]}
                    icon={defaultIcon}
                  />
                </MapContainer>
              </div>
            ) : (
              <div
                className="rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3"
                style={{ height: "160px" }}
              >
                <MapPin size={28} className="text-gray-300" />
              </div>
            )}

            {complaint.location && (
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  <T en="Address" />
                </p>
                <p className="text-sm text-gray-700 flex items-start gap-1.5">
                  <MapPin
                    size={13}
                    className="text-red-500 flex-shrink-0 mt-0.5"
                  />
                  <T en={complaint.location} />
                </p>
              </div>
            )}
          </motion.div>

          {/* Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <h3 className="text-base font-bold text-gray-900 mb-3">
              <T en="Statistics" />
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  <T en="Public Support" />
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {voteCount} <T en="votes" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  <T en="Views" />
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {complaint.views ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  <T en="Similar Complaints" />
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {complaint.similarCount ?? 0}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Submitted By */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <h3 className="text-base font-bold text-gray-900 mb-3">
              <T en="Submitted By" />
            </h3>
            <div className="flex items-center gap-2.5">
              {submitterAvatar ? (
                <img
                  src={submitterAvatar}
                  alt={complaint.submittedBy?.name || "Citizen"}
                  className="w-10 h-10 rounded-full object-cover border border-emerald-100 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-gray-500" />
                </div>
              )}
              <div>
                {complaint.isAnonymous ? (
                  <p className="text-sm font-medium text-gray-700">
                    <T en="Anonymous Citizen" />
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">
                      {complaint.submittedBy?.name || <T en="Citizen" />}
                    </p>
                    {complaint.submittedBy?.isVerified && (
                      <VerifiedBadge label={<T en="Verified Citizen" />} className="mt-0.5" />
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />
    </DashboardLayout>
  );
};

export default ComplaintDetailPage;
