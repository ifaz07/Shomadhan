import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Bell,
  Map,
  BarChart3,
  MessageSquare,
  AlertTriangle,
  History,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { notificationAPI } from "../../services/api";
import LanguageToggle from "../LanguageToggle";
import { VerifiedMark } from "../VerifiedBadge";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1");
const resolveAvatar = (url) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_BASE.replace("/api/v1", "")}${url}`;
};

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

const ServantSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationAPI.getAll();
        const unread = res.data.data.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [location.pathname]);

  const deptLabel = DEPT_DISPLAY[user?.department] || "Department";
  const userAvatar = resolveAvatar(user?.avatar);

  const navItems = [
    { path: "/servant/profile", label: "My Profile", icon: User },
    { path: "/servant/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      path: "/servant/complaints",
      label: "Department Complaints",
      icon: ClipboardList,
    },
    {
      path: "/servant/notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      path: "/servant/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      path: "/servant/heatmap",
      label: "Complaint Heatmap",
      icon: Map,
    },
    {
      path: "/servant/feedback",
      label: "Feedback",
      icon: MessageSquare,
    },
    {
      path: "/servant/emergency",
      label: "Emergency Broadcast",
      icon: AlertTriangle,
    },
    {
      path: "/servant/emergency-history",
      label: "Broadcast History",
      icon: History,
    },
  ];

  const isActive = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ─── Logo ─────────────────────────────────────────────── */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-[#0d3b4b]/5 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[#a1824a]/20">
              <img src="/assets/auth-logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <motion.div
              initial={false}
              animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -8 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden whitespace-nowrap"
            >
                <h1 className="text-lg font-black text-[#0d3b4b]">Somadhan</h1>
                <p className="text-[10px] text-[#a1824a] font-bold tracking-widest uppercase -mt-1">
                  City Govt
                </p>
              </motion.div>
          </div>
          <motion.div
            initial={false}
            animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.96 : 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={isCollapsed ? "pointer-events-none" : ""}
          >
            <LanguageToggle variant="light" />
          </motion.div>
        </div>
      </div>

      {/* ─── Officer info ──────────────────────────────────────── */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={user?.name || "Officer"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-blue-700">
                  {user?.name?.charAt(0)?.toUpperCase() || "O"}
                </span>
              )}
            </div>
            {user?.isVerified && (
              <VerifiedMark className="absolute -bottom-0.5 -right-0.5" />
            )}
          </div>
          <motion.div
            initial={false}
            animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -8 : 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`flex-1 min-w-0 overflow-hidden ${isCollapsed ? "w-0" : "w-auto"}`}
          >
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.name}
              </p>
              {user?.designation && (
                <p className="text-[10px] text-gray-500 truncate">
                  {user.designation}
                </p>
              )}
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 mt-0.5">
                {deptLabel}
              </span>
            </motion.div>
        </div>
      </div>

      {/* ─── Navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                active
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="servantActiveTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"
                />
              )}
              <Icon size={18} className={active ? "text-blue-600" : ""} />
              <motion.span
                initial={false}
                animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -6 : 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={`overflow-hidden whitespace-nowrap ${isCollapsed ? "w-0" : "w-auto"}`}
              >
                {item.label}
              </motion.span>
              {!isCollapsed && item.badge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Sign out ───────────────────────────────────────────── */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full"
        >
          <LogOut size={18} />
          <motion.span
            initial={false}
            animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -6 : 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`overflow-hidden whitespace-nowrap ${isCollapsed ? "w-0" : "w-auto"}`}
          >
            Sign out
          </motion.span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
      >
        <Menu size={22} className="text-gray-700" />
      </button>

      {/* Mobile overlay */}
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
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
              {SidebarContent()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 288 }}
        transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 overflow-hidden will-change-[width]"
      >
        {SidebarContent()}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onMouseEnter={() => setIsCollapsed((prev) => !prev)}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-24 h-10 w-10 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-center shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] hover:bg-slate-50 hover:shadow-[0_18px_36px_-18px_rgba(15,23,42,0.45)] transition-all duration-200"
        >
          <span className="pointer-events-none absolute inset-y-2 left-0 w-px rounded-full bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          <ChevronLeft
            size={14}
            className={`text-gray-500 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>
      </motion.aside>
    </>
  );
};

export default ServantSidebar;
