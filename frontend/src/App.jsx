import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ComplaintPage from './pages/ComplaintPage';
import VerificationPage from './pages/VerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import HeatmapPage from './pages/HeatmapPage';
import NotificationsPage from './pages/NotificationsPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import MyComplaintsPage from './pages/MyComplaintsPage';
import ServantDashboardPage from './pages/servant/ServantDashboardPage';
import ServantComplaintsPage from './pages/servant/ServantComplaintsPage';
import ServantProfilePage from './pages/servant/ServantProfilePage';
import ServantHeatmapPage from './pages/servant/ServantHeatmapPage';
import { useAuth } from './context/AuthContext';

// ─── Citizen-only route (redirect servants away) ──────────────────────
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'department_officer') return <Navigate to="/servant/dashboard" replace />;
  return children;
};

// ─── Servant-only route ───────────────────────────────────────────────
const ServantRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'department_officer') return <Navigate to="/dashboard" replace />;
  return children;
};

// ─── Guest route (redirect logged-in users to their dashboard) ────────
const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'department_officer') return <Navigate to="/servant/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const { loading } = useAuth();

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
            background: '#1e293b',
            color: '#f1f5f9',
            borderRadius: '12px',
          },
        }}
      />
      <Routes>
        {/* ─── Auth Pages (guest only) ──────────────────────────── */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

        {/* ─── OAuth callback (no guard — token arrives here) ───── */}
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* ─── Citizen Pages ────────────────────────────────────── */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/submit-complaint" element={<ProtectedRoute><ComplaintPage /></ProtectedRoute>} />
        <Route path="/verify" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/heatmap" element={<ProtectedRoute><HeatmapPage /></ProtectedRoute>} />
        <Route path="/complaints/:id" element={<ProtectedRoute><ComplaintDetailPage /></ProtectedRoute>} />
        <Route path="/my-complaints" element={<ProtectedRoute><MyComplaintsPage /></ProtectedRoute>} />

        {/* ─── Public Servant Pages ─────────────────────────────── */}
        <Route path="/servant/dashboard" element={<ServantRoute><ServantDashboardPage /></ServantRoute>} />
        <Route path="/servant/complaints" element={<ServantRoute><ServantComplaintsPage /></ServantRoute>} />
        <Route path="/servant/profile" element={<ServantRoute><ServantProfilePage /></ServantRoute>} />
        <Route path="/servant/heatmap" element={<ServantRoute><ServantHeatmapPage /></ServantRoute>} />

        {/* ─── Shared protected routes ──────────────────────────── */}
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* ─── Fallback ─────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
