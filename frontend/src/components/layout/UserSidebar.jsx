import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, LogOut, Menu, X, ChevronLeft,
  ShieldCheck, Bell, FileText, BarChart3, MessageSquare,
  PlusCircle, Map, Users, Check
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

const UserSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [volunteerAds, setVolunteerAds] = useState([]);
  const [registering, setRegistering] = useState(null);

  useEffect(() => {
    fetchActiveAds();
  }, []);

  const fetchActiveAds = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/volunteer-ads/active`);
      if (data.success) {
        setVolunteerAds(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch volunteer ads', error);
    }
  };

  const handleRegister = async (adId) => {
    setRegistering(adId);
    try {
      const { data } = await axios.post(`${API_BASE}/volunteer-ads/${adId}/register`, {}, { withCredentials: true });
      if (data.success) {
        toast.success('Registered successfully!');
        // Update local state
        setVolunteerAds(prev => prev.map(ad => 
          ad._id === adId 
            ? { ...ad, registeredVolunteers: [...ad.registeredVolunteers, user._id] } 
            : ad
        ));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register');
    } finally {
      setRegistering(null);
    }
  };

  const navItems = [
    { path: "/profile", label: <T en="My Profile" />, icon: User },
    { path: "/dashboard", label: <T en="Dashboard" />, icon: LayoutDashboard },
    { path: "/submit-complaint", label: <T en="Submit Complaint" />, icon: PlusCircle },
    { path: "/heatmap", label: <T en="Complaint Heatmap" />, icon: Map },
    { path: "/notifications", label: <T en="Notifications" />, icon: Bell },
    { path: "/my-complaints", label: <T en="My Complaints" />, icon: FileText },
  ];

  const isActive = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ─── Logo area ──────────────────────────────────────────── */}
      <div className="p-5 border-b border-gray-100 flex-shrink-0">
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
        </div>
      </div>

      {/* ─── Navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={18} className={active ? "text-teal-600" : ""} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* ─── Volunteer Ads Section ──────────────────────────────── */}
        {!isCollapsed && volunteerAds.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={12} />
              Volunteer Opportunities
            </h3>
            <div className="space-y-3 px-2">
              {volunteerAds.map(ad => {
                const isRegistered = ad.registeredVolunteers.includes(user?._id);
                return (
                  <div key={ad._id} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
                    <img 
                      src={resolveAvatar(ad.posterUrl)} 
                      alt={ad.title} 
                      className="w-full h-24 object-cover rounded-xl mb-3"
                    />
                    <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{ad.title}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{ad.description}</p>
                    <button
                      onClick={() => !isRegistered && handleRegister(ad._id)}
                      disabled={isRegistered || registering === ad._id}
                      className={`w-full mt-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${
                        isRegistered 
                          ? "bg-green-50 text-green-600 cursor-default" 
                          : "bg-teal-600 text-white hover:bg-teal-700 active:scale-95"
                      }`}
                    >
                      {isRegistered ? (
                        <><Check size={12} /> Registered</>
                      ) : (
                        registering === ad._id ? 'Registering...' : 'Register as Volunteer'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ─── Bottom actions ─────────────────────────────────────── */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg"
      >
        <Menu size={22} className="text-gray-700" />
      </button>

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
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50"
            >
              {SidebarContent()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-80"
        }`}
      >
        {SidebarContent()}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm"
        >
          <ChevronLeft size={14} className={isCollapsed ? "rotate-180" : ""} />
        </button>
      </motion.aside>
    </>
  );
};

export default UserSidebar;
