import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Save,
  Loader2,
  Building2,
  Briefcase,
  CreditCard,
  BadgeCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import ServantLayout from "../../components/layout/ServantLayout";
import api, { authAPI } from "../../services/api";
import T from "../../components/T";
import VerifiedBadge, { VerifiedMark } from "../../components/VerifiedBadge";

const DEPT_DISPLAY = {
  public_works: "Public Works",
  water_authority: "Water Authority",
  electricity: "Electricity",
  sanitation: "Sanitation",
  public_safety: "Public Safety",
  animal_control: "Animal Control",
  environment: "Environment",
  health: "Health",
  transport: "Transport",
  other: "General Administration",
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

const PasswordField = ({ label, placeholder, value, onChange, error, showPw, onToggle }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        <Lock size={18} />
      </div>
      <input
        type={showPw ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-2xl border px-4 py-3 pl-11 pr-11 text-sm outline-none transition ${
          error
            ? "border-red-400 bg-red-50"
            : "border-slate-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        }`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const ServantProfilePage = () => {
  const { user, getMe } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const [pwData, setPwData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  const [phoneData, setPhoneData] = useState({ phone: "", currentPassword: "" });
  const [showPhonePw, setShowPhonePw] = useState(false);
  const [phoneErrors, setPhoneErrors] = useState({});
  const [phoneLoading, setPhoneLoading] = useState(false);

  const deptLabel = DEPT_DISPLAY[user?.department] || user?.department || "—";
  const nid = user?.verificationDoc?.documentNumber;
  const maskedNid = nid ? "••••••" + nid.slice(-4) : "—";
  const verifiedAt = user?.verificationDoc?.verifiedAt
    ? new Date(user.verificationDoc.verifiedAt).toLocaleDateString("en-BD", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!pwData.currentPassword) errors.currentPassword = "Current password is required";
    if (!pwData.newPassword || pwData.newPassword.length < 8) errors.newPassword = "Must be at least 8 characters";
    if (pwData.newPassword !== pwData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPwLoading(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: pwData.currentPassword,
        newPassword: pwData.newPassword,
      });
      toast.success("Password updated successfully");
      setPwData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

  const handlePhoneChange = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!phoneData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^(\+880|0)?1[3-9]\d{8}$/.test(phoneData.phone.trim())) {
      errors.phone = "Enter a valid BD phone number";
    }
    if (!phoneData.currentPassword) errors.currentPassword = "Password is required to confirm";
    setPhoneErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPhoneLoading(true);
    try {
      await authAPI.updatePhone({
        phone: phoneData.phone.trim(),
        currentPassword: phoneData.currentPassword,
      });
      toast.success("Phone number updated");
      setPhoneData({ phone: "", currentPassword: "" });
      await getMe();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update phone");
    } finally {
      setPhoneLoading(false);
    }
  };

  const tabs = [
    { id: "profile", labelEn: "Profile", icon: User },
    { id: "security", labelEn: "Security", icon: Lock },
    { id: "verification", labelEn: "Verification", icon: ShieldCheck },
  ];

  return (
    <ServantLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm sm:px-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Servant Account</p>
              <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900">Profile</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Keep your official information, security, and verification details organized in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Department</p>
              <p className="mt-1 text-lg font-black text-blue-900">{deptLabel}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex w-full flex-wrap gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-sm lg:max-w-2xl">
          {tabs.map((tab) => {
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
                <T en={tab.labelEn} />
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
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-7 text-white sm:px-8">
                <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white/15 text-3xl font-black text-white ring-4 ring-white/25 shadow-xl">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </div>
                      {user?.isVerified && (
                        <VerifiedMark
                          className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl ring-4 ring-white/20"
                          iconSize={18}
                        />
                      )}
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-white sm:text-3xl">{user?.name}</h2>
                      {user?.designation && <p className="mt-1 text-sm font-semibold text-white/90">{user.designation}</p>}
                      <p className="mt-1 text-sm text-white/75">{user?.email}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                          Public Servant
                        </span>
                        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                          {deptLabel}
                        </span>
                        {user?.isVerified && (
                          <VerifiedBadge
                            label="Verified"
                            className="border border-emerald-200 bg-emerald-100 px-3 py-1 uppercase tracking-[0.18em]"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Department</p>
                      <p className="mt-2 text-sm font-black text-white">{deptLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Verification</p>
                      <p className="mt-2 text-sm font-black text-white">Verified</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Employee ID</p>
                      <p className="mt-2 text-sm font-black text-white">{user?.employeeId || "Not set"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900">Official Profile</h3>
                  <p className="mt-1 text-sm text-slate-500">Your account identity and department credentials on record.</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><InfoRow icon={User} label={<T en="Full Name" />} value={user?.name} /></div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><InfoRow icon={Mail} label={<T en="Email" />} value={user?.email} /></div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><InfoRow icon={Phone} label={<T en="Phone" />} value={user?.phone} muted={!user?.phone} emptyLabel={<T en="Not provided" />} /></div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><InfoRow icon={Building2} label={<T en="Department" />} value={deptLabel} /></div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><InfoRow icon={CreditCard} label={<T en="Employee ID" />} value={user?.employeeId} /></div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><InfoRow icon={Briefcase} label={<T en="Designation" />} value={user?.designation} /></div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 lg:col-span-2"><InfoRow icon={BadgeCheck} label={<T en="Government Email" />} value={user?.governmentEmail} /></div>
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
              className="space-y-6"
            >
              <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-bold text-slate-900"><T en="Change Password" /></h3>
                  <p className="mt-1 text-sm text-slate-500"><T en="Update your login password" /></p>
                </div>

                <form onSubmit={handlePasswordChange} className="grid gap-4 lg:grid-cols-2">
                  <PasswordField
                    label="Current Password"
                    placeholder="Current password"
                    value={pwData.currentPassword}
                    onChange={(e) => setPwData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    error={pwErrors.currentPassword}
                    showPw={showPw.current}
                    onToggle={() => setShowPw((prev) => ({ ...prev, current: !prev.current }))}
                  />
                  <PasswordField
                    label="New Password"
                    placeholder="New password (min 8 chars)"
                    value={pwData.newPassword}
                    onChange={(e) => setPwData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    error={pwErrors.newPassword}
                    showPw={showPw.new}
                    onToggle={() => setShowPw((prev) => ({ ...prev, new: !prev.new }))}
                  />
                  <div className="lg:col-span-2">
                    <PasswordField
                      label="Confirm New Password"
                      placeholder="Repeat new password"
                      value={pwData.confirmPassword}
                      onChange={(e) => setPwData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      error={pwErrors.confirmPassword}
                      showPw={showPw.confirm}
                      onToggle={() => setShowPw((prev) => ({ ...prev, confirm: !prev.confirm }))}
                    />
                  </div>
                  <div className="pt-2 lg:col-span-2">
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50"
                    >
                      {pwLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {pwLoading ? <T en="Updating..." /> : <T en="Update Password" />}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-bold text-slate-900"><T en="Change Phone Number" /></h3>
                  <p className="mt-1 text-sm text-slate-500">
                    <T en="Current" />: <span className="font-semibold text-slate-700">{user?.phone || "Not set"}</span>
                  </p>
                </div>

                <form onSubmit={handlePhoneChange} className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700"><T en="New Phone Number" /></label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Phone size={18} />
                      </div>
                      <input
                        type="tel"
                        autoComplete="off"
                        value={phoneData.phone}
                        onChange={(e) => {
                          setPhoneData((prev) => ({ ...prev, phone: e.target.value }));
                          setPhoneErrors((prev) => ({ ...prev, phone: "" }));
                        }}
                        placeholder="+880 1XXXXXXXXX"
                        className={`w-full rounded-2xl border px-4 py-3 pl-11 text-sm outline-none transition ${
                          phoneErrors.phone
                            ? "border-red-400 bg-red-50"
                            : "border-slate-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                    </div>
                    {phoneErrors.phone && <p className="mt-1 text-xs text-red-500">{phoneErrors.phone}</p>}
                  </div>

                  <PasswordField
                    label="Confirm with Current Password"
                    placeholder="Enter your password"
                    value={phoneData.currentPassword}
                    onChange={(e) => {
                      setPhoneData((prev) => ({ ...prev, currentPassword: e.target.value }));
                      setPhoneErrors((prev) => ({ ...prev, currentPassword: "" }));
                    }}
                    error={phoneErrors.currentPassword}
                    showPw={showPhonePw}
                    onToggle={() => setShowPhonePw((prev) => !prev)}
                  />

                  <div className="pt-2 lg:col-span-2">
                    <button
                      type="submit"
                      disabled={phoneLoading}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50"
                    >
                      {phoneLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {phoneLoading ? <T en="Updating..." /> : <T en="Update Phone" />}
                    </button>
                  </div>
                </form>
              </div>
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
                <p className="mt-1 text-sm text-slate-500"><T en="Your identity verification status" /></p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-700"><T en="Verified" /></p>
                      <p className="mt-1 text-sm text-emerald-600"><T en="Your identity has been verified via National ID." /></p>
                      {verifiedAt && <p className="mt-1 text-xs text-emerald-500"><T en="Verified on" /> {verifiedAt}</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Verification Details</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"><T en="Document Type" /></p>
                      <p className="mt-2 text-sm font-bold text-slate-900"><T en="National ID Card (NID)" /></p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"><T en="NID Number" /></p>
                      <p className="mt-2 font-mono text-sm font-bold text-slate-900">{maskedNid}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ServantLayout>
  );
};

export default ServantProfilePage;
