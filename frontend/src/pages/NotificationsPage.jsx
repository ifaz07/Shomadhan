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
  Check,
  ArrowRight,
  Sparkles,
  CheckCheck,
  Activity,
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
      setDbNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All marked as read");
    } catch (err) {
      toast.error("Failed to update notifications");
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setDbNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
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
  const unreadDbCount = dbNotifications.filter((n) => !n.isRead).length;
  const verificationTimestamp =
    user?.verificationDoc?.verifiedAt ||
    user?.verificationDoc?.submittedAt ||
    null;

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
    ...(formattedLoginTime
      ? [
          {
            id: "login",
            icon: <LogIn size={20} className="text-teal-500" />,
            title: "Logged In Successfully",
            message: `You signed in on ${formattedLoginTime}.`,
            color: "border-teal-200 bg-teal-50",
            titleColor: "text-teal-700",
            createdAt: loginTime,
          },
        ]
      : []),
    ...(!isServant
      ? [
          {
            ...getVerificationNotification(),
            createdAt: verificationTimestamp,
          },
        ]
      : []),
  ];

  const allNotifications = [
    ...staticNotifications,
    ...dbNotifications.map((n) => ({
      id: n._id,
      ...typeConfig[n.type || "info"],
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
      isDb: true,
      to: n.relatedTicket
        ? isServant
          ? `/servant/complaints/${n.relatedTicket}`
          : `/complaints/${n.relatedTicket}`
        : null,
    })),
  ].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const totalFeedCount = allNotifications.length;
  const staticCount = staticNotifications.length;
  const latestActivity = dbNotifications[0]?.createdAt || null;

  return (
    <Layout>
      <div className="w-full space-y-6 px-0 sm:px-1">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:px-8 sm:py-8"
        >
          <div className="grid gap-6 xl:grid-cols-12 xl:items-end">
            <div className="xl:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-100">
                <Sparkles size={12} className="text-cyan-300" />
                Activity Center
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-900/20">
                  <Bell size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Notifications</h1>
                  <p className="mt-1 text-sm text-slate-200/85 sm:text-base">
                    Track account activity, verification updates, and emergency or complaint alerts in one place.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Inbox Summary</p>
                <p className="mt-2 text-3xl font-black text-white">{totalFeedCount}</p>
                <p className="mt-1 text-xs text-slate-300">All account notes and live alerts in one feed</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Unread Alerts</p>
                <p className="mt-2 text-3xl font-black text-white">{unreadDbCount}</p>
                <p className="mt-1 text-xs text-slate-300">Updates still waiting for review</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Latest Activity</p>
                <p className="mt-2 text-sm font-black text-white">
                  {latestActivity
                    ? new Date(latestActivity).toLocaleDateString([], { month: "short", day: "numeric" })
                    : "System only"}
                </p>
                <p className="mt-1 text-xs text-slate-300">Most recent database activity</p>
              </div>
            </div>
          </div>
        </motion.div>

        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Recent Updates</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {unreadDbCount} unread alert{unreadDbCount === 1 ? "" : "s"}, {staticCount} account note{staticCount === 1 ? "" : "s"}, and {dbNotifications.length} live feed update{dbNotifications.length === 1 ? "" : "s"}.
                </p>
              </div>

              {dbNotifications.some((n) => !n.isRead) && (
                <button
                  onClick={markAllAsRead}
                  className="hidden items-center gap-1.5 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 sm:inline-flex"
                >
                  <Check size={14} />
                  Mark all as read
                </button>
              )}
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="py-24 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                  <p className="text-sm font-medium text-slate-500">Loading updates...</p>
                </div>
              ) : (
                <AnimatePresence>
                  {allNotifications.map((n, i) => (
                    <motion.article
                      key={n.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`group relative overflow-hidden rounded-[1.9rem] border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-7 ${
                        n.color
                      } ${n.isDb && !n.isRead ? "ring-2 ring-cyan-400/60 shadow-[0_14px_40px_-22px_rgba(6,182,212,0.55)]" : "shadow-sm"}`}
                      onClick={() => n.isDb && !n.isRead && markAsRead(n.id)}
                    >
                      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-blue-500 to-teal-400 opacity-90" />

                      <div className="flex items-start gap-4 pl-2">
                        <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-white/70">
                          {n.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-base font-bold ${n.titleColor}`}>{n.title}</p>
                            {n.isDb && !n.isRead && (
                              <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                                New
                              </span>
                            )}
                            {!n.isDb && (
                              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                System
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-base leading-8 text-slate-600">{n.message}</p>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Clock size={13} />
                              <span>
                                {n.createdAt
                                  ? new Date(n.createdAt).toLocaleString([], {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Stored locally"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {n.to && (
                                <Link
                                  to={n.to}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/85 px-3 py-2 text-xs font-bold text-cyan-700 transition hover:bg-white"
                                >
                                  View Details
                                  <ArrowRight size={13} />
                                </Link>
                              )}

                              {n.action && (
                                <Link
                                  to={n.action.to}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/85 px-3 py-2 text-xs font-bold text-cyan-700 transition hover:bg-white"
                                >
                                  {n.action.label}
                                  <ArrowRight size={13} />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              )}

              {!loading && allNotifications.length === 0 && (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 py-24 text-center">
                  <Bell size={42} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-base font-semibold text-slate-600">No notifications yet</p>
                  <p className="mt-2 text-sm text-slate-400">We’ll place complaint activity and account updates here as they arrive.</p>
                </div>
              )}
            </div>
          </section>
      </div>
    </Layout>
  );
};

export default NotificationsPage;
