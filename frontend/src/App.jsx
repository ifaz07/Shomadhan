import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ComplaintPage from './pages/ComplaintPage';
import VerificationPage from './pages/VerificationPage';
import HeatmapPage from './pages/HeatmapPage';
import MayorDashboardPage from './pages/MayorDashboardPage';
import VolunteerManagementPage from './pages/VolunteerManagementPage';
import CivicAnnouncementPage from './pages/CivicAnnouncementPage';
import PoliceCaseProgressPage from './pages/PoliceCaseProgressPage';
import { useAuth } from './context/AuthContext';

// ─── Protected route wrapper ─────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// ─── Guest route wrapper (redirect to dashboard if logged in) ────────
const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
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

        {/* ─── Protected Pages ──────────────────────────────────── */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/submit-complaint" element={<ProtectedRoute><ComplaintPage /></ProtectedRoute>} />
        <Route path="/verify" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/heatmap" element={<ProtectedRoute><HeatmapPage /></ProtectedRoute>} />

        {/* ─── Mayor/Authority Dashboard ────────────────────────── */}
        <Route path="/mayor-dashboard" element={<ProtectedRoute><MayorDashboardPage /></ProtectedRoute>} />

        {/* ─── Volunteer Management ─────────────────────────────── */}
        <Route path="/volunteers" element={<ProtectedRoute><VolunteerManagementPage /></ProtectedRoute>} />

        {/* ─── Civic Announcements ──────────────────────────────── */}
        <Route path="/announcements" element={<ProtectedRoute><CivicAnnouncementPage /></ProtectedRoute>} />

        {/* ─── Police Case Progress ─────────────────────────────── */}
        <Route path="/cases" element={<ProtectedRoute><PoliceCaseProgressPage /></ProtectedRoute>} />

        {/* ─── Fallback ─────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
