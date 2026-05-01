import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  ShieldX,
  Camera,
  Save,
  Loader2,
  Building2,
  Briefcase,
  CreditCard,
  Clock,
  ArrowRight,
  Pencil,
  X,
  Check,
  Trash2,
  MapPin,
  Navigation,
  Search,
  Trophy,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import { authAPI } from "../services/api";
import AvatarCropModal from "../components/AvatarCropModal";
import T from "../components/T";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1").replace("/api/v1", "");

const ROLE_META = {
  citizen: {
    label: "Citizen",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    accent: "from-emerald-500 to-teal-500",
  },
  department_officer: {
    label: "Public Servant",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    accent: "from-blue-500 to-cyan-500",
  },
  mayor: {
    label: "Mayor",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    accent: "from-amber-500 to-orange-500",
  },
  admin: {
    label: "Admin",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    accent: "from-violet-500 to-fuchsia-500",
  },
};

const resolveAvatar = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
};

const reverseGeocode = async (lat, lng, setAddress) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    if (data?.display_name) setAddress(data.display_name);
  } catch (error) {
    console.error("Geocoding error:", error);
  }
};

const LocationMarker = ({ position, setPosition, setAddress }) => {
  const map = useMap();

  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      setPosition([lat, lng]);
      reverseGeocode(lat, lng, setAddress);
    },
  });

  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
};

const InfoRow = ({ icon: Icon, label, value, muted, emptyLabel }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${muted ? "text-slate-400 italic" : "text-slate-900"}`}>
        {value || emptyLabel || "—"}
      </p>
    </div>
  </div>
);

const PasswordField = ({ label, placeholder, value, onChange, error, show, onToggleShow }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        <Lock size={18} />
      </div>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-2xl border px-4 py-3 pl-11 pr-11 text-sm outline-none transition ${
          error
            ? "border-red-400 bg-red-50"
            : "border-slate-200 bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
        }`}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const ProfilePage = () => {
  const { user, getMe } = useAuth();
  const roleMeta = ROLE_META[user?.role] || ROLE_META.citizen;
  const hasRewards = user?.role === "citizen";
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef(null);

  const [cropSrc, setCropSrc] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneData, setPhoneData] = useState({ phone: user?.phone || "", currentPassword: "" });
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [showPhonePass, setShowPhonePass] = useState(false);

  const [addressEditing, setAddressEditing] = useState(false);
  const [addressData, setAddressData] = useState({
    address: user?.presentAddress?.address || "",
    lat: user?.presentAddress?.lat || null,
    lng: user?.presentAddress?.lng || null,
  });
  const [mapPosition, setMapPosition] = useState(
    user?.presentAddress?.lat ? [user.presentAddress.lat, user.presentAddress.lng] : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const verificationStatus = user?.verificationDoc?.status || "none";
  const displayAvatar = resolveAvatar(user?.avatar);

  const completionStats = [
    { label: "Role", value: roleMeta.label },
    { label: "Contact", value: user?.phone ? "Added" : "Missing" },
    { label: "Address", value: user?.presentAddress?.address ? "Pinned" : "Open" },
    {
      label: "Verification",
      value:
        verificationStatus === "approved"
          ? "Verified"
          : verificationStatus === "pending"
            ? "Pending"
            : verificationStatus === "rejected"
              ? "Rejected"
              : "Open",
    },
  ];

  const setAddress = useCallback((addr) => {
    setAddressData((prev) => ({ ...prev, address: addr }));
  }, []);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (blob) => {
    const formData = new FormData();
    formData.append("avatar", blob, "avatar.jpg");
    setAvatarLoading(true);
    setCropSrc(null);
    try {
      await authAPI.updateAvatar(formData);
      await getMe();
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload image");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setDeleteLoading(true);
    try {
      await authAPI.deleteAvatar();
      await getMe();
      toast.success("Profile picture removed");
    } catch {
      toast.error("Failed to remove picture");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePhoneSave = async () => {
    setPhoneError("");
    if (!phoneData.phone.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!phoneData.currentPassword) {
      setPhoneError("Current password is required to update phone");
      return;
    }

    setPhoneLoading(true);
    try {
      await authAPI.updatePhone({
        phone: phoneData.phone.trim(),
        currentPassword: phoneData.currentPassword,
      });
      await getMe();
      toast.success("Phone number updated");
      setPhoneEditing(false);
      setPhoneData((prev) => ({ ...prev, currentPassword: "" }));
    } catch (err) {
      setPhoneError(err.response?.data?.message || "Failed to update phone");
    } finally {
      setPhoneLoading(false);
    }
  };

  const cancelPhoneEdit = () => {
    setPhoneEditing(false);
    setPhoneData({ phone: user?.phone || "", currentPassword: "" });
    setPhoneError("");
  };

  const handleAddressSave = async () => {
    if (!addressData.address) {
      toast.error("Address is required");
      return;
    }

    setAddressLoading(true);
    try {
      await authAPI.updateAddress({
        address: addressData.address,
        lat: mapPosition?.[0],
        lng: mapPosition?.[1],
      });
      await getMe();
      toast.success("Present address updated");
      setAddressEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update address");
    } finally {
      setAddressLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapPosition([latitude, longitude]);
        reverseGeocode(latitude, longitude, setAddress);
        setIsLocating(false);
      },
      () => {
        toast.error("Unable to retrieve location");
        setIsLocating(false);
      }
    );
  };

  const searchLocation = async () => {
    if (!addressData.address.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          addressData.address
        )}&limit=1`
      );
      const data = await response.json();
      if (data?.[0]) {
        const { lat, lon, display_name } = data[0];
        setMapPosition([parseFloat(lat), parseFloat(lon)]);
        setAddressData((prev) => ({ ...prev, address: display_name }));
      } else {
        toast.error("Location not found");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = "Current password is required";
    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Must be at least 8 characters";
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPasswordLoading(true);
    try {
      await authAPI.changePassword?.({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }) ??
        (await import("../services/api").then(({ default: api }) =>
          api.put("/auth/change-password", {
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          })
        ));
      toast.success("Password updated successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const VerificationStatus = () => {
    const statusMap = {
      none: {
        icon: Shield,
        color: "text-slate-500",
        bg: "bg-slate-50 border-slate-200",
        label: <T en="Not Verified" />,
        desc: <T en="Submit your identity document to get verified and start filing complaints." />,
      },
      pending: {
        icon: Clock,
        color: "text-yellow-600",
        bg: "bg-yellow-50 border-yellow-200",
        label: <T en="Verification Pending" />,
        desc: <T en="Your document is under review. This usually takes 1-2 business days." />,
      },
      approved: {
        icon: ShieldCheck,
        color: "text-green-600",
        bg: "bg-green-50 border-green-200",
        label: <T en="Verified" />,
        desc: <T en="Your identity has been verified. You can now submit complaints." />,
      },
      rejected: {
        icon: ShieldX,
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
        label: <T en="Verification Rejected" />,
        desc: user?.verificationDoc?.rejectionReason
          ? <T en={user.verificationDoc.rejectionReason} />
          : <T en="Your document was rejected. Please resubmit with a valid document." />,
      },
    };

    const current = statusMap[verificationStatus];
    const Icon = current.icon;

    return (
      <div className={`${current.bg} rounded-[1.5rem] border p-5`}>
        <div className="flex items-start gap-3">
          <Icon size={20} className={`${current.color} mt-0.5 flex-shrink-0`} />
          <div>
            <p className={`text-sm font-bold ${current.color}`}>{current.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{current.desc}</p>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "profile", label: <T en="Profile" />, icon: User },
    { id: "rewards", label: <T en="Points & Rewards" />, icon: Trophy },
    { id: "security", label: <T en="Security" />, icon: Lock },
    { id: "verification", label: <T en="Verification" />, icon: Shield },
  ];

  const visibleTabs = tabs.filter((tab) => {
    if (tab.id === "rewards" && !hasRewards) return false;
    if (tab.id === "verification" && user?.role === "admin") return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm sm:px-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Account Center</p>
              <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900">Profile</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Personal details, security settings, verification, and civic reputation all stay here.
              </p>
            </div>
            {hasRewards && user?.points !== undefined && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Total Points</p>
                <p className="mt-1 text-2xl font-black text-amber-900">{user.points}</p>
              </div>
            )}
          </div>
        </motion.div>

        <div className="flex w-full flex-wrap gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-sm lg:max-w-3xl">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === "verification" && verificationStatus === "none" && (
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm"
            >
              <div className={`bg-gradient-to-r ${roleMeta.accent} px-6 py-7 text-white sm:px-8`}>
                <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr] xl:items-center">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative">
                      <div className="h-24 w-24 overflow-hidden rounded-[1.75rem] ring-4 ring-white/25 shadow-xl">
                        {displayAvatar ? (
                          <img src={displayAvatar} alt={user?.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/20 backdrop-blur-sm">
                            <span className="text-3xl font-black text-white">
                              {user?.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleAvatarClick}
                        disabled={avatarLoading || deleteLoading}
                        title="Change profile picture"
                        className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition-all hover:scale-105 hover:bg-slate-900 active:scale-95 disabled:opacity-60"
                      >
                        {avatarLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-white sm:text-3xl">{user?.name}</h2>
                      <p className="mt-1 text-sm text-white/80 sm:text-base">{user?.email}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${roleMeta.badge} bg-white/95`}>
                          {roleMeta.label}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                          {verificationStatus === "approved"
                            ? "Verified Account"
                            : verificationStatus === "pending"
                              ? "Verification Pending"
                              : "Profile In Progress"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          onClick={handleAvatarClick}
                          disabled={avatarLoading || deleteLoading}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                          {displayAvatar ? "Change photo" : "Upload photo"}
                        </button>
                        {displayAvatar && (
                          <button
                            onClick={handleDeleteAvatar}
                            disabled={avatarLoading || deleteLoading}
                            className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
                          >
                            {deleteLoading ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`grid gap-3 ${completionStats.length > 2 ? "sm:grid-cols-3 xl:grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-1"}`}>
                    {completionStats.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{item.label}</p>
                        <p className="mt-2 text-sm font-black text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {cropSrc && (
                <AvatarCropModal
                  imageSrc={cropSrc}
                  onConfirm={handleCropConfirm}
                  onCancel={() => setCropSrc(null)}
                />
              )}

              <div className="p-6 sm:p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900">Profile Details</h3>
                  <p className="mt-1 text-sm text-slate-500">Update the details people and the platform rely on.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <InfoRow icon={User} label={<T en="Full Name" />} value={user?.name} />
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <InfoRow icon={Mail} label={<T en="Email" />} value={user?.email} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                        <Phone size={18} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-0.5 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><T en="Phone" /></p>
                          {!phoneEditing && (
                            <button
                              onClick={() => {
                                setPhoneEditing(true);
                                setPhoneData((prev) => ({ ...prev, phone: user?.phone || "" }));
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 transition hover:bg-teal-100"
                            >
                              <Pencil size={11} />
                              {user?.phone ? "Edit" : "Add"}
                            </button>
                          )}
                        </div>

                        {phoneEditing ? (
                          <div className="mt-2 space-y-2">
                            <input
                              type="tel"
                              value={phoneData.phone}
                              onChange={(e) => {
                                setPhoneData((prev) => ({ ...prev, phone: e.target.value }));
                                setPhoneError("");
                              }}
                              placeholder="e.g. 01712345678"
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                            />
                            <div className="relative">
                              <input
                                type={showPhonePass ? "text" : "password"}
                                value={phoneData.currentPassword}
                                onChange={(e) => {
                                  setPhoneData((prev) => ({ ...prev, currentPassword: e.target.value }));
                                  setPhoneError("");
                                }}
                                placeholder="Current password to confirm"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-10 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPhonePass((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPhonePass ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                            <div className="flex gap-2">
                              <button
                                onClick={handlePhoneSave}
                                disabled={phoneLoading}
                                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
                              >
                                {phoneLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                Save
                              </button>
                              <button
                                onClick={cancelPhoneEdit}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <X size={13} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold ${user?.phone ? "text-slate-900" : "text-slate-400 italic"}`}>
                            {user?.phone || "Not provided"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                        <MapPin size={18} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-0.5 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><T en="Present Address" /></p>
                          {!addressEditing && (
                            <button
                              onClick={() => setAddressEditing(true)}
                              className="inline-flex items-center gap-1 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 transition hover:bg-teal-100"
                            >
                              <Pencil size={11} />
                              {user?.presentAddress?.address ? "Edit" : "Add"}
                            </button>
                          )}
                        </div>

                        {addressEditing ? (
                          <div className="mt-2 space-y-3">
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={addressData.address}
                                onChange={(e) => setAddressData((prev) => ({ ...prev, address: e.target.value }))}
                                placeholder="Search your area..."
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                              />
                              <button
                                type="button"
                                onClick={searchLocation}
                                disabled={isSearching}
                                className="rounded-xl bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200"
                              >
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                              </button>
                            </div>

                            <div className="relative z-0 h-[220px] w-full overflow-hidden rounded-2xl border border-slate-200">
                              <MapContainer
                                center={mapPosition || [23.8103, 90.4125]}
                                zoom={13}
                                style={{ height: "100%", width: "100%" }}
                              >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationMarker position={mapPosition} setPosition={setMapPosition} setAddress={setAddress} />
                              </MapContainer>
                              <div className="absolute bottom-3 left-3 z-[1000] rounded-xl bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                                Click map to pin location
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={getCurrentLocation}
                                disabled={isLocating}
                                className="flex items-center gap-1 text-[11px] font-medium text-teal-600"
                              >
                                <Navigation size={12} />
                                Use My Location
                              </button>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleAddressSave}
                                  disabled={addressLoading}
                                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
                                >
                                  {addressLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  Save
                                </button>
                                <button
                                  onClick={() => setAddressEditing(false)}
                                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                                >
                                  <X size={13} />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold leading-relaxed ${user?.presentAddress?.address ? "text-slate-900" : "text-slate-400 italic"}`}>
                            {user?.presentAddress?.address || "Not set"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {user?.role === "department_officer" && (
                    <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50/60 p-5">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
                          <T en="Official Details" />
                        </p>
                        <p className="text-sm text-blue-800/75">Your employment and department credentials shown on file.</p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4"><InfoRow icon={Building2} label={<T en="Department" />} value={user?.department?.replace("_", " ")} /></div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4"><InfoRow icon={CreditCard} label={<T en="Employee ID" />} value={user?.employeeId} /></div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4"><InfoRow icon={Mail} label={<T en="Government Email" />} value={user?.governmentEmail} /></div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-4"><InfoRow icon={Briefcase} label={<T en="Designation" />} value={user?.designation} /></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "rewards" && hasRewards && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm"
            >
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-7 text-white sm:px-8">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                      <Trophy size={12} />
                      Points & Rewards
                    </div>
                    <h3 className="mt-4 text-4xl font-black">{user?.points || 0}</h3>
                    <p className="mt-2 text-sm text-teal-50/90">Your activity reputation and contribution history across the platform.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Status</p>
                      <p className="mt-2 text-sm font-black text-white">{user?.isGoodCitizen ? "Good Citizen" : "Active Contributor"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Badges</p>
                      <p className="mt-2 text-sm font-black text-white">{user?.badges?.length || 0} Earned</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-5 border-b border-slate-100 pb-4">
                  <h4 className="text-lg font-bold text-slate-900">Point History</h4>
                  <p className="mt-1 text-sm text-slate-500">A running ledger of earned points and penalties.</p>
                </div>

                <div className="divide-y divide-gray-50">
                  {!user?.pointHistory || user.pointHistory.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-12 text-center">
                      <History size={32} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium text-gray-400">No point transactions yet.</p>
                    </div>
                  ) : (
                    [...user.pointHistory].reverse().map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                            item.type === "earn" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          }`}>
                            {item.type === "earn" ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.reason}</p>
                            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className={`text-sm font-black ${item.type === "earn" ? "text-emerald-600" : "text-rose-600"}`}>
                          {item.type === "earn" ? "+" : ""}{item.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900"><T en="Change Password" /></h3>
                <p className="mt-1 text-sm text-slate-500"><T en="Update your password to keep your account secure" /></p>
              </div>

              <form onSubmit={handlePasswordChange} className="grid gap-4 lg:grid-cols-2">
                {["currentPassword", "newPassword", "confirmPassword"].map((name) => (
                  <div key={name} className={name === "confirmPassword" ? "lg:col-span-2" : ""}>
                    <PasswordField
                      label={
                        name === "currentPassword"
                          ? <T en="Current Password" />
                          : name === "newPassword"
                            ? <T en="New Password" />
                            : <T en="Confirm New Password" />
                      }
                      placeholder={
                        name === "currentPassword"
                          ? "Current password"
                          : name === "newPassword"
                            ? "New password"
                            : "Confirm new password"
                      }
                      value={passwordData[name]}
                      onChange={(e) => {
                        setPasswordData((prev) => ({ ...prev, [name]: e.target.value }));
                        if (passwordErrors[name]) setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
                      }}
                      error={passwordErrors[name]}
                      show={showPasswords[name]}
                      onToggleShow={() => setShowPasswords((prev) => ({ ...prev, [name]: !prev[name] }))}
                    />
                  </div>
                ))}

                <div className="pt-2 lg:col-span-2">
                  <motion.button
                    type="submit"
                    disabled={passwordLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:from-teal-600 hover:to-blue-700"
                    whileHover={{ scale: passwordLoading ? 1 : 1.01 }}
                    whileTap={{ scale: passwordLoading ? 1 : 0.99 }}
                  >
                    {passwordLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>{passwordLoading ? <T en="Updating..." /> : <T en="Update Password" />}</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === "verification" && (
            <motion.div
              key="verification"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900"><T en="Account Verification" /></h3>
                <p className="mt-1 text-sm text-slate-500"><T en="Verify your identity to file complaints and participate fully" /></p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <VerificationStatus />
                  {(verificationStatus === "none" || verificationStatus === "rejected") && (
                    <Link
                      to="/verify"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <ShieldCheck size={18} />
                      <span><T en="Submit for Verification" /></span>
                      <ArrowRight size={18} />
                    </Link>
                  )}
                </div>

                <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Verification Overview</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Current Status</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {verificationStatus === "approved"
                          ? "Verified"
                          : verificationStatus === "pending"
                            ? "Pending Review"
                            : verificationStatus === "rejected"
                              ? "Rejected"
                              : "Not Submitted"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Document</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">{user?.verificationDoc?.docType || "Not uploaded"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
