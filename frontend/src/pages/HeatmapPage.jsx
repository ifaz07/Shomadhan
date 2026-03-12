import { useState, useEffect } from 'react';
import { useMap, MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Flame, AlertTriangle, TrendingUp, MapPin } from 'lucide-react';
import { complaintAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';

// ─── HeatLayer: renders leaflet.heat overlay ──────────────────────────────
const HeatLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    let heatLayer;
    import('leaflet.heat').then(() => {
      heatLayer = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.2: '#3b82f6', 0.45: '#22c55e', 0.7: '#f97316', 1.0: '#ef4444' },
      });
      heatLayer.addTo(map);
    });

    return () => {
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

// ─── HeatmapPage ──────────────────────────────────────────────────────────
const HeatmapPage = () => {
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0 });

  useEffect(() => {
    const fetchHeatmap = async () => {
      setIsLoading(true);
      try {
        const res = await complaintAPI.getHeatmapData(days);
        const data = res.data.data || [];
        setPoints(data);
        setStats({
          total: data.length,
          critical: data.filter((p) => p[2] === 1.0).length,
          high: data.filter((p) => p[2] === 0.7).length,
        });
      } catch {
        setPoints([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHeatmap();
  }, [days]);

  const DAY_OPTIONS = [7, 30, 90];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Flame size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900"><T en="Complaint Heatmap" /></h1>
              <p className="text-xs text-gray-500"><T en="High-incident zones across the city" /></p>
            </div>
          </div>

          {/* Time filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  days === d
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <T en={`${d}d`} />
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MapPin size={15} className="text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500"><T en="Total Incidents" /></p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle size={15} className="text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.critical}</p>
              <p className="text-xs text-gray-500"><T en="Critical" /></p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <TrendingUp size={15} className="text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.high}</p>
              <p className="text-xs text-gray-500"><T en="High Priority" /></p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">
          {isLoading && (
            <div className="absolute inset-0 z-[1000] bg-white/70 flex items-center justify-center rounded-2xl">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <T en="Loading heatmap..." />
              </div>
            </div>
          )}
          <MapContainer
            center={[23.8103, 90.4125]}
            zoom={12}
            style={{ height: 'calc(100vh - 320px)', minHeight: '400px', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {!isLoading && points.length > 0 && <HeatLayer points={points} />}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center gap-4">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide"><T en="Intensity" /></span>
          {[
            { color: '#3b82f6', label: 'Low' },
            { color: '#22c55e', label: 'Medium' },
            { color: '#f97316', label: 'High' },
            { color: '#ef4444', label: 'Critical' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600"><T en={label} /></span>
            </div>
          ))}
          {points.length === 0 && !isLoading && (
            <span className="text-xs text-gray-400 ml-auto"><T en="No complaints with location data in this period" /></span>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HeatmapPage;
