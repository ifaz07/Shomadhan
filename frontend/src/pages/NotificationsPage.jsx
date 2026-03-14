import { Bell, ShieldCheck, ShieldAlert, Clock, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Link } from "react-router-dom";

const NotificationsPage = () => {
  const { user } = useAuth();

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
      message:
        user?.verificationDoc?.rejectionReason
          ? `Your verification was rejected: ${user.verificationDoc.rejectionReason}. Please resubmit with valid documents.`
          : "Your verification was rejected. Please resubmit with valid documents.",
      color: "border-red-200 bg-red-50",
      titleColor: "text-red-700",
      action: { label: "Resubmit Documents", to: "/verify" },
    },
  };

  const vn = verificationNotification[verificationStatus];

  const notifications = [
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
          },
        ]
      : []),
    {
      id: "verification",
      ...vn,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Notification list */}
        <div className="space-y-3">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl border p-4 ${n.color}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${n.titleColor}`}>{n.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                  {n.action && (
                    <Link
                      to={n.action.to}
                      className="inline-block mt-2 text-xs font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2"
                    >
                      {n.action.label} →
                    </Link>
                  )}
                </div>
                <Clock size={12} className="text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
