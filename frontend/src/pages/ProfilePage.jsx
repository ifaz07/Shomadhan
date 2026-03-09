import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Upload,
  Camera,
  Save,
  Loader2,
  Building2,
  Briefcase,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // ─── Password change state ─────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const verificationStatus = user?.verificationDoc?.status || 'none';

  // ─── Password change handler ───────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!passwordData.currentPassword) errs.currentPassword = 'Current password is required';
    if (!passwordData.newPassword) {
      errs.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errs.newPassword = 'Must be at least 8 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ─── Verification status display ───────────────────────────────
  const VerificationStatus = () => {
    const statusMap = {
      none: { icon: Shield, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: 'Not Verified', desc: 'Submit your identity document to get verified and start filing complaints.' },
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Verification Pending', desc: 'Your document is under review.' },
      approved: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Verified', desc: 'Your identity has been verified. You can now submit complaints.' },
      rejected: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Verification Rejected', desc: user?.verificationDoc?.rejectionReason || 'Your document was rejected. Please resubmit.' },
    };
    const s = statusMap[verificationStatus];
    const Icon = s.icon;

    return (
      <div className={`${s.bg} border rounded-2xl p-4 flex items-center justify-between gap-4 mt-6`}>
        <div className="flex items-start gap-3">
          <Icon size={24} className={`${s.color} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`font-bold text-base ${s.color}`}>{s.label}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
          </div>
        </div>
        {verificationStatus !== 'approved' && (
          <Link
            to="/verify"
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            {verificationStatus === 'none' || verificationStatus === 'rejected' ? 'Verify Now' : 'Check Status'}
            <ArrowRight size={14} />
          </Link>
        )}
      </div>
    );
  };

  // ─── Password input helper ─────────────────────────────────────
  const PasswordField = ({ name, label, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          <Lock size={18} />
        </div>
        <input
          type={showPasswords[name] ? 'text' : 'password'}
          value={passwordData[name]}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            setPasswordData((p) => ({ ...p, [name]: e.target.value }));
            if (passwordErrors[name]) setPasswordErrors((p) => ({ ...p, [name]: '' }));
          }}
          placeholder={placeholder}
          className={`input-field pl-11 pr-11 ${passwordErrors[name] ? 'input-error' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShowPasswords((p) => ({ ...p, [name]: !p[name] }))}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPasswords[name] ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {passwordErrors[name] && (
        <p className="text-red-500 text-xs mt-1">{passwordErrors[name]}</p>
      )}
    </div>
  );

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
      </motion.div>

      {/* ─── Tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Profile Tab ──────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-teal-700">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center shadow-md hover:bg-teal-600 transition-colors">
                  <Camera size={14} className="text-white" />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                    user?.role === 'department_officer' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {user?.role === 'department_officer' ? 'Public Servant' : 'Citizen'}
                  </span>
                  {user?.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Status Banner */}
            <VerificationStatus />

            {/* Info Fields */}
            <div className="space-y-4 mt-8">
              <InfoRow icon={User} label="Full Name" value={user?.name} />
              <InfoRow icon={Mail} label="Email" value={user?.email} />
              <InfoRow icon={Phone} label="Phone" value={user?.phone || 'Not provided'} muted={!user?.phone} />
              {user?.role === 'department_officer' && (
                <>
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Official Details</p>
                  </div>
                  <InfoRow icon={Building2} label="Department" value={user?.department?.replace('_', ' ')} />
                  <InfoRow icon={CreditCard} label="Employee ID" value={user?.employeeId} />
                  <InfoRow icon={Mail} label="Government Email" value={user?.governmentEmail} />
                  <InfoRow icon={Briefcase} label="Designation" value={user?.designation} />
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Security Tab ─────────────────────────────────────── */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Change Password</h3>
            <p className="text-sm text-gray-500 mb-6">Update your password to keep your account secure</p>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <PasswordField name="currentPassword" label="Current Password" placeholder="Enter current password" />
              <PasswordField name="newPassword" label="New Password" placeholder="Enter new password" />
              <PasswordField name="confirmPassword" label="Confirm New Password" placeholder="Re-enter new password" />

              <motion.button
                type="submit"
                disabled={passwordLoading}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: passwordLoading ? 1 : 1.01 }}
                whileTap={{ scale: passwordLoading ? 1 : 0.99 }}
              >
                {passwordLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>{passwordLoading ? 'Updating...' : 'Update Password'}</span>
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

// ─── Info Row Component ──────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, muted }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-gray-400" />
    </div>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${muted ? 'text-gray-300 italic' : 'text-gray-900'}`}>
        {value || '—'}
      </p>
    </div>
  </div>
);

export default ProfilePage;
