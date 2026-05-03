import React, { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2,
  ShieldCheck, Building2, BadgeCheck, Briefcase, Users, MapPin, Navigation, Search, Shield
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";

import SocialButtons from "../components/auth/SocialButtons";
import { useAuth } from "../context/AuthContext";
import T from "../components/T";
import LanguageToggle from "../components/LanguageToggle";
import { DEPARTMENT_OPTIONS } from "../constants/departments";
import "../styles/sliding-auth.css";

// Fix for default marker icons
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    if (data && data.display_name) setAddress(data.display_name);
  } catch (error) {
    console.error("Geocoding error:", error);
  }
};

const UnifiedAuthPage = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showForms, setShowForms] = useState(false);
  const isInitialSignUp = location.pathname === "/signup";
  const [isRightPanelActive, setIsRightPanelActive] = useState(isInitialSignUp);

  useEffect(() => {
    setIsRightPanelActive(location.pathname === "/signup");
  }, [location.pathname]);

  const switchMode = (isSignUp) => {
    setIsRightPanelActive(isSignUp);
    navigate(isSignUp ? '/signup' : '/login', { replace: true });
  };

  const handleJoinNow = () => {
    setShowForms(true);
  };

  // ─── Login State ─────────────────────────────────────────────────────
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});

  const validateLogin = () => {
    const newErrors = {};
    if (!loginData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(loginData.email)) newErrors.email = 'Please enter a valid email';
    if (!loginData.password) newErrors.password = 'Password is required';
    setLoginErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (loginErrors[name]) setLoginErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setIsLoginLoading(true);
    try {
      await login(loginData);
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setLoginErrors(serverErrors);
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  // ─── Signup State ────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [signupData, setSignupData] = useState({
    role: "", name: "", email: "", phone: "",
    presentAddress: { address: "", lat: null, lng: null },
    department: "", employeeId: "", governmentEmail: "", designation: "", nidNumber: "",
    password: "", confirmPassword: "", agreeTerms: false,
  });
  const [mapPosition, setMapPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});

  const isPublicServant = signupData.role === "department_officer";
  const isMayor = signupData.role === "mayor";
  const needsNid = isPublicServant || isMayor;

  const setAddressLabel = useCallback((addr) => {
    setSignupData((prev) => ({
      ...prev, presentAddress: { ...prev.presentAddress, address: addr },
    }));
  }, []);

  const validateStep2 = () => {
    const newErrors = {};
    if (!signupData.name.trim()) newErrors.name = "Name is required";
    if (!signupData.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(signupData.email)) newErrors.email = "Valid email required";

    if (signupData.phone.trim() && !/^(\+880|0)?1[3-9]\d{8}$/.test(signupData.phone.trim())) {
      newErrors.phone = "Invalid BD phone number";
    }

    if (needsNid) {
      if (!signupData.nidNumber.trim()) newErrors.nidNumber = "NID required";
      else if (signupData.nidNumber.trim().length !== 10) newErrors.nidNumber = "NID must be 10 digits";
      if (!signupData.employeeId.trim()) newErrors.employeeId = "Employee ID is required";
      if (!signupData.governmentEmail.trim()) newErrors.governmentEmail = "Gov Email is required";
      else if (!/^\S+@\S+\.\S+$/.test(signupData.governmentEmail)) newErrors.governmentEmail = "Valid email required";
      if (!signupData.designation.trim()) newErrors.designation = "Designation is required";
    }

    if (isPublicServant && !signupData.department) {
      newErrors.department = "Department is required";
    }
    setSignupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    if (!signupData.presentAddress.address || !mapPosition) {
      toast.error("Please pinpoint your address on the map");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    const newErrors = {};
    if (!signupData.password) newErrors.password = "Password required";
    else if (signupData.password.length < 8) newErrors.password = "Min 8 characters";
    if (signupData.password !== signupData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!signupData.agreeTerms) newErrors.agreeTerms = "Accept terms to continue";
    setSignupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignupData((prev) => ({
      ...prev, [name]: type === "checkbox" ? checked : value,
    }));
    if (signupErrors[name]) setSignupErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const selectRole = (role) => {
    setSignupData((prev) => ({ ...prev, role }));
    setStep(2);
  };

  const goToStep3 = () => { if (validateStep2()) setStep(3); };
  const goToStep4 = () => { if (validateStep3()) setStep(4); };

  const getCurrentLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapPosition([pos.coords.latitude, pos.coords.longitude]);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude, setAddressLabel);
        setIsLocating(false);
      },
      () => { toast.error("Location access denied"); setIsLocating(false); }
    );
  };

  const searchLocation = async () => {
    if (!signupData.presentAddress.address.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(signupData.presentAddress.address)}&limit=1`);
      const data = await response.json();
      if (data?.[0]) {
        setMapPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setAddressLabel(data[0].display_name);
      } else {
        toast.error("Location not found");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep4()) return;

    setIsSignupLoading(true);
    try {
      const payload = {
        ...signupData,
        phone: signupData.phone.trim() || undefined,
        presentAddress: { address: signupData.presentAddress.address, lat: mapPosition[0], lng: mapPosition[1] },
      };
      await register(payload);
      
      if (signupData.role === 'mayor' || signupData.role === 'department_officer') {
        toast.success("Account created! Please wait for admin verification.");
        setTimeout(() => {
          setIsRightPanelActive(false);
          navigate("/login", { replace: true });
          setStep(1);
        }, 1200);
      } else {
        toast.success("Account created successfully!");
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach((err) => { backendErrors[err.field] = err.message; });
        setSignupErrors(backendErrors);
        toast.error("Validation failed. Please check the form.");
      } else {
        toast.error(error.response?.data?.message || "Registration failed");
      }
    } finally {
      setIsSignupLoading(false);
    }
  };

  const renderSignupInput = ({ name, label, type = "text", icon: Icon, placeholder, isPassword, showToggle, toggleFn }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-xs font-bold text-[#0d3b4b] uppercase">{label}</label>
        {signupErrors[name] && <span className="text-[10px] font-bold text-red-500">{signupErrors[name]}</span>}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 theme-icon"><Icon size={16} /></div>
        <input
          name={name}
          type={isPassword ? (showToggle ? "text" : "password") : type}
          value={signupData[name]}
          onChange={handleSignupChange}
          placeholder={placeholder}
          className={`theme-input text-sm ${signupErrors[name] ? "border-red-400" : ""}`}
        />
        {isPassword && (
          <button type="button" onClick={toggleFn} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showToggle ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="auth-page-wrapper">
      {/* Global Language Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle variant="dark" />
      </div>

      <AnimatePresence mode="wait">
        {!showForms ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="welcome-screen"
          >
            {/* Massive Faint Background Logo */}
            <motion.img 
              src="/assets/auth-logo.png" 
              alt="" 
              className="welcome-bg-logo"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.05 }}
              transition={{ duration: 3, ease: "easeOut" }}
            />

            {/* Floating smaller logo for visual focus */}
            <motion.img 
              src="/assets/auth-logo.png" 
              alt="Somadhan Logo" 
              className="welcome-logo-small"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 1, type: "spring", stiffness: 100 }}
            />

            <div className="z-10 px-4">
              <motion.h1 
                className="welcome-text-en"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                Smart solution to build a Smart Bangladesh. <br/>Your journey starts here.
              </motion.h1>
              
              <motion.h1 
                className="welcome-text-bn font-bengali"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                স্মার্ট বাংলাদেশ গড়তে স্মার্ট সমাধান। <br/>আপনার যাত্রা এখানে শুরু।
              </motion.h1>

              <motion.button 
                className="join-now-btn" 
                onClick={handleJoinNow}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ scale: 1.05, translateY: -5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ delay: 0.9, duration: 0.5, type: "spring" }}
              >
                Join Now
              </motion.button>
            </div>

            {/* Decorative particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-[#a1824a]/20 rounded-full"
                initial={{ 
                  x: Math.random() * window.innerWidth - window.innerWidth/2, 
                  y: Math.random() * window.innerHeight - window.innerHeight/2,
                  opacity: 0 
                }}
                animate={{ 
                  y: [null, Math.random() * -200 - 100],
                  opacity: [0, 0.4, 0],
                  scale: [1, 3, 1]
                }}
                transition={{ 
                  duration: Math.random() * 8 + 7, 
                  repeat: Infinity, 
                  delay: Math.random() * 5 
                }}
                style={{ left: '50%', top: '50%' }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="forms"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`auth-container ${isRightPanelActive ? "right-panel-active" : ""}`}
          >
            {/* ─── Sign Up Form Panel ─── */}
            <div className="auth-form-container sign-up-container">
              <div className="max-w-sm mx-auto w-full py-8">
                <h2 className="text-3xl font-black text-[#0d3b4b] mb-2"><T en="Create Account" /></h2>
                <div className="flex gap-2 mb-6">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? "bg-[#a1824a]" : "bg-gray-200"}`} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => selectRole("citizen")} className="flex items-center gap-4 p-4 rounded-xl border-2 hover:border-[#1a5260] text-left transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-[#0d3b4b]/5 flex items-center justify-center text-[#1a5260] group-hover:bg-[#1a5260] group-hover:text-white transition-colors"><Users size={20} /></div>
                          <div><h3 className="font-bold text-[#0d3b4b]">Citizen</h3><p className="text-xs text-gray-500">Report & track issues</p></div>
                        </button>
                        <button onClick={() => selectRole("department_officer")} className="flex items-center gap-4 p-4 rounded-xl border-2 hover:border-[#1a5260] text-left transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-[#0d3b4b]/5 flex items-center justify-center text-[#1a5260] group-hover:bg-[#1a5260] group-hover:text-white transition-colors"><Building2 size={20} /></div>
                          <div><h3 className="font-bold text-[#0d3b4b]">Public Servant</h3><p className="text-xs text-gray-500">Manage assigned tasks</p></div>
                        </button>
                        <button onClick={() => selectRole("mayor")} className="flex items-center gap-4 p-4 rounded-xl border-2 hover:border-[#a1824a] text-left transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-[#a1824a]/10 flex items-center justify-center text-[#a1824a] group-hover:bg-[#a1824a] group-hover:text-white transition-colors"><Shield size={20} /></div>
                          <div><h3 className="font-bold text-[#0d3b4b]">Mayor</h3><p className="text-xs text-gray-500">City-wide oversight</p></div>
                        </button>
                      </div>
                      
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
                      {renderSignupInput({ name: "name", label: "Full Name", icon: User, placeholder: "Rafiq Ahmed" })}
                      {renderSignupInput({ name: "email", label: "Email", icon: Mail, type: "email", placeholder: "rafiq@example.com" })}
                      {renderSignupInput({ name: "phone", label: "Phone (Optional)", icon: Phone, placeholder: "01XXXXXXXXX" })}
                      {needsNid && (
                        <>
                          {isPublicServant && (
                            <div className="mb-3">
                              <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-1">Department</label>
                              <select name="department" value={signupData.department} onChange={handleSignupChange} className={`theme-input text-sm ${signupErrors.department ? "border-red-400" : ""}`}>
                                <option value="">Select Department</option>
                                {DEPARTMENT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                              </select>
                            </div>
                          )}
                          {renderSignupInput({ name: "nidNumber", label: "NID Number", icon: Shield, placeholder: "10-digit NID" })}
                          {renderSignupInput({ name: "employeeId", label: "Employee ID", icon: BadgeCheck, placeholder: "ID-12345" })}
                          {renderSignupInput({ name: "governmentEmail", label: "Gov Email", icon: Mail, type: "email", placeholder: "officer@gov.bd" })}
                          {renderSignupInput({ name: "designation", label: "Designation", icon: Briefcase, placeholder: "Senior Engineer" })}
                        </>
                      )}
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl border-2 border-[#e2e8f0] text-gray-500 font-bold hover:bg-gray-50"><ArrowLeft size={18} /></button>
                        <button onClick={goToStep3} className="gold-btn flex-1">Continue <ArrowRight size={18} /></button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <h3 className="font-bold text-[#0d3b4b] flex items-center gap-2"><MapPin className="text-[#a1824a]" size={18} /> Present Address</h3>
                      <div className="flex gap-1.5">
                        <input type="text" value={signupData.presentAddress.address} onChange={(e) => setAddressLabel(e.target.value)} placeholder="Search area..." className="theme-input text-sm !pl-4" />
                        <button onClick={searchLocation} className="p-3 bg-[#0d3b4b] text-white rounded-xl hover:bg-[#1a5260] transition-colors">
                          {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        </button>
                      </div>
                      <div className="h-[240px] w-full rounded-xl overflow-hidden border-2 border-[#e2e8f0] relative z-0">
                        <MapContainer center={[23.8103, 90.4125]} zoom={13} style={{ height: "100%", width: "100%" }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <LocationMarker position={mapPosition} setPosition={setMapPosition} setAddress={setAddressLabel} />
                        </MapContainer>
                      </div>
                      <button onClick={getCurrentLocation} className="text-xs font-bold text-[#1a5260] flex items-center gap-1 hover:underline"><Navigation size={14} /> Use My Location</button>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setStep(2)} className="px-4 py-3 rounded-xl border-2 border-[#e2e8f0] text-gray-500 font-bold hover:bg-gray-50"><ArrowLeft size={18} /></button>
                        <button onClick={goToStep4} className="gold-btn flex-1">Continue <ArrowRight size={18} /></button>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      {renderSignupInput({ name: "password", label: "Password", icon: Lock, isPassword: true, showToggle: showSignupPassword, toggleFn: () => setShowSignupPassword(!showSignupPassword) })}
                      {renderSignupInput({ name: "confirmPassword", label: "Confirm Password", icon: Lock, isPassword: true, showToggle: showConfirmPassword, toggleFn: () => setShowConfirmPassword(!showConfirmPassword) })}
                      <label className="flex items-start gap-2 cursor-pointer mt-4">
                        <input type="checkbox" name="agreeTerms" checked={signupData.agreeTerms} onChange={handleSignupChange} className="mt-1" />
                        <span className="text-xs text-gray-600 font-medium">I agree to the Terms and Privacy Policy</span>
                      </label>
                      {signupErrors.agreeTerms && <p className="text-[10px] text-red-500 font-bold">{signupErrors.agreeTerms}</p>}
                      <div className="flex gap-2 mt-6">
                        <button onClick={() => setStep(3)} className="px-4 py-3 rounded-xl border-2 border-[#e2e8f0] text-gray-500 font-bold hover:bg-gray-50"><ArrowLeft size={18} /></button>
                        <button onClick={handleSignupSubmit} disabled={isSignupLoading} className="gold-btn flex-1">
                          {isSignupLoading ? (
                            <>
                              <Loader2 className="animate-spin" size={20} />
                              <span>Creating Account...</span>
                            </>
                          ) : "Create Account"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ─── Sign In Form Panel ─── */}
            <div className="auth-form-container sign-in-container">
              <form onSubmit={handleLoginSubmit} className="max-w-sm mx-auto w-full py-8" noValidate>
                <h2 className="text-3xl font-black text-[#0d3b4b] mb-2"><T en="Welcome Back" /></h2>
                <p className="text-gray-500 text-sm font-medium mb-8"><T en="Sign in to continue to your dashboard" /></p>

                <SocialButtons />

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400 font-bold uppercase tracking-wider"><T en="or sign in with email" /></span></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-1"><T en="Email address" /></label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 theme-icon"><Mail size={18} /></div>
                      <input
                        name="email"
                        type="email"
                        value={loginData.email}
                        onChange={handleLoginChange}
                        placeholder="you@example.com"
                        className={`theme-input ${loginErrors.email ? 'border-red-400' : ''}`}
                      />
                    </div>
                    {loginErrors.email && <p className="text-red-500 text-[10px] font-bold mt-1">{loginErrors.email}</p>}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-[#0d3b4b] uppercase"><T en="Password" /></label>
                      <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-[#1a5260] font-bold hover:underline"><T en="Forgot password?" /></button>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 theme-icon"><Lock size={18} /></div>
                      <input
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={handleLoginChange}
                        placeholder="Enter your password"
                        className={`theme-input pr-11 ${loginErrors.password ? 'border-red-400' : ''}`}
                      />
                      <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="text-red-500 text-[10px] font-bold mt-1">{loginErrors.password}</p>}
                  </div>
                </div>

                <button type="submit" disabled={isLoginLoading} className="gold-btn w-full mt-8">
                  {isLoginLoading ? <Loader2 size={20} className="animate-spin" /> : <><T en="Sign In" /> <ArrowRight size={18} /></>}
                </button>

              </form>
            </div>

            {/* ─── Sliding Overlay Panel ─── */}
            <div className="auth-overlay-container">
              <div className="auth-overlay">
              <div className="auth-overlay-panel auth-overlay-left">
                <img src="/assets/auth-logo.png" alt="Somadhan Logo" className="auth-logo-img" />
                <h1 className="text-4xl font-black mb-4 text-[#a1824a]"><T en="Welcome Back!" /></h1>
                <p className="text-sm font-medium mb-8 text-blue-100 max-w-[280px]">
                  <T en="To keep connected with us please login with your personal info" />
                </p>
                <button className="ghost-btn" onClick={() => switchMode(false)}>
                  <T en="Sign In" />
                </button>
              </div>
              <div className="auth-overlay-panel auth-overlay-right">
                <img src="/assets/auth-logo.png" alt="Somadhan Logo" className="auth-logo-img" />
                <h1 className="text-4xl font-black mb-4 text-[#a1824a]"><T en="Hello, Citizen!" /></h1>
                <p className="text-sm font-medium mb-8 text-blue-100 max-w-[280px]">
                  <T en="Enter your personal details and start your journey with us" />
                </p>
                <button className="ghost-btn" onClick={() => switchMode(true)}>
                  <T en="Sign Up" />
                </button>
              </div>
              </div>            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedAuthPage;
