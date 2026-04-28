import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getDefaultDashboardRoute } from '../utils/roleRoutes';
import T from '../components/T';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data } = await authAPI.resetPassword(token, { password: formData.password });
      // Log the user in with the returned token
      const user = await loginWithToken(data.data.token);
      toast.success('Password reset successfully!');
      navigate(getDefaultDashboardRoute(user?.role), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8 sm:p-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            <T en="Set new password" />
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            <T en="Choose a strong password for your account." />
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              <T en="New password" />
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={18} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className={`input-field pl-11 pr-11 ${errors.password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-red-500 text-xs mt-1.5"
                >
                  {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              <T en="Confirm password" />
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={18} />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                className={`input-field pl-11 pr-11 ${errors.confirmPassword ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-red-500 text-xs mt-1.5"
                >
                  {errors.confirmPassword}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: isLoading ? 1 : 0.99 }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span><T en="Resetting..." /></span>
              </>
            ) : (
              <>
                <span><T en="Reset Password" /></span>
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold transition-colors"
          >
            <ArrowLeft size={14} />
            <T en="Back to sign in" />
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-white/30 mt-6">
        © 2026 সমাধান (Somadhan). All rights reserved.
      </p>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
