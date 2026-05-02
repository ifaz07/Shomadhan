import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getDefaultDashboardRoute } from "../utils/roleRoutes";

// This page handles the redirect from the backend after Google/Facebook OAuth.
// The backend now redirects to: /auth/oauth-completion?token=JWT_TOKEN&isNew=true/false
// This page is kept for backward compatibility or direct token-based login
const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error || !token) {
      toast.error("Social login failed. Please try again.");
      navigate("/login", { replace: true });
      return;
    }

    // Legacy flow: directly log in (no verification required)
    loginWithToken(token)
      .then((user) => {
        toast.success("Welcome!");
        navigate(getDefaultDashboardRoute(user?.role), { replace: true });
      })
      .catch(() => {
        toast.error("Failed to sign in. Please try again.");
        navigate("/login", { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen auth-page-wrapper flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#a1824a] border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-black tracking-widest uppercase text-xs opacity-50">Signing you in...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
