import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Shield, ShieldCheck, ShieldX,
  Camera, Save, Loader2, Building2, Briefcase, CreditCard, Clock,
  ArrowRight, Pencil, X, Check, Trash2, MapPin, Navigation, Search, MousePointer2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { authAPI, notificationAPI } from '../services/api';
import AvatarCropModal from '../components/AvatarCropModal';
import T from '../components/T';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1').replace('/api/v1', '');

const resolveAvatar = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

// ─── Map Helpers ─────────────────────────────────────────────────────
const LocationMarker = ({ position, setPosition, setAddress }) => {
  const map = useMap();
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      reverseGeocode(lat, lng, setAddress);
    },
  });
  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [position, map]);
  return position === null ? null : <Marker position={position} />;
};

const reverseGeocode = async (lat, lng, setAddress) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await response.json();
    if (data && data.display_name) setAddress(data.display_name);
  } catch (error) {
    console.error('Geocoding error:', error);
  }
};

// ─── Info Row ─────────────────────────────────────────────────────────
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

// ─── Password input ───────────────────────────────────────────────────
const PasswordField = ({ label, placeholder, value, onChange, error, show, onToggleShow }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
        <Lock size={18} />
      </div>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-field pl-11 pr-11 ${error ? 'input-error' : ''}`}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { user, getMe } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef(null);

  // ── Avatar state ──────────────────────────────────────────────
  const [cropSrc,      setCropSrc]      = useState(null);   // raw image waiting to crop
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Phone edit state ──────────────────────────────────────────
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneData, setPhoneData]       = useState({ phone: user?.phone || '', currentPassword: '' });
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError]     = useState('');
  const [showPhonePass, setShowPhonePass] = useState(false);

  // ── Address edit state ────────────────────────────────────────
  const [addressEditing, setAddressEditing] = useState(false);
  const [addressData, setAddressData] = useState({
    address: user?.presentAddress?.address || '',
    lat: user?.presentAddress?.lat || null,
    lng: user?.presentAddress?.lng || null
  });
  const [mapPosition, setMapPosition] = useState(
    user?.presentAddress?.lat ? [user.presentAddress.lat, user.presentAddress.lng] : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const setAddress = useCallback((addr) => {
    setAddressData(prev => ({ ...prev, address: addr }));
  }, []);

  // ── Password state ────────────────────────────────────────────
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors]   = useState({});

  const verificationStatus = user?.verificationDoc?.status || 'none';

  // ── Avatar handlers ───────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click();

  // Step 1: file chosen → open crop modal
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Step 2: crop confirmed → upload blob
  const handleCropConfirm = async (blob) => {
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.jpg');
    setAvatarLoading(true);
    setCropSrc(null);
    try {
      await authAPI.updateAvatar(formData);
      await getMe();
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setAvatarLoading(false);
    }
  };

  // Delete avatar
  const handleDeleteAvatar = async () => {
    setDeleteLoading(true);
    try {
      await authAPI.deleteAvatar();
      await getMe();
      toast.success('Profile picture removed');
    } catch {
      toast.error('Failed to remove picture');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Phone update ──────────────────────────────────────────────
  const handlePhoneSave = async () => {
    setPhoneError('');
    if (!phoneData.phone.trim()) {
      setPhoneError('Phone number is required');
      return;
    }
    if (!phoneData.currentPassword) {
      setPhoneError('Current password is required to update phone');
      return;
    }
    setPhoneLoading(true);
    try {
      await authAPI.updatePhone({ phone: phoneData.phone.trim(), currentPassword: phoneData.currentPassword });
      await getMe();
      toast.success('Phone number updated');
      setPhoneEditing(false);
      setPhoneData((p) => ({ ...p, currentPassword: '' }));
    } catch (err) {
      setPhoneError(err.response?.data?.message || 'Failed to update phone');
    } finally {
      setPhoneLoading(false);
    }
  };

  const cancelPhoneEdit = () => {
    setPhoneEditing(false);
    setPhoneData({ phone: user?.phone || '', currentPassword: '' });
    setPhoneError('');
  };

  // ── Address update ────────────────────────────────────────────
  const handleAddressSave = async () => {
    if (!addressData.address) return toast.error('Address is required');
    setAddressLoading(true);
    try {
      await authAPI.updateAddress({
        address: addressData.address,
        lat: mapPosition?.[0],
        lng: mapPosition?.[1]
      });
      await getMe();
      toast.success('Present address updated');
      setAddressEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address');
    } finally {
      setAddressLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapPosition([latitude, longitude]);
        reverseGeocode(latitude, longitude, setAddress);
        setIsLocating(false);
      },
      () => {
        toast.error('Unable to retrieve location');
        setIsLocating(false);
      }
    );
  };

  const searchLocation = async () => {
    if (!addressData.address.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressData.address)}&limit=1`);
      const data = await response.json();
      if (data?.[0]) {
        const { lat, lon, display_name } = data[0];
        setMapPosition([parseFloat(lat), parseFloat(lon)]);
        setAddressData(prev => ({ ...prev, address: display_name }));
      } else {
        toast.error('Location not found');
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // ── Password change ───────────────────────────────────────────
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
      await authAPI.changePassword?.({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword })
        ?? await import('../services/api').then(({ default: api }) =>
            api.put('/auth/change-password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }));
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Verification status banner ────────────────────────────────
  const VerificationStatus = () => {
    const statusMap = {
      none:     { icon: Shield,      color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-200',
        label: <T en="Not Verified" />,
        desc:  <T en="Submit your identity document to get verified and start filing complaints." /> },
      pending:  { icon: Clock,       color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200',
        label: <T en="Verification Pending" />,
        desc:  <T en="Your document is under review. This usually takes 1-2 business days." /> },
      approved: { icon: ShieldCheck, color: 'text-green-600',  bg: 'bg-green-50 border-green-200',
        label: <T en="Verified" />,
        desc:  <T en="Your identity has been verified. You can now submit complaints." /> },
      rejected: { icon: ShieldX,     color: 'text-red-600',    bg: 'bg-red-50 border-red-200',
        label: <T en="Verification Rejected" />,
        desc:  user?.verificationDoc?.rejectionReason
          ? <T en={user.verificationDoc.rejectionReason} />
          : <T en="Your document was rejected. Please resubmit with a valid document." /> },
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

  const tabs = [
    { id: 'profile',      label: <T en="Profile" />,      icon: User   },
    { id: 'security',     label: <T en="Security" />,     icon: Lock   },
    { id: 'verification', label: <T en="Verification" />, icon: Shield },
  ];

  const displayAvatar = resolveAvatar(user?.avatar);

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-6"><T en="My Profile" /></h1>
      </motion.div>

      {/* ─── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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

        {/* ─── Profile Tab ─────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            {/* Avatar row */}
            <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
              <div className="relative flex-shrink-0">
                {/* Avatar display */}
                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-gray-100">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt={user?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center">
                      <span className="text-2xl font-bold text-teal-700">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Camera button */}
                <button
                  onClick={handleAvatarClick}
                  disabled={avatarLoading || deleteLoading}
                  title="Change profile picture"
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg hover:bg-teal-600 active:scale-95 transition-all disabled:opacity-60"
                >
                  {avatarLoading
                    ? <Loader2 size={14} className="text-white animate-spin" />
                    : <Camera size={14} className="text-white" />
                  }
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded ${
                  user?.role === 'department_officer' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                }`}>
                  {user?.role === 'department_officer' ? <T en="Public Servant" /> : <T en="Citizen" />}
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleAvatarClick}
                    disabled={avatarLoading || deleteLoading}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                  >
                    {displayAvatar ? 'Change photo' : 'Upload photo'}
                  </button>
                  {displayAvatar && (
                    <>
                      <span className="text-gray-200 text-xs">|</span>
                      <button
                        onClick={handleDeleteAvatar}
                        disabled={avatarLoading || deleteLoading}
                        className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 font-medium disabled:opacity-50"
                      >
                        {deleteLoading
                          ? <Loader2 size={10} className="animate-spin" />
                          : <Trash2 size={10} />
                        }
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Crop modal — rendered outside the card flow so it overlays everything */}
            {cropSrc && (
              <AvatarCropModal
                imageSrc={cropSrc}
                onConfirm={handleCropConfirm}
                onCancel={() => setCropSrc(null)}
              />
            )}

            {/* Info rows */}
            <div className="space-y-4">
              <InfoRow icon={User} label={<T en="Full Name" />} value={user?.name} />
              <InfoRow icon={Mail} label={<T en="Email" />}     value={user?.email} />

              {/* Phone — editable */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone size={16} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs text-gray-400"><T en="Phone" /></p>
                    {!phoneEditing && (
                      <button
                        onClick={() => { setPhoneEditing(true); setPhoneData((p) => ({ ...p, phone: user?.phone || '' })); }}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <Pencil size={11} />
                        {user?.phone ? 'Edit' : 'Add'}
                      </button>
                    )}
                  </div>

                  {phoneEditing ? (
                    <div className="space-y-2 mt-1">
                      <input
                        type="tel"
                        value={phoneData.phone}
                        onChange={(e) => { setPhoneData((p) => ({ ...p, phone: e.target.value })); setPhoneError(''); }}
                        placeholder="e.g. 01712345678"
                        className="input-field text-sm py-2"
                      />
                      <div className="relative">
                        <input
                          type={showPhonePass ? 'text' : 'password'}
                          value={phoneData.currentPassword}
                          onChange={(e) => { setPhoneData((p) => ({ ...p, currentPassword: e.target.value })); setPhoneError(''); }}
                          placeholder="Current password to confirm"
                          className="input-field text-sm py-2 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPhonePass((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPhonePass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handlePhoneSave}
                          disabled={phoneLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                        >
                          {phoneLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          Save
                        </button>
                        <button
                          onClick={cancelPhoneEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <X size={13} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm font-medium ${user?.phone ? 'text-gray-900' : 'text-gray-300 italic'}`}>
                      {user?.phone || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              {/* Present Address — editable with Map */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={16} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs text-gray-400"><T en="Present Address" /></p>
                    {!addressEditing && (
                      <button
                        onClick={() => setAddressEditing(true)}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <Pencil size={11} />
                        {user?.presentAddress?.address ? 'Edit' : 'Add'}
                      </button>
                    )}
                  </div>

                  {addressEditing ? (
                    <div className="space-y-3 mt-1">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={addressData.address}
                          onChange={(e) => setAddressData(p => ({ ...p, address: e.target.value }))}
                          placeholder="Search your area..."
                          className="input-field text-sm py-2"
                        />
                        <button
                          type="button"
                          onClick={searchLocation}
                          disabled={isSearching}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </button>
                      </div>

                      <div className="h-[200px] w-full rounded-xl overflow-hidden border border-gray-100 relative z-0">
                        <MapContainer
                          center={mapPosition || [23.8103, 90.4125]}
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <LocationMarker position={mapPosition} setPosition={setMapPosition} setAddress={setAddress} />
                        </MapContainer>
                        <div className="absolute bottom-2 left-2 z-[1000] bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md text-[9px] font-medium text-gray-500">
                          Click map to pin location
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                         <button
                            type="button"
                            onClick={getCurrentLocation}
                            disabled={isLocating}
                            className="flex items-center gap-1 text-[11px] text-teal-600 font-medium"
                          >
                            <Navigation size={12} />
                            Use My Location
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={handleAddressSave}
                              disabled={addressLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                            >
                              {addressLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              Save
                            </button>
                            <button
                              onClick={() => setAddressEditing(false)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <X size={13} />
                              Cancel
                            </button>
                          </div>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm font-medium leading-relaxed ${user?.presentAddress?.address ? 'text-gray-900' : 'text-gray-300 italic'}`}>
                      {user?.presentAddress?.address || 'Not set'}
                    </p>
                  )}
                </div>
              </div>

              {/* Department officer extra fields */}
              {user?.role === 'department_officer' && (
                <>
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                      <T en="Official Details" />
                    </p>
                  </div>
                  <InfoRow icon={Building2}  label={<T en="Department" />}       value={user?.department?.replace('_', ' ')} />
                  <InfoRow icon={CreditCard} label={<T en="Employee ID" />}      value={user?.employeeId} />
                  <InfoRow icon={Mail}       label={<T en="Government Email" />} value={user?.governmentEmail} />
                  <InfoRow icon={Briefcase}  label={<T en="Designation" />}      value={user?.designation} />
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Security Tab ────────────────────────────────────── */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1"><T en="Change Password" /></h3>
            <p className="text-sm text-gray-500 mb-6">
              <T en="Update your password to keep your account secure" />
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {['currentPassword', 'newPassword', 'confirmPassword'].map((name) => (
                <PasswordField
                  key={name}
                  name={name}
                  label={
                    name === 'currentPassword' ? <T en="Current Password" /> :
                    name === 'newPassword'     ? <T en="New Password" />     :
                                                <T en="Confirm New Password" />
                  }
                  placeholder={
                    name === 'currentPassword' ? 'Current password' :
                    name === 'newPassword'     ? 'New password'     :
                                                'Confirm new password'
                  }
                  value={passwordData[name]}
                  onChange={(e) => {
                    setPasswordData((p) => ({ ...p, [name]: e.target.value }));
                    if (passwordErrors[name]) setPasswordErrors((p) => ({ ...p, [name]: '' }));
                  }}
                  error={passwordErrors[name]}
                  show={showPasswords[name]}
                  onToggleShow={() => setShowPasswords((p) => ({ ...p, [name]: !p[name] }))}
                />
              ))}

              <motion.button
                type="submit"
                disabled={passwordLoading}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: passwordLoading ? 1 : 1.01 }}
                whileTap={{ scale: passwordLoading ? 1 : 0.99 }}
              >
                {passwordLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{passwordLoading ? <T en="Updating..." /> : <T en="Update Password" />}</span>
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* ─── Verification Tab ────────────────────────────────── */}
        {activeTab === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1"><T en="Account Verification" /></h3>
            <p className="text-sm text-gray-500 mb-6">
              <T en="Verify your identity to file complaints and participate fully" />
            </p>

            <VerificationStatus />

            {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
              <Link
                to="/verify"
                className="mt-6 flex items-center justify-center gap-2 btn-primary w-full"
              >
                <ShieldCheck size={18} />
                <span><T en="Submit for Verification" /></span>
                <ArrowRight size={18} />
              </Link>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </DashboardLayout>
  );
};

export default ProfilePage;
