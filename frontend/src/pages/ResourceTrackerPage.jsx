import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, Users, Wrench, MapPin, Clock, Filter,
  CheckCircle, XCircle, AlertTriangle, Plus, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';

const RESOURCE_TYPES = [
  { value: 'vehicle', label: 'Vehicle', icon: Truck },
  { value: 'officer', label: 'Officer', icon: Users },
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'crew', label: 'Crew', icon: Users },
  { value: 'other', label: 'Other', icon: Truck },
];

const DEPARTMENTS = [
  { value: 'fire', label: 'Fire Department' },
  { value: 'police', label: 'Police' },
  { value: 'medical', label: 'Medical' },
  { value: 'public-works', label: 'Public Works' },
  { value: 'transport', label: 'Transport' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG = {
  available: { bg: 'bg-green-100', text: 'text-green-700', label: 'Available' },
  deployed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Deployed' },
  maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Maintenance' },
  'out-of-service': { bg: 'bg-red-100', text: 'text-red-700', label: 'Out of Service' },
};

export default function ResourceTrackerPage() {
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [filters, setFilters] = useState({ status: '', type: '', department: '' });
  const [formData, setFormData] = useState({
    name: '',
    type: 'vehicle',
    category: '',
    status: 'available',
    latitude: '',
    longitude: '',
    address: '',
    maxPersons: 1,
    maxWeightKg: '',
    department: '',
    phone: '',
    radioChannel: '',
    capabilities: [],
    notes: '',
  });

  useEffect(() => {
    fetchResources();
    fetchStats();
  }, [filters]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.department) params.department = filters.department;
      
      const response = await api.get('/resources', { params });
      setResources(response.data.data);
    } catch (error) {
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/resources/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        currentLocation: formData.latitude && formData.longitude ? {
          type: 'Point',
          coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
          address: formData.address,
        } : undefined,
        capacity: {
          maxPersons: parseInt(formData.maxPersons) || 1,
          maxWeightKg: formData.maxWeightKg ? parseInt(formData.maxWeightKg) : undefined,
        },
      };
      
      await api.post('/resources', payload);
      toast.success('Resource added successfully');
      setShowForm(false);
      resetForm();
      fetchResources();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add resource');
    }
  };

  const handleDeploy = async (resourceId) => {
    const complaintId = window.prompt('Enter Complaint ID to deploy this resource:');
    if (!complaintId) return;
    
    try {
      await api.post(`/resources/${resourceId}/deploy`, { complaintId });
      toast.success('Resource deployed successfully');
      fetchResources();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deploy resource');
    }
  };

  const handleRelease = async (resourceId) => {
    try {
      await api.post(`/resources/${resourceId}/release`);
      toast.success('Resource released successfully');
      fetchResources();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to release resource');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'vehicle',
      category: '',
      status: 'available',
      latitude: '',
      longitude: '',
      address: '',
      maxPersons: 1,
      maxWeightKg: '',
      department: '',
      phone: '',
      radioChannel: '',
      capabilities: [],
      notes: '',
    });
  };

  const getTypeIcon = (type) => {
    const typeConfig = RESOURCE_TYPES.find(t => t.value === type);
    return typeConfig?.icon || Truck;
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-teal-500" />
              Resource Allocation Tracker
            </h1>
            <p className="text-gray-600 mt-1">Monitor and manage civic resources</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.byStatus.map((stat) => (
              <div key={stat._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{STATUS_CONFIG[stat._id]?.label || stat._id}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${STATUS_CONFIG[stat._id]?.bg || 'bg-gray-100'}`}>
                    {stat._id === 'available' ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : stat._id === 'deployed' ? (
                      <Truck className="w-6 h-6 text-blue-500" />
                    ) : stat._id === 'maintenance' ? (
                      <Wrench className="w-6 h-6 text-yellow-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            {Object.keys(STATUS_CONFIG).map((status) => (
              <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All Types</option>
            {RESOURCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept.value} value={dept.value}>{dept.label}</option>
            ))}
          </select>
        </div>

        {/* Resource Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Add New Resource</h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Resource name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      {RESOURCE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
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
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="90.4125"
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
                    placeholder="Current location address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Persons</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.maxPersons}
                      onChange={(e) => setFormData({ ...formData, maxPersons: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Contact phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
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
                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                  >
                    Add Resource
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Resources List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No resources found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => {
              const IconComponent = getTypeIcon(resource.type);
              return (
                <motion.div
                  key={resource._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <IconComponent className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                        <p className="text-sm text-gray-500">{resource.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[resource.status]?.bg} ${STATUS_CONFIG[resource.status]?.text}`}>
                      {STATUS_CONFIG[resource.status]?.label}
                    </span>
                  </div>

                  {resource.currentLocation?.address && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                      <MapPin className="w-4 h-4" />
                      {resource.currentLocation.address}
                    </div>
                  )}

                  {resource.assignedTo?.complaint && (
                    <div className="text-sm text-blue-600 mb-2">
                      Deployed to: {resource.assignedTo.complaint?.title || 'Complaint'}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {resource.status === 'available' ? (
                      <button
                        onClick={() => handleDeploy(resource._id)}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                      >
                        Deploy
                      </button>
                    ) : resource.status === 'deployed' ? (
                      <button
                        onClick={() => handleRelease(resource._id)}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        Release
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}