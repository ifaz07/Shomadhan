import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CheckCircle2,
  Clock,
  Star,
  Plus,
  Search,
  Filter,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { volunteerAPI } from '../services/api';

const VolunteerManagementPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('register'); // 'register', 'profile', 'manage'
  const [loading, setLoading] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    district: '',
    skills: [],
    availability: 'part_time',
    bio: '',
    agreedToTerms: false,
  });

  useEffect(() => {
    if (user?.role === 'citizen') {
      fetchVolunteerProfile();
    } else if (user?.role === 'mayor' || user?.role === 'admin') {
      fetchVolunteers();
    }
  }, [user]);

  const fetchVolunteerProfile = async () => {
    try {
      const response = await volunteerAPI.getProfile();
      setProfile(response.data.data);
      setActiveTab('profile');
    } catch (error) {
      // Profile not found, user can register
      setActiveTab('register');
    }
  };

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const response = await volunteerAPI.getAll('verified');
      setVolunteers(response.data.data);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      toast.error('Failed to fetch volunteers');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVolunteer = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await volunteerAPI.register(formData);
      toast.success('Volunteer registration submitted! Awaiting verification.');
      setShowRegistrationForm(false);
      fetchVolunteerProfile();
    } catch (error) {
      console.error('Error registering volunteer:', error);
      toast.error(error.response?.data?.message || 'Failed to register as volunteer');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { fullName, phone, address, ...updateData } = formData;
      await volunteerAPI.updateProfile(updateData);
      toast.success('Profile updated successfully');
      fetchVolunteerProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Citizen view: Register or view profile
  if (user?.role === 'citizen') {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer Management</h1>
            <p className="text-gray-600">Register and manage your volunteer activities</p>
          </div>

          {!profile ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200"
            >
              <div className="max-w-md mx-auto text-center">
                <Users size={48} className="mx-auto text-blue-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Our Volunteer Network</h2>
                <p className="text-gray-600 mb-6">
                  Register as a volunteer to help improve your community through civic announcements and public service initiatives.
                </p>
                <button
                  onClick={() => setShowRegistrationForm(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                >
                  <Plus size={18} /> Register as Volunteer
                </button>
              </div>

              {showRegistrationForm && (
                <VolunteerRegistrationForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleRegisterVolunteer}
                  loading={loading}
                  onClose={() => setShowRegistrationForm(false)}
                />
              )}
            </motion.div>
          ) : (
            <VolunteerProfileView profile={profile} onUpdateProfile={handleUpdateProfile} loading={loading} />
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Authority/Admin view: Manage volunteers
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer Management</h1>
            <p className="text-gray-600">Review and manage registered volunteers</p>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition flex items-center gap-2">
              <Filter size={18} /> Filter
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Export List
            </button>
          </div>
        </div>

        {/* Volunteer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {volunteers.map((volunteer) => (
            <VolunteerCard key={volunteer._id} volunteer={volunteer} />
          ))}
        </div>

        {volunteers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No verified volunteers yet</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// ─── Helper Components ──────────────────────────────────────────────

const VolunteerRegistrationForm = ({ formData, setFormData, onSubmit, loading, onClose }) => {
  const skills = [
    'construction',
    'cleaning',
    'first_aid',
    'education',
    'counseling',
    'driving',
    'technical_support',
    'community_outreach',
    'documentation',
  ];

  const toggleSkill = (skill) => {
    setFormData({
      ...formData,
      skills: formData.skills.includes(skill)
        ? formData.skills.filter((s) => s !== skill)
        : [...formData.skills, skill],
    });
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
          <h2 className="text-2xl font-bold text-gray-900">Volunteer Registration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="text"
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="District"
            value={formData.district}
            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    formData.skills.includes(skill)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {skill.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <select
            value={formData.availability}
            onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="weekends_only">Weekends Only</option>
            <option value="flexible">Flexible</option>
          </select>

          <textarea
            placeholder="Bio (optional)"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreedToTerms}
              onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">I agree to the volunteer terms and conditions</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const VolunteerProfileView = ({ profile, onUpdateProfile, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-8 border border-gray-100"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
            {profile.fullName.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{profile.fullName}</h2>
          <p className="text-gray-600">
            <CheckCircle2 className="inline mr-1" size={16} />
            {profile.status === 'verified' ? 'Verified Volunteer' : 'Pending Verification'}
          </p>
        </div>

        <div>
          <Stat label="Status" value={profile.status} />
          <Stat label="Activities Completed" value={profile.completedActivities} />
          <Stat label="Hours Contributed" value={`${profile.hoursContributed}h`} />
        </div>

        <div>
          <Stat label="Rating" value={`${profile.rating}/5`} />
          <Stat label="Availability" value={profile.availability.replace(/_/g, ' ')} />
          <Stat label="Active Announcements" value={profile.activeAnnouncements.length} />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Contact Information</h3>
            <p className="text-gray-700 mb-1">{profile.email}</p>
            <p className="text-gray-700 mb-1">{profile.phone}</p>
            <p className="text-gray-700">{profile.district}</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {skill.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {profile.bio && (
          <div className="mt-4">
            <h3 className="font-bold text-gray-900 mb-2">Bio</h3>
            <p className="text-gray-700">{profile.bio}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const VolunteerCard = ({ volunteer }) => {
  const statusColors = {
    verified: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {volunteer.fullName.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{volunteer.fullName}</h3>
            <p className="text-xs text-gray-600">{volunteer.district}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[volunteer.status]}`}>
          {volunteer.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Users size={14} /> {volunteer.skills.length} skills
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock size={14} /> {volunteer.completedActivities} activities
        </div>
        <div className="flex items-center gap-2 text-sm text-yellow-600">
          <Star size={14} /> {volunteer.rating}/5
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium">
          View Profile
        </button>
        <button className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium">
          Assign Task
        </button>
      </div>
    </motion.div>
  );
};

const Stat = ({ label, value }) => (
  <div className="mb-4">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default VolunteerManagementPage;
