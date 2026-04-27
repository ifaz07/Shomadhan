import { useState, useEffect } from "react";
import { 
  Bell, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  LogIn, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  XCircle,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import ServantLayout from "../components/layout/ServantLayout";
import { Link } from "react-router-dom";
import { notificationAPI } from "../services/api";
import toast from "react-hot-toast";

const NotificationsPage = () => {
  const { user } = useAuth();
  const [dbNotifications, setDbNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const isServant = user?.role === "department_officer";
  const Layout = isServant ? ServantLayout : DashboardLayout;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setDbNotifications(res.data.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setDbNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All marked as read");
    } catch (err) {
      toast.error("Failed to update notifications");
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setDbNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const loginTime = localStorage.getItem("loginTime");
  const formattedLoginTime = loginTime
    ? new Date(loginTime).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const verificationStatus = user?.verificationDoc?.status || "none";

  const getVerificationNotification = () => {
    const vn = {
      none: {
        id: "v-none",
        icon: <ShieldAlert size={20} className="text-gray-400" />,
        title: "Identity Not Verified",
        message: "You haven't submitted your identity documents yet. Verify your account to unlock full access.",
        color: "border-gray-200 bg-gray-50",
        titleColor: "text-gray-700",
        action: { label: "Verify Now", to: "/verify" },
      },
      pending: {
        id: "v-pending",
        icon: <ShieldAlert size={20} className="text-yellow-500" />,
        title: "Verification Pending",
        message: "Your identity documents are under review. We'll notify you once complete.",
        color: "border-yellow-200 bg-yellow-50",
        titleColor: "text-yellow-700",
      },
      approved: {
        id: "v-approved",
        icon: <ShieldCheck size={20} className="text-green-500" />,
        title: "Identity Verified",
        message: "Your identity has been successfully verified. You have full access.",
        color: "border-green-200 bg-green-50",
        titleColor: "text-green-700",
      },
      rejected: {
        id: "v-rejected",
        icon: <ShieldAlert size={20} className="text-red-500" />,
        title: "Verification Rejected",
        message: user?.verificationDoc?.rejectionReason || "Your verification was rejected. Please resubmit.",
        color: "border-red-200 bg-red-50",
        titleColor: "text-red-700",
        action: { label: "Resubmit Documents", to: "/verify" },
      },
    };
    return vn[verificationStatus];
  };

  const typeConfig = {
    info: { icon: <Info size={20} className="text-blue-500" />, color: "border-blue-100 bg-blue-50/50", titleColor: "text-blue-700" },
    success: { icon: <CheckCircle size={20} className="text-green-500" />, color: "border-green-100 bg-green-50/50", titleColor: "text-green-700" },
    warning: { icon: <AlertTriangle size={20} className="text-orange-500" />, color: "border-orange-100 bg-orange-50/50", titleColor: "text-orange-700" },
    error: { icon: <XCircle size={20} className="text-red-500" />, color: "border-red-100 bg-red-50/50", titleColor: "text-red-700" },
  };

  const staticNotifications = [
    ...(formattedLoginTime ? [{
      id: "login",
      icon: <LogIn size={20} className="text-teal-500" />,
      title: "Logged In Successfully",
      message: `You signed in on ${formattedLoginTime}.`,
      color: "border-teal-200 bg-teal-50",
      titleColor: "text-teal-700",
    }] : []),
    ...(!isServant ? [getVerificationNotification()] : [])
  ];

  const allNotifications = [
    ...staticNotifications,
    ...dbNotifications.map(n => ({
      id: n._id,
      ...typeConfig[n.type || 'info'],
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
      isDb: true,
      to: n.relatedTicket
        ? isServant
          ? `/servant/complaints/${n.relatedTicket}`
          : `/complaints/${n.relatedTicket}`
        : null
    }))
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">
                {dbNotifications.filter(n => !n.isRead).length} unread updates
              </p>
            </div>
          </div>
          
          {dbNotifications.some(n => !n.isRead) && (
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <Check size={14} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="space-y-3">
          {loading ? (
             <div className="py-20 text-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading updates...</p>
             </div>
          ) : (
            <AnimatePresence>
              {allNotifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative rounded-2xl border p-4 transition-all ${n.color} ${n.isDb && !n.isRead ? 'ring-1 ring-teal-500 shadow-sm shadow-teal-100' : ''}`}
                  onClick={() => n.isDb && !n.isRead && markAsRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${n.titleColor}`}>{n.title}</p>
                        {n.isDb && !n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                      
                      {n.to && (
                        <Link
                          to={n.to}
                          className="inline-block mt-2 text-xs font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2"
                        >
                          View Details →
                        </Link>
                      )}
                      
                      {n.action && (
                        <Link
                          to={n.action.to}
                          className="inline-block mt-2 text-xs font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2"
                        >
                          {n.action.label} →
                        </Link>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Clock size={12} className="text-gray-300 mt-1" />
                      {n.createdAt && (
                        <span className="text-[10px] text-gray-400 font-medium">
                           {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {!loading && allNotifications.length === 0 && (
            <div className="py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
               <Bell size={40} className="text-gray-200 mx-auto mb-3" />
               <p className="text-gray-500 font-medium">No notifications yet</p>
               <p className="text-gray-400 text-xs mt-1">We'll notify you when your tickets are updated</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NotificationsPage;
