import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Truck,
  Users,
  Clock,
  TrendingUp,
  Send,
  X,
  CheckCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { resourceAPI } from '../services/api';

const RESOURCE_TYPES = ['Vehicle', 'Equipment', 'Officer', 'Staff', 'Machinery', 'Medical Supply', 'Communication Device'];
const RESOURCE_CATEGORIES = ['Emergency Response', 'Road & Infrastructure', 'Sanitation', 'Water Supply', 'Medical', 'Security', 'Support'];
const RESOURCE_STATUS = ['active', 'inactive', 'maintenance', 'retired'];
const RESOURCE_PRIORITY = ['low', 'medium', 'high', 'critical'];

const ResourceAllocationPage = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    description: '',
    totalQuantity: '',
    baseLocation: '',
    responseTime: 15,
    maxDeploymentDistance: 50,
    priority: 'medium',
    specializations: '',
  });

  // Fetch resources
  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await resourceAPI.getResources();
      setResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error(t('errorFetchingResources') || 'Error fetching resources');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await resourceAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchResources();
    fetchStats();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.type || !formData.category || !formData.totalQuantity) {
      toast.error(t('fillRequiredFields') || 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        totalQuantity: parseInt(formData.totalQuantity),
        responseTime: parseInt(formData.responseTime),
        maxDeploymentDistance: parseInt(formData.maxDeploymentDistance),
        specializations: formData.specializations ? formData.specializations.split(',').map(s => s.trim()) : [],
      };

      if (editingResource) {
        await resourceAPI.updateResource(editingResource._id, payload);
        toast.success(t('resourceUpdated') || 'Resource updated successfully');
      } else {
        await resourceAPI.createResource(payload);
        toast.success(t('resourceCreated') || 'Resource created successfully');
      }

      setFormData({
        name: '',
        type: '',
        category: '',
        description: '',
        totalQuantity: '',
        baseLocation: '',
        responseTime: 15,
        maxDeploymentDistance: 50,
        priority: 'medium',
        specializations: '',
      });
      setEditingResource(null);
      setShowForm(false);
      fetchResources();
      fetchStats();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error(error.response?.data?.message || t('errorSavingResource') || 'Error saving resource');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm(t('confirmDelete') || 'Are you sure?')) {
      try {
        await resourceAPI.deleteResource(id);
        toast.success(t('resourceDeleted') || 'Resource deleted successfully');
        fetchResources();
        fetchStats();
      } catch (error) {
        toast.error(error.response?.data?.message || t('errorDeleting') || 'Error deleting');
      }
    }
  };

  // Handle edit
  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      type: resource.type,
      category: resource.category,
      description: resource.description,
      totalQuantity: resource.totalQuantity,
      baseLocation: resource.baseLocation || '',
      responseTime: resource.responseTime,
      maxDeploymentDistance: resource.maxDeploymentDistance,
      priority: resource.priority,
      specializations: resource.specializations?.join(', ') || '',
    });
    setShowForm(true);
  };

  // Render resource card
  const ResourceCard = ({ resource }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-lg shadow-md border-l-4 border-blue-500 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-gray-900">{resource.name}</h3>
            <div className="flex gap-2 mt-1">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {resource.type}
              </span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                {resource.category}
              </span>
            </div>
          </div>
          {user?.role === 'mayor' || user?.role === 'admin' || resource.managedBy?._id === user?._id ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(resource)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(resource._id)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : null}
        </div>

        <p className="text-sm text-gray-600 mb-3">{resource.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-600">Available</div>
            <div className="font-bold text-lg text-green-600">{resource.availableQuantity}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-600">Deployed</div>
            <div className="font-bold text-lg text-orange-600">{resource.deployedQuantity}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-600">Total</div>
            <div className="font-bold text-lg text-blue-600">{resource.totalQuantity}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-600">Response Time</div>
            <div className="font-bold text-lg text-purple-600">{resource.responseTime} min</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            {resource.isOperational ? (
              <>
                <CheckCircle size={16} className="text-green-500" />
                <span>Operational</span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-red-500" />
                <span>Not Operational</span>
              </>
            )}
          </div>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            resource.priority === 'critical' ? 'bg-red-100 text-red-700' :
            resource.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            resource.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {resource.priority.toUpperCase()}
          </span>
        </div>
      </div>
    </motion.div>
  );

  const LayoutComponent = user?.role === 'mayor' ? 'div' : user?.role === 'department_officer' ? 'div' : 'div';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {t('resourceAllocation') || 'Resource Allocation Tracker'}
              </h1>
              <p className="text-gray-600">
                {t('manageAndOptimizeResources') || 'Manage and optimize civic resource deployment'}
              </p>
            </div>
            {user?.role === 'mayor' || user?.role === 'admin' || user?.role === 'department_officer' ? (
              <button
                onClick={() => {
                  setEditingResource(null);
                  setFormData({
                    name: '',
                    type: '',
                    category: '',
                    description: '',
                    totalQuantity: '',
                    baseLocation: '',
                    responseTime: 15,
                    maxDeploymentDistance: 50,
                    priority: 'medium',
                    specializations: '',
                  });
                  setShowForm(!showForm);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition"
              >
                <Plus size={20} />
                {t('addResource') || 'Add Resource'}
              </button>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b-2 border-gray-200">
            {['overview', 'resources', 'deployments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-semibold border-b-2 transition ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-blue-600'
                }`}
              >
                {t(tab) || tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Statistics Overview */}
        {activeTab === 'overview' && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
          >
            <StatCard
              icon={<Truck className="text-blue-600" size={24} />}
              label={t('totalResources') || 'Total Resources'}
              value={stats.totalResources}
              color="blue"
            />
            <StatCard
              icon={<CheckCircle className="text-green-600" size={24} />}
              label={t('availableResources') || 'Available'}
              value={stats.totalAvailable}
              color="green"
            />
            <StatCard
              icon={<Zap className="text-orange-600" size={24} />}
              label={t('deployedResources') || 'Deployed'}
              value={stats.totalDeployed}
              color="orange"
            />
            <StatCard
              icon={<TrendingUp className="text-purple-600" size={24} />}
              label={t('utilizationRate') || 'Utilization'}
              value={`${stats.utilizationRate}%`}
              color="purple"
            />
            <StatCard
              icon={<Users className="text-indigo-600" size={24} />}
              label={t('operational') || 'Operational'}
              value={stats.operationalCount}
              color="indigo"
            />
          </motion.div>
        )}

        {/* Resources List */}
        {activeTab === 'resources' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">{t('noResources') || 'No resources found'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map(resource => (
                  <ResourceCard key={resource._id} resource={resource} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deployments Tab */}
        {activeTab === 'deployments' && (
          <div className="bg-white rounded-lg p-6 text-center text-gray-600">
            {t('deploymentHistoryComingSoon') || 'Deployment history and tracking coming soon...'}
          </div>
        )}

        {/* Add/Edit Resource Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingResource ? t('editResource') : t('createNewResource')}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder={t('resourceName') || 'Resource Name'}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">{t('selectType') || 'Select Type'}</option>
                      {RESOURCE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">{t('selectCategory') || 'Select Category'}</option>
                      {RESOURCE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder={t('totalQuantity') || 'Total Quantity'}
                      value={formData.totalQuantity}
                      onChange={e => setFormData({ ...formData, totalQuantity: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min="1"
                    />
                  </div>

                  <textarea
                    placeholder={t('description') || 'Description'}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder={t('responseTime') || 'Response Time (min)'}
                      value={formData.responseTime}
                      onChange={e => setFormData({ ...formData, responseTime: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder={t('maxDistance') || 'Max Distance (km)'}
                      value={formData.maxDeploymentDistance}
                      onChange={e => setFormData({ ...formData, maxDeploymentDistance: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {RESOURCE_PRIORITY.map(p => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder={t('specializations') || 'Specializations (comma-separated)'}
                      value={formData.specializations}
                      onChange={e => setFormData({ ...formData, specializations: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder={t('baseLocation') || 'Base Location'}
                    value={formData.baseLocation}
                    onChange={e => setFormData({ ...formData, baseLocation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                    >
                      {t('cancel') || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="inline animate-spin mr-2" size={18} />
                      ) : null}
                      {editingResource ? t('update') : t('create')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`bg-white rounded-lg p-6 shadow-md border-t-4 border-${color}-500`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 bg-${color}-100 rounded-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </motion.div>
);

export default ResourceAllocationPage;
