import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, MapPin, Radio, Send, X } from "lucide-react";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import ServantLayout from "../components/layout/ServantLayout";
import { useAuth } from "../context/AuthContext";
import { emergencyBroadcastAPI } from "../services/api";

const DHAKA_CENTER = [23.8103, 90.4125];

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DISASTER_OPTIONS = [
  { value: "fire", label: "Fire" },
  { value: "flood", label: "Flood" },
  { value: "cyclone", label: "Cyclone" },
  { value: "storm_surge", label: "Storm Surge" },
  { value: "riverbank_erosion", label: "Riverbank Erosion" },
  { value: "landslide", label: "Landslide" },
  { value: "earthquake", label: "Earthquake" },
  { value: "road_collapse", label: "Road Collapse" },
  { value: "building_collapse", label: "Building Collapse" },
  { value: "gas_explosion", label: "Gas Explosion" },
  { value: "industrial_accident", label: "Industrial Accident" },
  { value: "heatwave", label: "Heatwave" },
  { value: "drought", label: "Drought" },
  { value: "water_logging", label: "Water Logging" },
  { value: "epidemic", label: "Epidemic" },
  { value: "electrical_hazard", label: "Electrical Hazard" },
  { value: "other", label: "Other Emergency" },
];

const roleLabels = {
  mayor: "Mayor Emergency Desk",
  department_officer: "Public Servant Emergency Desk",
};

const MapPicker = ({ position, onChange }) => {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={defaultIcon} /> : null;
};

const RecenterMap = ({ center }) => {
  const map = useMapEvents({});

  useEffect(() => {
    if (center?.length === 2) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);

  return null;
};

const EmergencyBroadcastPage = () => {
  const { user } = useAuth();
  const isServant = user?.role === "department_officer";
  const Layout = isServant ? ServantLayout : DashboardLayout;

  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mapPosition, setMapPosition] = useState(
    user?.presentAddress?.lat && user?.presentAddress?.lng
      ? [user.presentAddress.lat, user.presentAddress.lng]
      : DHAKA_CENTER
  );
  const [form, setForm] = useState({
    title: "",
    disasterType: "fire",
    message: "",
    areaLabel: user?.presentAddress?.address || "",
    radiusKm: "3",
  });

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data?.display_name) {
        setForm((prev) => ({ ...prev, areaLabel: data.display_name }));
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    }
  };

  const searchLocation = async () => {
    if (!form.areaLabel.trim()) {
      toast.error("Enter an affected area first");
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.areaLabel)}&limit=1`
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        toast.error("Area not found");
        return;
      }

      const nextPosition = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      setMapPosition(nextPosition);
      setForm((prev) => ({ ...prev, areaLabel: data[0].display_name }));
    } catch (error) {
      toast.error("Failed to search location");
    }
  };

  const handleMapChange = (nextPosition) => {
    setMapPosition(nextPosition);
    reverseGeocode(nextPosition[0], nextPosition[1]);
  };

  const validateBeforeSend = () => {
    if (!mapPosition?.length) {
      toast.error("Pick the affected area on the map");
      return false;
    }
    if (!form.title.trim() || !form.message.trim() || !form.areaLabel.trim()) {
      toast.error("Complete the emergency broadcast form first");
      return false;
    }
    return true;
  };

  const sendBroadcast = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        lat: mapPosition[0],
        lng: mapPosition[1],
      };

      const res = await emergencyBroadcastAPI.create(payload);
      toast.success(res.data.message || "Emergency alert sent");
      setConfirmOpen(false);
      setForm((prev) => ({
        ...prev,
        title: "",
        message: "",
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send emergency alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateBeforeSend()) return;
    setConfirmOpen(true);
  };

  useEffect(() => {
    if (!confirmOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmOpen]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-900 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:px-8 sm:py-8"
        >
          <div className="grid gap-6 xl:grid-cols-12 xl:items-end">
            <div className="xl:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-rose-100">
                <Radio size={12} className="text-rose-300" />
                Emergency Broadcast Control Panel
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {roleLabels[user?.role] || "Emergency Broadcast Desk"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
                Send geo-targeted disaster alerts to citizens whose saved address falls inside the selected emergency radius.
              </p>
            </div>
            <div className="xl:col-span-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm xl:ml-auto xl:max-w-xs">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  Targeting Rule
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Only citizens with saved map coordinates inside the affected radius will receive the alert.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create Emergency Broadcast</h2>
                <p className="text-sm text-slate-500">Fill in the incident details, choose the impact area, and send the alert.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Alert Title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Flash flood warning near Dhanmondi"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Disaster Type</span>
                  <select
                    value={form.disasterType}
                    onChange={(e) => setForm((prev) => ({ ...prev, disasterType: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    {DISASTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Emergency Message</span>
                <textarea
                  rows="5"
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="State what happened, the risk, and what citizens should do immediately."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white"
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Affected Area</span>
                  <input
                    type="text"
                    value={form.areaLabel}
                    onChange={(e) => setForm((prev) => ({ ...prev, areaLabel: e.target.value }))}
                    placeholder="Search or click on the map"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white"
                    required
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={searchLocation}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Locate Area
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_140px_140px]">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Radius (km)</span>
                  <input
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={form.radiusKm}
                    onChange={(e) => setForm((prev) => ({ ...prev, radiusKm: e.target.value }))}
                    className="w-full accent-rose-600"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Exact Radius</span>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={form.radiusKm}
                    onChange={(e) => setForm((prev) => ({ ...prev, radiusKm: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white"
                    required
                  />
                </label>

                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Live Radius</p>
                  <p className="mt-1 text-2xl font-black text-rose-700">{Number(form.radiusKm || 0).toFixed(1)}</p>
                  <p className="text-xs font-medium text-rose-600">kilometers</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin size={15} className="text-rose-500" />
                    Choose the emergency center point
                  </div>
                  <p className="text-xs text-slate-500">Click anywhere on the map to update the target zone</p>
                </div>
                <div className="h-[360px]">
                  <MapContainer center={mapPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <RecenterMap center={mapPosition} />
                    <MapPicker position={mapPosition} onChange={handleMapChange} />
                    {mapPosition && (
                      <Circle
                        center={mapPosition}
                        radius={Number(form.radiusKm || 0) * 1000}
                        pathOptions={{ color: "#e11d48", fillColor: "#fb7185", fillOpacity: 0.2 }}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Emergency Broadcast
              </button>
            </form>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-start justify-center bg-slate-950/55 p-4 pt-8 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget && !submitting) {
                setConfirmOpen(false);
              }
            }}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="w-full max-w-md max-h-[calc(100vh-4rem)] overflow-hidden rounded-[2rem] border border-rose-100 bg-white shadow-2xl"
          >
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-5 pb-5 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Confirm Emergency Broadcast</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      This will immediately notify citizens inside the selected radius. Please confirm before sending.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !submitting && setConfirmOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Alert Title</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 line-clamp-2">{form.title}</p>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Disaster Type</p>
                    <p className="mt-1 text-sm font-bold capitalize text-slate-900">
                      {(DISASTER_OPTIONS.find((option) => option.value === form.disasterType)?.label || form.disasterType).replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Radius</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{Number(form.radiusKm || 0).toFixed(1)} km</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Affected Area</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 line-clamp-3">{form.areaLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Emergency Message</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 line-clamp-3">{form.message}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-5 py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={submitting}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendBroadcast}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Confirm & Send
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default EmergencyBroadcastPage;
