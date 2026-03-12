import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Map,
  AlertTriangle,
  Flame,
  ThumbsUp,
  RefreshCw,
  Filter,
  Info,
  ZoomIn,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { complaintAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';

// Fix Leaflet default icon
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ─── Priority config ──────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  Critical: { color: '#ef4444', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500', label: 'Critical' },
  High:     { color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500', label: 'High' },
  Medium:   { color: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500', label: 'Medium' },
  Low:      { color: '#22c55e', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500', label: 'Low' },
};

// Create a colored circle icon for each priority
const makePriorityIcon = (priority) => {
  const color = PRIORITY_CONFIG[priority]?.color || '#94a3b8';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const makeCriticalIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#ef4444;border:3px solid white;
      box-shadow:0 0 0 3px rgba(239,68,68,0.35);
      animation:pulse 1.5s infinite;
    "></div>
    <style>@keyframes pulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.35)}50%{box-shadow:0 0 0 7px rgba(239,68,68,0.1)}}</style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

// ─── Heatmap layer injected via useMap ────────────────────────────────
const HeatLayer = ({ points, visible }) => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }
    if (!points.length) return;

    import('leaflet.heat').then(() => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      const heatPoints = points.map((p) => [p.lat, p.lng, p.weight]);
      layerRef.current = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        gradient: { 0.2: '#22c55e', 0.4: '#eab308', 0.7: '#f97316', 1.0: '#ef4444' },
      });
      layerRef.current.addTo(map);
    });

    return () => {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [points, visible, map]);

  return null;
};

// ─── Stat card ────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon: Icon }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl border ${color} bg-white`}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color.replace('border-', 'bg-').replace('-300', '-100')}`}>
      <Icon size={18} className={color.replace('border-', 'text-').replace('-300', '-600')} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────
const HeatmapPage = () => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedPoint, setSelectedPoint] = useState(null);

  const DHAKA_CENTER = [23.8103, 90.4125];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await complaintAPI.getHeatmapData();
      setPoints(res.data.data);
    } catch {
      toast.error('Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered points for markers
  const filtered = points.filter((p) => {
    if (priorityFilter !== 'All' && p.priority !== priorityFilter) return false;
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
    return true;
  });

  // Stats
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  points.forEach((p) => { if (counts[p.priority] !== undefined) counts[p.priority]++; });

  const categories = ['All', 'Road', 'Waste', 'Electricity', 'Water', 'Safety', 'Environment', 'Other'];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 p-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Map size={24} className="text-teal-600" />
              Complaint Heatmap
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Visualize complaint intensity and priority zones across the city
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Priority Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Critical" value={counts.Critical} color="border-red-300"    icon={AlertTriangle} />
          <StatCard label="High"     value={counts.High}     color="border-orange-300" icon={Flame} />
          <StatCard label="Medium"   value={counts.Medium}   color="border-yellow-300" icon={Info} />
          <StatCard label="Low"      value={counts.Low}      color="border-green-300"  icon={ZoomIn} />
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
          <Filter size={16} className="text-gray-400" />

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                  priorityFilter === p
                    ? p === 'All'
                      ? 'bg-gray-800 text-white border-gray-800'
                      : `${PRIORITY_CONFIG[p]?.bg} ${PRIORITY_CONFIG[p]?.text} ${PRIORITY_CONFIG[p]?.border}`
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {p === 'All' ? 'All Priority' : p}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>

          <div className="w-px h-5 bg-gray-200" />

          {/* Layer toggles */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
            <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} className="accent-teal-600" />
            Heatmap overlay
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
            <input type="checkbox" checked={showMarkers} onChange={(e) => setShowMarkers(e.target.checked)} className="accent-teal-600" />
            Priority markers
          </label>

          <span className="ml-auto text-xs text-gray-400">{filtered.length} / {points.length} complaints shown</span>
        </div>

        {/* ── Map ── */}
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '520px' }}>
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-[999] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Loading complaint data…</p>
              </div>
            </div>
          )}

          <MapContainer center={DHAKA_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />

            {/* Heatmap layer */}
            <HeatLayer points={filtered} visible={showHeatmap} />

            {/* Priority markers */}
            {showMarkers && filtered.map((p, i) => (
              <Marker
                key={i}
                position={[p.lat, p.lng]}
                icon={p.priority === 'Critical' ? makeCriticalIcon() : makePriorityIcon(p.priority)}
                eventHandlers={{ click: () => setSelectedPoint(p) }}
              >
                <Popup maxWidth={260}>
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold`}
                        style={{ background: PRIORITY_CONFIG[p.priority]?.color + '20', color: PRIORITY_CONFIG[p.priority]?.color }}>
                        ● {p.priority}
                      </span>
                      <span className="text-gray-500 text-xs">{p.category}</span>
                    </div>
                    <p className="font-semibold text-gray-800 mb-1">{p.title}</p>
                    {p.location && <p className="text-gray-500 text-xs mb-2">📍 {p.location}</p>}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>🎫 {p.ticketId}</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={11} /> {p.voteCount}</span>
                    </div>
                    <div className="mt-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        p.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{p.status}</span>
                      {p.emergencyFlag && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">⚡ Emergency</span>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 z-[500] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
            <p className="font-semibold text-gray-700 mb-2">Priority Legend</p>
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                <span className="text-gray-600">{cfg.label}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-gray-400 text-[10px]">Heatmap: red = high density</p>
            </div>
          </div>
        </div>

        {/* ── High-incident zone summary ── */}
        {points.filter((p) => p.priority === 'Critical' || p.priority === 'High').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
              <AlertTriangle size={16} />
              High-Incident Zones ({points.filter((p) => p.priority === 'Critical' || p.priority === 'High').length} complaints)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {points
                .filter((p) => (p.priority === 'Critical' || p.priority === 'High') && p.location)
                .slice(0, 6)
                .map((p, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white rounded-lg p-2.5 border border-red-100">
                    <span
                      className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY_CONFIG[p.priority]?.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">📍 {p.location}</p>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HeatmapPage;
