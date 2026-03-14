import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Camera,
  Save,
  Loader2,
  Building2,
  Briefcase,
  CreditCard,
  BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import ServantLayout from '../../components/layout/ServantLayout';
import api, { authAPI } from '../../services/api';
import T from '../../components/T';

const DEPT_DISPLAY = {
  public_works:    'Public Works',
  water_authority: 'Water Authority',
  electricity:     'Electricity',
  sanitation:      'Sanitation',
  public_safety:   'Public Safety',
  animal_control:  'Animal Control',
  environment:     'Environment',
  health:          'Health',
  transport:       'Transport',
  other:           'General Administration',
};

// ─── Info Row ──────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, muted, emptyLabel }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-gray-400" />
    </div>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${muted ? 'text-gray-300 italic' : 'text-gray-900'}`}>
        {value || emptyLabel || '—'}
      </p>
    </div>
  </div>
);

// ─── Password input ────────────────────────────────────────────────────
const PasswordField = ({ name, label, placeholder, value, onChange, error, showPw, onToggle }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
        <Lock size={18} />
      </div>
      <input
        type={showPw ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm outline-none transition-all ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
        }`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const ServantProfilePage = () => {
  const { user, getMe } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // ── Change password state ──
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  // ── Change phone state ──
  const [phoneData, setPhoneData] = useState({ phone: '', currentPassword: '' });
  const [showPhonePw, setShowPhonePw] = useState(false);
  const [phoneErrors, setPhoneErrors] = useState({});
  const [phoneLoading, setPhoneLoading] = useState(false);

  const deptLabel = DEPT_DISPLAY[user?.department] || user?.department || '—';
  const nid = user?.verificationDoc?.documentNumber;
  const maskedNid = nid ? '●●●●●●' + nid.slice(-4) : '—';
  const verifiedAt = user?.verificationDoc?.verifiedAt
    ? new Date(user.verificationDoc.verifiedAt).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwData.currentPassword) errs.currentPassword = 'Current password is required';
    if (!pwData.newPassword || pwData.newPassword.length < 8) errs.newPassword = 'Must be at least 8 characters';
    if (pwData.newPassword !== pwData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwData.currentPassword, newPassword: pwData.newPassword });
      toast.success('Password updated successfully');
      setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  const handlePhoneChange = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!phoneData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^(\+880|0)?1[3-9]\d{8}$/.test(phoneData.phone.trim())) {
      errs.phone = 'Enter a valid BD phone number';
    }
    if (!phoneData.currentPassword) errs.currentPassword = 'Password is required to confirm';
    setPhoneErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPhoneLoading(true);
    try {
      await authAPI.updatePhone({ phone: phoneData.phone.trim(), currentPassword: phoneData.currentPassword });
      toast.success('Phone number updated');
      setPhoneData({ phone: '', currentPassword: '' });
      await getMe();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update phone');
    } finally {
      setPhoneLoading(false);
    }
  };

  const tabs = [
    { id: 'profile',      labelEn: 'Profile',       icon: User },
    { id: 'security',     labelEn: 'Security',      icon: Lock },
    { id: 'verification', labelEn: 'Verification',  icon: ShieldCheck },
  ];

  return (
    <ServantLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-6"><T en="My Profile" /></h1>
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              <T en={tab.labelEn} />
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-700">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                {/* Green verified tick */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <ShieldCheck size={14} className="text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                {user?.designation && (
                  <p className="text-sm text-blue-600 font-medium">{user.designation}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {deptLabel}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow icon={User}     label={<T en="Full Name" />}  value={user?.name} />
              <InfoRow icon={Mail}     label={<T en="Email" />}     value={user?.email} />
              <InfoRow icon={Phone}    label={<T en="Phone" />}     value={user?.phone} muted={!user?.phone} emptyLabel={<T en="Not provided" />} />

              <div className="border-t border-gray-100 pt-4 mt-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3"><T en="Official Details" /></p>
              </div>
              <InfoRow icon={Building2}  label={<T en="Department" />}       value={deptLabel} />
              <InfoRow icon={CreditCard} label={<T en="Employee ID" />}      value={user?.employeeId} />
              <InfoRow icon={BadgeCheck} label={<T en="Government Email" />} value={user?.governmentEmail} />
              <InfoRow icon={Briefcase}  label={<T en="Designation" />}      value={user?.designation} />
            </div>
          </motion.div>
        )}

        {/* ── Security Tab ── */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            className="space-y-6 max-w-2xl"
          >
            {/* Change password */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-1"><T en="Change Password" /></h3>
              <p className="text-sm text-gray-500 mb-6"><T en="Update your login password" /></p>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <PasswordField
                  name="currentPassword" label="Current Password" placeholder="Current password"
                  value={pwData.currentPassword} onChange={(e) => setPwData((p) => ({ ...p, currentPassword: e.target.value }))}
                  error={pwErrors.currentPassword} showPw={showPw.current} onToggle={() => setShowPw((p) => ({ ...p, current: !p.current }))}
                />
                <PasswordField
                  name="newPassword" label="New Password" placeholder="New password (min 8 chars)"
                  value={pwData.newPassword} onChange={(e) => setPwData((p) => ({ ...p, newPassword: e.target.value }))}
                  error={pwErrors.newPassword} showPw={showPw.new} onToggle={() => setShowPw((p) => ({ ...p, new: !p.new }))}
                />
                <PasswordField
                  name="confirmPassword" label="Confirm New Password" placeholder="Repeat new password"
                  value={pwData.confirmPassword} onChange={(e) => setPwData((p) => ({ ...p, confirmPassword: e.target.value }))}
                  error={pwErrors.confirmPassword} showPw={showPw.confirm} onToggle={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                />
                <button
                  type="submit" disabled={pwLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {pwLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {pwLoading ? <T en="Updating..." /> : <T en="Update Password" />}
                </button>
              </form>
            </div>

            {/* Change phone */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-1"><T en="Change Phone Number" /></h3>
              <p className="text-sm text-gray-500 mb-6">
                <T en="Current" />: <span className="font-medium text-gray-700">{user?.phone || <T en="Not set" />}</span>
              </p>

              <form onSubmit={handlePhoneChange} className="space-y-4">
                {/* New phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5"><T en="New Phone Number" /></label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      autoComplete="off"
                      value={phoneData.phone}
                      onChange={(e) => { setPhoneData((p) => ({ ...p, phone: e.target.value })); setPhoneErrors((p) => ({ ...p, phone: '' })); }}
                      placeholder="+880 1XXXXXXXXX"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                        phoneErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  {phoneErrors.phone && <p className="text-red-500 text-xs mt-1">{phoneErrors.phone}</p>}
                </div>

                {/* Confirm with password */}
                <PasswordField
                  name="phonePassword" label="Confirm with Current Password" placeholder="Enter your password"
                  value={phoneData.currentPassword} onChange={(e) => { setPhoneData((p) => ({ ...p, currentPassword: e.target.value })); setPhoneErrors((p) => ({ ...p, currentPassword: '' })); }}
                  error={phoneErrors.currentPassword} showPw={showPhonePw} onToggle={() => setShowPhonePw((p) => !p)}
                />

                <button
                  type="submit" disabled={phoneLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {phoneLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {phoneLoading ? <T en="Updating..." /> : <T en="Update Phone" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ── Verification Tab ── */}
        {activeTab === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1"><T en="Account Verification" /></h3>
            <p className="text-sm text-gray-500 mb-6"><T en="Your identity verification status" /></p>

            {/* Verified badge */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={28} className="text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-700"><T en="Verified" /></p>
                <p className="text-sm text-green-600 mt-0.5">
                  <T en="Your identity has been verified via National ID." />
                </p>
                {verifiedAt && (
                  <p className="text-xs text-green-500 mt-1"><T en="Verified on" /> {verifiedAt}</p>
                )}
              </div>
            </div>

            {/* NID info */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CreditCard size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400"><T en="Document Type" /></p>
                  <p className="text-sm font-medium text-gray-800"><T en="National ID Card (NID)" /></p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <ShieldCheck size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400"><T en="NID Number" /></p>
                  <p className="text-sm font-medium text-gray-800 font-mono">{maskedNid}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ServantLayout>
  );
};

export default ServantProfilePage;
