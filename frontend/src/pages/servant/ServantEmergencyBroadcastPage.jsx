import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Clock,
  MapPin,
  Plus,
  Send,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import ServantLayout from "../../components/layout/ServantLayout";
import T from "../../components/T";

const EMERGENCY_TYPES = [
  { value: "fire", label: "Fire", color: "bg-red-500" },
  { value: "flood", label: "Flood", color: "bg-blue-500" },
  { value: "road-collapse", label: "Road Collapse", color: "bg-orange-500" },
  { value: "earthquake", label: "Earthquake", color: "bg-violet-500" },
  { value: "other", label: "Other", color: "bg-slate-500" },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: "bg-emerald-500" },
  { value: "medium", label: "Medium", color: "bg-amber-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-rose-600" },
];

const TARGET_AUDIENCE_OPTIONS = [
  { value: "all", label: "All Residents" },
  { value: "citizens", label: "Citizens Only" },
  { value: "servants", label: "Public Servants Only" },
  { value: "admins", label: "Admins Only" },
];

const FILTER_OPTIONS = ["all", "active", "draft", "completed", "cancelled"];

const INITIAL_FORM = {
  title: "",
  message: "",
  type: "fire",
  severity: "medium",
  latitude: "",
  longitude: "",
  radiusKm: 5,
  address: "",
  targetAudience: "all",
  expiresAt: "",
};

const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString();
};

export default function ServantEmergencyBroadcastPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    fetchBroadcasts();
  }, [filter]);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const params = filter !== "all" ? { status: filter } : {};
      const response = await api.get("/emergency-broadcast", { params });
      setBroadcasts(response.data.data || []);
    } catch (error) {
      toast.error("Failed to load emergency broadcasts");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);
    const radiusKm = parseFloat(formData.radiusKm);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      toast.error("Please provide valid latitude and longitude");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/emergency-broadcast", {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        severity: formData.severity,
        targetAudience: formData.targetAudience,
        expiresAt: formData.expiresAt || undefined,
        affectedArea: {
          type: "Point",
          coordinates: [longitude, latitude],
          radiusKm: Number.isNaN(radiusKm) ? 5 : radiusKm,
          address: formData.address.trim(),
        },
      });

      toast.success("Emergency broadcast sent successfully");
      setShowForm(false);
      resetForm();
      fetchBroadcasts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (broadcastId) => {
    if (!window.confirm("Are you sure you want to cancel this emergency broadcast?")) {
      return;
    }

    try {
      await api.patch(`/emergency-broadcast/${broadcastId}/cancel`);
      toast.success("Emergency broadcast cancelled");
      fetchBroadcasts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel broadcast");
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      active: "bg-emerald-100 text-emerald-700",
      draft: "bg-slate-100 text-slate-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-rose-100 text-rose-700",
    };
    return map[status] || map.draft;
  };

  const getSeverityBadge = (severity) => {
    return SEVERITY_LEVELS.find((item) => item.value === severity)?.color || "bg-amber-500";
  };

  const getEmergencyLabel = (type) => {
    return EMERGENCY_TYPES.find((item) => item.value === type)?.label || type;
  };

  const getAudienceLabel = (audience) => {
    return TARGET_AUDIENCE_OPTIONS.find((item) => item.value === audience)?.label || audience;
  };

  return (
    <ServantLayout>
      <div className="max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
                <AlertTriangle className="h-4 w-4" />
                <T en="Emergency Broadcast Control Panel" />
              </div>
              <h1 className="mt-3 text-2xl font-bold text-slate-900">
                <T en="Send geo-targeted push notifications during disasters" />
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                <T en="Public servants can issue location-based alerts for fire, flood, road collapse, and other urgent civic emergencies." />
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
              <T en="Create Broadcast" />
            </button>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === status
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              <T en={status.charAt(0).toUpperCase() + status.slice(1)} />
            </button>
          ))}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    <T en="New Emergency Broadcast" />
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    <T en="Choose the disaster type, define the target area, and publish the alert." />
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Broadcast Title" />
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      placeholder="Road collapse alert for Mirpur residents"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Broadcast Message" />
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(event) => updateField("message", event.target.value)}
                      placeholder="Avoid the collapsed roadway near Section 10 and use the alternate route via..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Emergency Type" />
                    </label>
                    <select
                      value={formData.type}
                      onChange={(event) => updateField("type", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    >
                      {EMERGENCY_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Severity Level" />
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(event) => updateField("severity", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    >
                      {SEVERITY_LEVELS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Latitude" />
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(event) => updateField("latitude", event.target.value)}
                      placeholder="23.8103"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Longitude" />
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(event) => updateField("longitude", event.target.value)}
                      placeholder="90.4125"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Coverage Radius (km)" />
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.radiusKm}
                      onChange={(event) => updateField("radiusKm", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Target Audience" />
                    </label>
                    <select
                      value={formData.targetAudience}
                      onChange={(event) => updateField("targetAudience", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    >
                      {TARGET_AUDIENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Affected Area Address" />
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      placeholder="Mirpur Section 10, Dhaka"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <T en="Expires At" />
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(event) => updateField("expiresAt", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <T en="Cancel" />
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    <T en={submitting ? "Sending..." : "Send Broadcast"} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <Bell className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-base font-medium text-slate-700">
              <T en="No emergency broadcasts found" />
            </p>
            <p className="mt-2 text-sm text-slate-500">
              <T en="Create the first geo-targeted alert for your response area." />
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {broadcasts.map((broadcast, index) => (
              <motion.div
                key={broadcast._id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${getSeverityBadge(broadcast.severity)}`}>
                        {broadcast.severity?.toUpperCase()}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(broadcast.status)}`}>
                        <T en={broadcast.status?.charAt(0).toUpperCase() + broadcast.status?.slice(1)} />
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        <T en={getEmergencyLabel(broadcast.type)} />
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        <T en={getAudienceLabel(broadcast.targetAudience)} />
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-slate-900">{broadcast.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{broadcast.message}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      {broadcast.affectedArea?.address && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {broadcast.affectedArea.address}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {formatDateTime(broadcast.createdAt)}
                      </span>
                      {broadcast.affectedArea?.radiusKm ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          <T en={`${broadcast.affectedArea.radiusKm} km radius`} />
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {broadcast.status === "active" && (
                    <button
                      onClick={() => handleCancel(broadcast._id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <T en="Cancel Alert" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ServantLayout>
  );
}
