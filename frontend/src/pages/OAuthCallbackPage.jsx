import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// This page handles the redirect from the backend after Google/Facebook OAuth.
// The backend redirects to: /auth/callback?token=JWT_TOKEN
const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      toast.error('Social login failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => {
        toast.success('Welcome!');
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        toast.error('Failed to sign in. Please try again.');
        navigate('/login', { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/70 font-medium">Signing you in...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
