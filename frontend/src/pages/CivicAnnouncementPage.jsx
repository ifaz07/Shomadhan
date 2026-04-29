import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar,
  Users,
  Eye,
  Edit2,
  Trash2,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { announcementAPI } from '../services/api';

const CivicAnnouncementPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userRole] = useState(user?.role);

  useEffect(() => {
    fetchAnnouncements();
  }, [searchTerm, categoryFilter]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementAPI.getAll(categoryFilter, 'published', null, searchTerm);
      setAnnouncements(response.data.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Civic Announcements</h1>
            <p className="text-gray-600">Community news and volunteer opportunities</p>
          </div>

          {(userRole === 'mayor' || userRole === 'admin' || userRole === 'department_officer') && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={18} /> New Announcement
            </button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="volunteer_request">Volunteer Request</option>
            <option value="community_service">Community Service</option>
            <option value="public_notice">Public Notice</option>
            <option value="emergency_alert">Emergency Alert</option>
            <option value="educational_program">Educational Program</option>
          </select>
        </div>

        {/* Announcements Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : announcements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((announcement) => (
              <AnnouncementCard key={announcement._id} announcement={announcement} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Megaphone size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No announcements found</p>
          </div>
        )}

        {/* Create Form Modal */}
        {showCreateForm && (
          <CreateAnnouncementForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false);
              fetchAnnouncements();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// ─── Helper Components ──────────────────────────────────────────────

const AnnouncementCard = ({ announcement }) => {
  const getCategoryColor = (category) => {
    const colors = {
      volunteer_request: 'bg-blue-100 text-blue-700',
      community_service: 'bg-green-100 text-green-700',
      public_notice: 'bg-purple-100 text-purple-700',
      emergency_alert: 'bg-red-100 text-red-700',
      educational_program: 'bg-yellow-100 text-yellow-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(announcement.category)}`}>
          {announcement.category.replace(/_/g, ' ')}
        </span>
        {announcement.priority === 'urgent' && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">URGENT</span>
        )}
      </div>

      {/* Title & Description */}
      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{announcement.title}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{announcement.description}</p>

      {/* Image */}
      {announcement.imageUrl && (
        <img src={announcement.imageUrl} alt={announcement.title} className="w-full h-40 object-cover rounded-lg mb-4" />
      )}

      {/* Meta Info */}
      <div className="space-y-2 mb-4 text-sm text-gray-600 flex-1">
        {announcement.eventDate && (
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>{formatDate(announcement.eventDate)}</span>
          </div>
        )}

        {announcement.eventLocation && (
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span className="truncate">{announcement.eventLocation}</span>
          </div>
        )}

        {announcement.volunteersNeeded > 0 && (
          <div className="flex items-center gap-2">
            <Users size={14} />
            <span>
              {announcement.registeredVolunteers.length} / {announcement.volunteersNeeded} registered
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Eye size={14} />
          <span>{announcement.viewCount} views</span>
        </div>
      </div>

      {/* Author Info */}
      <div className="border-t border-gray-100 pt-3 mb-4">
        <p className="text-xs text-gray-600">By {announcement.createdBy.name}</p>
        <p className="text-xs text-gray-500">{announcement.createdBy.department?.replace(/_/g, ' ')}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium">
          View Details
        </button>
        {announcement.category === 'volunteer_request' && (
          <button className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium">
            Register
          </button>
        )}
      </div>
    </motion.div>
  );
};

const CreateAnnouncementForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'public_notice',
    imageUrl: '',
    volunteersNeeded: 0,
    requiredSkills: [],
    eventLocation: '',
    eventDate: '',
    eventTime: '',
    targetDistricts: [],
    tags: [],
    priority: 'medium',
  });
  const [loading, setLoading] = useState(false);

  const categories = [
    'volunteer_request',
    'community_service',
    'public_notice',
    'emergency_alert',
    'educational_program',
  ];

  const skills = [
    'construction',
    'cleaning',
    'first_aid',
    'education',
    'counseling',
    'driving',
    'technical_support',
    'community_outreach',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await announcementAPI.create(formData);
      toast.success('Announcement created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error(error.response?.data?.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto"
      >
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Create Announcement</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows="2"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="Full Content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {formData.category === 'volunteer_request' && (
            <>
              <input
                type="number"
                placeholder="Volunteers Needed"
                value={formData.volunteersNeeded}
                onChange={(e) => setFormData({ ...formData, volunteersNeeded: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Event Location"
                value={formData.eventLocation}
                onChange={(e) => setFormData({ ...formData, eventLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Creating...' : 'Create Announcement'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CivicAnnouncementPage;
