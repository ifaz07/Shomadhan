import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import ComplaintPage from "./pages/ComplaintPage";
import VerificationPage from "./pages/VerificationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import OAuthCompletionPage from "./pages/OAuthCompletionPage";
import HeatmapPage from "./pages/HeatmapPage";
import NotificationsPage from "./pages/NotificationsPage";
import ComplaintDetailPage from "./pages/ComplaintDetailPage";
import MyComplaintsPage from "./pages/MyComplaintsPage";
import PublicAnalyticsPage from "./pages/PublicAnalyticsPage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminDashboard from "./pages/AdminDashboard";
import MayorDashboard from "./pages/MayorDashboard";
import ServantDashboardPage from "./pages/servant/ServantDashboardPage";
import ServantComplaintsPage from "./pages/servant/ServantComplaintsPage";
import ServantProfilePage from "./pages/servant/ServantProfilePage";
import ServantHeatmapPage from "./pages/servant/ServantHeatmapPage";
import ServantComplaintDetailPage from "./pages/servant/ServantComplaintDetailPage";
import { useAuth } from "./context/AuthContext";
import { getDefaultDashboardRoute } from "./utils/roleRoutes";

const AuthenticatedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const CitizenRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "citizen") {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />;
  }
  return children;
};

const NonServantRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "department_officer") {
    return <Navigate to="/servant/dashboard" replace />;
  }
  return children;
};

const ServantRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "department_officer") {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />;
  }
  return children;
};

const MayorRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "mayor") {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />;
  }
  return children;
};

const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />;
  }
  return children;
};

function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen auth-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            borderRadius: "12px",
          },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <SignupPage />
            </GuestRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <ForgotPasswordPage />
            </GuestRoute>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <GuestRoute>
              <ResetPasswordPage />
            </GuestRoute>
          }
        />

        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route
          path="/auth/oauth-completion"
          element={<OAuthCompletionPage />}
        />

        <Route
          path="/dashboard"
          element={
            <CitizenRoute>
              <DashboardPage />
            </CitizenRoute>
          }
        />
        <Route
          path="/submit-complaint"
          element={
            <CitizenRoute>
              <ComplaintPage />
            </CitizenRoute>
          }
        />
        <Route
          path="/verify"
          element={
            <NonServantRoute>
              <VerificationPage />
            </NonServantRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <NonServantRoute>
              <ProfilePage />
            </NonServantRoute>
          }
        />
        <Route
          path="/heatmap"
          element={
            <NonServantRoute>
              <HeatmapPage />
            </NonServantRoute>
          }
        />
        <Route
          path="/complaints/:id"
          element={
            <NonServantRoute>
              <ComplaintDetailPage />
            </NonServantRoute>
          }
        />
        <Route
          path="/my-complaints"
          element={
            <NonServantRoute>
              <MyComplaintsPage />
            </NonServantRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <NonServantRoute>
              <FeedbackPage />
            </NonServantRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <NonServantRoute>
              <Navigate to="/analytics/dashboard" replace />
            </NonServantRoute>
          }
        />
        <Route
          path="/analytics/dashboard"
          element={
            <NonServantRoute>
              <PublicAnalyticsPage />
            </NonServantRoute>
          }
        />
        <Route
          path="/mayor/dashboard"
          element={
            <MayorRoute>
              <MayorDashboard />
            </MayorRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/servant/dashboard"
          element={
            <ServantRoute>
              <ServantDashboardPage />
            </ServantRoute>
          }
        />
        <Route
          path="/servant/complaints"
          element={
            <ServantRoute>
              <ServantComplaintsPage />
            </ServantRoute>
          }
        />
        <Route
          path="/servant/profile"
          element={
            <ServantRoute>
              <ServantProfilePage />
            </ServantRoute>
          }
        />
        <Route
          path="/servant/heatmap"
          element={
            <ServantRoute>
              <ServantHeatmapPage />
            </ServantRoute>
          }
        />
        <Route
          path="/servant/complaints/:id"
          element={
            <ServantRoute>
              <ServantComplaintDetailPage />
            </ServantRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <NonServantRoute>
              <NotificationsPage />
            </NonServantRoute>
          }
        />
        <Route
          path="/servant/notifications"
          element={
            <ServantRoute>
              <NotificationsPage />
            </ServantRoute>
          }
        />

        <Route
          path="/"
          element={
            <AuthenticatedRoute>
              <Navigate to={getDefaultDashboardRoute(user?.role)} replace />
            </AuthenticatedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
