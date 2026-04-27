import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Clock,
  LogIn,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import T from "../components/T";
import api from "../services/api";

const SEVERITY_STYLES = {
  low: {
    color: "border-emerald-200 bg-emerald-50",
    titleColor: "text-emerald-700",
    iconClass: "text-emerald-500",
  },
  medium: {
    color: "border-amber-200 bg-amber-50",
    titleColor: "text-amber-700",
    iconClass: "text-amber-500",
  },
  high: {
    color: "border-orange-200 bg-orange-50",
    titleColor: "text-orange-700",
    iconClass: "text-orange-500",
  },
  critical: {
    color: "border-red-200 bg-red-50",
    titleColor: "text-red-700",
    iconClass: "text-red-500",
  },
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(true);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        setLoadingBroadcasts(true);
        const { data } = await api.get("/emergency-broadcast/active");
        const items = Array.isArray(data?.data) ? data.data : [];
        const citizenVisible = items.filter((item) =>
          ["all", "citizens"].includes(item.targetAudience)
        );

        setBroadcasts(citizenVisible);

        if (user?._id && citizenVisible.length > 0) {
          await Promise.allSettled(
            citizenVisible.map((item) =>
              api.post(`/emergency-broadcast/${item._id}/read`)
            )
          );
        }
      } catch {
        toast.error("Failed to load emergency notifications");
      } finally {
        setLoadingBroadcasts(false);
      }
    };

    fetchBroadcasts();
  }, [user?._id]);

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

  const verificationNotification = {
    none: {
      icon: <ShieldAlert size={20} className="text-gray-400" />,
      title: "Identity Not Verified",
      message:
        "You haven't submitted your identity documents yet. Verify your account to unlock full access to complaint submission.",
      color: "border-gray-200 bg-gray-50",
      titleColor: "text-gray-700",
      action: { label: "Verify Now", to: "/verify" },
    },
    pending: {
      icon: <ShieldAlert size={20} className="text-yellow-500" />,
      title: "Verification Pending",
      message:
        "Your identity documents have been submitted and are under review. We'll notify you once the review is complete.",
      color: "border-yellow-200 bg-yellow-50",
      titleColor: "text-yellow-700",
      action: null,
    },
    approved: {
      icon: <ShieldCheck size={20} className="text-green-500" />,
      title: "Identity Verified",
      message:
        "Your identity has been successfully verified. You have full access to all platform features.",
      color: "border-green-200 bg-green-50",
      titleColor: "text-green-700",
      action: null,
    },
    rejected: {
      icon: <ShieldAlert size={20} className="text-red-500" />,
      title: "Verification Rejected",
      message: user?.verificationDoc?.rejectionReason
        ? `Your verification was rejected: ${user.verificationDoc.rejectionReason}. Please resubmit with valid documents.`
        : "Your verification was rejected. Please resubmit with valid documents.",
      color: "border-red-200 bg-red-50",
      titleColor: "text-red-700",
      action: { label: "Resubmit Documents", to: "/verify" },
    },
  };

  const emergencyNotifications = useMemo(
    () =>
      broadcasts.map((broadcast) => {
        const style = SEVERITY_STYLES[broadcast.severity] || SEVERITY_STYLES.medium;
        const message = broadcast.affectedArea?.address
          ? `${broadcast.message} Area: ${broadcast.affectedArea.address}.`
          : broadcast.areaLabel
            ? `${broadcast.message} Area: ${broadcast.areaLabel}.`
          : broadcast.message;

        return {
          id: broadcast._id,
          icon: <AlertTriangle size={20} className={style.iconClass} />,
          title: broadcast.title,
          message,
          color: style.color,
          titleColor: style.titleColor,
          action: null,
          createdAt: broadcast.createdAt,
          location: broadcast.areaLabel || broadcast.affectedArea?.address || null,
        };
      }),
    [broadcasts]
  );

  const notifications = useMemo(
    () => [
      ...emergencyNotifications,
      ...(formattedLoginTime
        ? [
            {
              id: "login",
              icon: <LogIn size={20} className="text-teal-500" />,
              title: "Logged In Successfully",
              message: `You signed in on ${formattedLoginTime}.`,
              color: "border-teal-200 bg-teal-50",
              titleColor: "text-teal-700",
              action: null,
              createdAt: null,
              location: null,
            },
          ]
        : []),
      {
        id: "verification",
        ...verificationNotification[verificationStatus],
        createdAt: null,
        location: null,
      },
    ],
    [emergencyNotifications, formattedLoginTime, verificationStatus, verificationNotification]
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <T en="Notifications" />
            </h1>
            <p className="text-sm text-gray-500">
              {loadingBroadcasts ? (
                <T en="Loading notifications..." />
              ) : (
                <T en={`${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`} />
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {loadingBroadcasts ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
              <Bell size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">
                <T en="No notifications available right now" />
              </p>
            </div>
          ) : (
            notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`rounded-2xl border p-4 ${notification.color}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">{notification.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${notification.titleColor}`}>
                      {notification.id === "verification" || notification.id === "login" ? (
                        notification.title
                      ) : (
                        <T en={notification.title} />
                      )}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                      {notification.id === "verification" || notification.id === "login" ? (
                        notification.message
                      ) : (
                        <T en={notification.message} />
                      )}
                    </p>
                    {notification.location && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} />
                        {notification.location}
                      </p>
                    )}
                    {notification.action && (
                      <Link
                        to={notification.action.to}
                        className="inline-block mt-2 text-xs font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2"
                      >
                        {notification.action.label} {"->"}
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Clock size={12} className="text-gray-300 flex-shrink-0 mt-1" />
                    {notification.createdAt && (
                      <span className="text-[11px] text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
