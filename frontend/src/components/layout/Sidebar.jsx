import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ShieldCheck,
  Bell,
  FileText,
  BarChart3,
  MessageSquare,
  PlusCircle,
  Map,
  Users,
  Check,
} from "lucide-react";
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from "../../context/AuthContext";
import LanguageToggle from "../LanguageToggle";
import T from "../T";

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1');
const resolveAvatar = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE.replace('/api/v1', '')}${url}`;
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [volunteerAds, setVolunteerAds] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null); // For Modal

  useEffect(() => {
    fetchActiveAds();
  }, []);

  const fetchActiveAds = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/volunteer-ads/active`);
      if (data.success) {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today
        const futureAds = data.data.filter(ad => new Date(ad.dateOfEvent) >= now);
        setVolunteerAds(futureAds);
      }
    } catch (error) {
      console.error('Failed to fetch volunteer ads', error);
    }
  };

  const navItems = [
    { path: "/profile",          label: <T en="My Profile" />,        icon: User },
    { 
      path: user?.role === 'mayor' ? "/mayor/dashboard" : user?.role === 'admin' ? "/admin/dashboard" : user?.role === 'department_officer' ? "/servant/dashboard" : "/dashboard", 
      label: <T en="Dashboard" />,         
      icon: LayoutDashboard 
    },
    { path: "/submit-complaint", label: <T en="Submit Complaint" />,  icon: PlusCircle, roles: ['citizen'] },
    { path: "/heatmap",          label: <T en="Complaint Heatmap" />, icon: Map },
    { path: "/notifications",    label: <T en="Notifications" />,     icon: Bell },
    { path: "/my-complaints",    label: <T en="My Complaints" />,     icon: FileText, roles: ['citizen'] },
    { path: "/analytics",        label: <T en="Analytics" />,         icon: BarChart3,     disabled: true },
    { path: "/feedback",         label: <T en="Feedback" />,          icon: MessageSquare, disabled: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  const isActive = (path) => location.pathname === path;

  const getVerificationBadge = () => {
    const status = user?.verificationDoc?.status || "none";
    const map = {
      none:     { color: "bg-gray-100 text-gray-500",    label: <T en="Not Verified" /> },
      pending:  { color: "bg-yellow-100 text-yellow-700",label: <T en="Pending" /> },
      approved: { color: "bg-green-100 text-green-700",  label: <T en="Verified" /> },
      rejected: { color: "bg-red-100 text-red-700",      label: <T en="Rejected" /> },
    };
    return map[status];
  };

  const verBadge = getVerificationBadge();

  const VolunteerDetailModal = ({ ad, onClose }) => {
    if (!ad) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white w-full max-w-sm rounded-[1.5rem] overflow-hidden shadow-xl border border-gray-100"
        >
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white z-10 transition-colors">
            <X size={16} />
          </button>
          
          <div className="h-40 relative">
            <img src={resolveAvatar(ad.posterUrl)} alt={ad.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-lg font-bold leading-tight">{ad.title}</h2>
              <p className="text-[10px] font-medium text-white/80 uppercase tracking-widest mt-1">
                {new Date(ad.dateOfEvent).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Description</h3>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{ad.description}</p>
            </div>

            <div className="flex items-center justify-between py-3 border-y border-gray-50">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-teal-500" />
                <span className="text-[11px] font-bold text-gray-700">{ad.requiredVolunteers} Needed</span>
              </div>
              <div className="flex items-center gap-1.5 bg-teal-50 px-2 py-1 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-bold text-teal-700 uppercase">Active</span>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100/50">
              <h3 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <MessageSquare size={12} />
                Contact to Register
              </h3>
              <p className="text-xs text-amber-900 font-bold">{ad.contactDetails}</p>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ─── Logo area ──────────────────────────────────────────── */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white font-bengali">স</span>
            </div>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-lg font-bold text-gray-900 font-bengali">সমাধান</h1>
                <p className="text-[10px] text-gray-400 -mt-0.5">Somadhan</p>
              </motion.div>
            )}
          </div>
          {!isCollapsed && <LanguageToggle variant="light" />}
        </div>
      </div>

      {/* ─── Profile (fixed above nav) ──────────────────────────── */}
      <Link
        to="/profile"
        onClick={() => setIsOpen(false)}
        className={`p-4 border-b border-gray-100 block transition-colors ${
          isActive("/profile") ? "bg-gradient-to-r from-teal-50 to-blue-50" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex-shrink-0 ring-2 transition-all overflow-hidden ${
            isActive("/profile") ? "ring-teal-400" : "ring-transparent"
          }`}>
            {resolveAvatar(user?.avatar) ? (
              <img
                src={resolveAvatar(user?.avatar)}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${
                isActive("/profile") ? "from-teal-200 to-blue-200" : "from-teal-100 to-blue-100"
              }`}>
                <span className="text-sm font-bold text-teal-700">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${verBadge.color}`}>
                  {user?.isVerified && <ShieldCheck size={10} />}
                  {verBadge.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* ─── Navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.disabled ? "#" : item.path}
              onClick={() => { if (!item.disabled) setIsOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                item.disabled
                  ? "text-gray-300 cursor-not-allowed"
                  : active
                    ? "bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-500 rounded-r-full"
                />
              )}
              <Icon size={18} className={active ? "text-teal-600" : ""} />
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {!isCollapsed && item.disabled && (
                <span className="ml-auto text-[10px] text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">
                  <T en="Soon" />
                </span>
              )}
            </Link>
          );
        })}

        {/* ─── Volunteer Ads Section (Citizens Only) ──────────────── */}
        {user?.role === 'citizen' && !isCollapsed && volunteerAds.length > 0 && (
          <div className="mt-8 px-1 pb-4">
            <h3 className="px-3 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-teal-500" />
              <T en="Volunteer Opportunities" />
            </h3>
            <div className="space-y-4">
              {volunteerAds.map(ad => (
                <motion.div 
                  key={ad._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="relative h-24 w-full mb-3 overflow-hidden rounded-xl">
                    <img 
                      src={resolveAvatar(ad.posterUrl)} 
                      alt={ad.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-bold">
                      {new Date(ad.dateOfEvent).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 line-clamp-1 mb-1">{ad.title}</h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
                    {ad.description}
                  </p>
                  <button
                    onClick={() => setSelectedAd(ad)}
                    className="w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2 bg-teal-600 text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700 active:scale-95"
                  >
                    <T en="View Details" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ─── Bottom actions ─────────────────────────────────────── */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full"
        >
          <LogOut size={18} />
          {!isCollapsed && <span><T en="Sign out" /></span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Mobile hamburger ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
      >
        <Menu size={22} className="text-gray-700" />
      </button>

      {/* ─── Volunteer Detail Modal ─────────────────────────────── */}
      <AnimatePresence>
        {selectedAd && (
          <VolunteerDetailModal 
            ad={selectedAd} 
            onClose={() => setSelectedAd(null)} 
          />
        )}
      </AnimatePresence>

      {/* ─── Mobile overlay ───────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
              {SidebarContent()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Desktop sidebar ──────────────────────────────────────── */}
      <motion.aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {SidebarContent()}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft
            size={14}
            className={`text-gray-500 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>
      </motion.aside>
    </>
  );
};

export default Sidebar;
