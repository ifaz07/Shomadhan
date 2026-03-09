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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';

// ─── Verification document types ─────────────────────────────────────
const DOC_TYPES = [
  { value: 'nid', label: 'National ID Card (NID)' },
  { value: 'passport', label: 'Passport' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
];

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

  // ─── Verification state ────────────────────────────────────────
  const [verDocType, setVerDocType] = useState('nid');
  const [verDocNumber, setVerDocNumber] = useState('');
  const [verFile, setVerFile] = useState(null);
  const [verLoading, setVerLoading] = useState(false);

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

  // ─── Verification submit handler ───────────────────────────────
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!verDocNumber.trim()) {
      toast.error('Please enter your document number');
      return;
    }
    if (!verFile) {
      toast.error('Please upload your document');
      return;
    }

    setVerLoading(true);
    try {
      // TODO: integrate Cloudinary upload for verFile, then send URL to API
      const formData = new FormData();
      formData.append('docType', verDocType);
      formData.append('documentNumber', verDocNumber);
      formData.append('file', verFile);

      await api.post('/auth/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success("Verification document submitted! We'll review it shortly.");
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification submission failed');
    } finally {
      setVerLoading(false);
    }
  };

  // ─── Verification status display ───────────────────────────────
  const VerificationStatus = () => {
    const statusMap = {
      none: { icon: Shield, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: 'Not Verified', desc: 'Submit your identity document to get verified and start filing complaints.' },
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Verification Pending', desc: 'Your document is under review. This usually takes 1-2 business days.' },
      approved: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Verified', desc: 'Your identity has been verified. You can now submit complaints.' },
      rejected: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Verification Rejected', desc: user?.verificationDoc?.rejectionReason || 'Your document was rejected. Please resubmit with a valid document.' },
    };
    const s = statusMap[verificationStatus];
    const Icon = s.icon;

    return (
      <div className={`${s.bg} border rounded-xl p-4 flex items-start gap-3`}>
        <Icon size={20} className={`${s.color} flex-shrink-0 mt-0.5`} />
        <div>
          <p className={`font-semibold text-sm ${s.color}`}>{s.label}</p>
          <p className="text-xs text-gray-600 mt-0.5">{s.desc}</p>
        </div>
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
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'verification', label: 'Verification', icon: Shield },
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
              {tab.id === 'verification' && verificationStatus === 'none' && (
                <span className="w-2 h-2 rounded-full bg-orange-400" />
              )}
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
                <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded ${
                  user?.role === 'department_officer' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                }`}>
                  {user?.role === 'department_officer' ? 'Public Servant' : 'Citizen'}
                </span>
              </div>
            </div>

            {/* Info Fields */}
            <div className="space-y-4">
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

        {/* ─── Verification Tab ─────────────────────────────────── */}
        {activeTab === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Account Verification</h3>
            <p className="text-sm text-gray-500 mb-6">
              Verify your identity to file complaints and participate fully
            </p>

            <VerificationStatus />

            {/* Show form only if not verified and not pending */}
            {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
              <form onSubmit={handleVerificationSubmit} className="mt-6 space-y-4">
                {/* Doc type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DOC_TYPES.map((doc) => (
                      <button
                        key={doc.value}
                        type="button"
                        onClick={() => setVerDocType(doc.value)}
                        className={`p-3 rounded-xl border-2 text-center transition-all text-xs font-medium ${
                          verDocType === doc.value
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {doc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doc number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Number</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <FileText size={18} />
                    </div>
                    <input
                      type="text"
                      value={verDocNumber}
                      onChange={(e) => setVerDocNumber(e.target.value)}
                      placeholder={verDocType === 'nid' ? 'e.g. 1234567890' : verDocType === 'passport' ? 'e.g. AB1234567' : 'e.g. BC-2000-12345'}
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Document</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer">
                    {verFile ? (
                      <div className="flex items-center gap-2 text-teal-600">
                        <CheckCircle2 size={20} />
                        <span className="text-sm font-medium">{verFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Upload size={28} />
                        <span className="text-xs">Click to upload (JPG, PNG, PDF — max 5MB)</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setVerFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                <motion.button
                  type="submit"
                  disabled={verLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  whileHover={{ scale: verLoading ? 1 : 1.01 }}
                  whileTap={{ scale: verLoading ? 1 : 0.99 }}
                >
                  {verLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  <span>{verLoading ? 'Submitting...' : 'Submit for Verification'}</span>
                </motion.button>
              </form>
            )}
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
