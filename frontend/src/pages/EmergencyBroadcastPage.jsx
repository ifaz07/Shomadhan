import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Send, MapPin, Clock, Users,
  X, CheckCircle, XCircle, Bell, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';

const EMERGENCY_TYPES = [
  { value: 'fire', label: 'Fire', color: 'bg-red-500' },
  { value: 'flood', label: 'Flood', color: 'bg-blue-500' },
  { value: 'road-collapse', label: 'Road Collapse', color: 'bg-orange-500' },
  { value: 'earthquake', label: 'Earthquake', color: 'bg-purple-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

export default function EmergencyBroadcastPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'fire',
    severity: 'medium',
    latitude: '',
    longitude: '',
    radiusKm: 5,
    address: '',
    targetAudience: 'all',
    expiresAt: '',
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBroadcasts();
  }, [filter]);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/emergency-broadcast', { params });
      setBroadcasts(response.data.data);
    } catch (error) {
      toast.error('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        affectedArea: {
          type: 'Point',
          coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
          radiusKm: parseFloat(formData.radiusKm),
          address: formData.address,
        },
      };
      
      await api.post('/emergency-broadcast', payload);
      toast.success('Emergency broadcast sent successfully');
      setShowForm(false);
      setFormData({
        title: '',
        message: '',
        type: 'fire',
        severity: 'medium',
        latitude: '',
        longitude: '',
        radiusKm: 5,
        address: '',
        targetAudience: 'all',
        expiresAt: '',
      });
      fetchBroadcasts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send broadcast');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this broadcast?')) return;
    try {
      await api.patch(`/emergency-broadcast/${id}/cancel`);
      toast.success('Broadcast cancelled');
      fetchBroadcasts();
    } catch (error) {
      toast.error('Failed to cancel broadcast');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
      active: { bg: 'bg-green-100', text: 'text-green-700' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
    };
    return config[status] || config.draft;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colors[severity] || colors.medium;
  };

  const getTypeLabel = (type) => {
    return EMERGENCY_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Emergency Broadcast Control
            </h1>
            <p className="text-gray-600 mt-1">Send geo-targeted emergency notifications</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Send className="w-4 h-4" />
            New Broadcast
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'active', 'draft', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Broadcast Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">New Emergency Broadcast</h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Emergency broadcast title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Detailed emergency message..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Type</label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      {EMERGENCY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    >
                      {SEVERITY_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="23.8103"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="90.4125"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.radiusKm}
                      onChange={(e) => setFormData({ ...formData, radiusKm: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                    <input
                      type="datetime-local"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Affected area address"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Send Broadcast
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Broadcasts List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No broadcasts found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {broadcasts.map((broadcast) => (
              <motion.div
                key={broadcast._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getSeverityColor(broadcast.severity)}`}>
                        {broadcast.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(broadcast.status).bg} ${getStatusBadge(broadcast.status).text}`}>
                        {broadcast.status}
                      </span>
                      <span className="text-sm text-gray-500">{getTypeLabel(broadcast.type)}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{broadcast.title}</h3>
                    <p className="text-gray-600 mt-1 text-sm">{broadcast.message}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      {broadcast.affectedArea?.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {broadcast.affectedArea.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(broadcast.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {broadcast.status === 'active' && (
                    <button
                      onClick={() => handleCancel(broadcast._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}