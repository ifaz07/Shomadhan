import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import SocialButtons from '../components/auth/SocialButtons';
import { useAuth } from '../context/AuthContext';
import T from '../components/T';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  // ─── Client-side validation ──────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      await login(formData);
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setErrors(serverErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* ─── Mobile logo ──────────────────────────────────────────── */}
      <div className="lg:hidden text-center mb-8">
        <motion.div
          className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        >
          <span className="text-2xl font-bold text-white font-bengali">স</span>
        </motion.div>
        <h1 className="text-2xl font-bold text-white font-bengali">সমাধান</h1>
        <p className="text-white/40 text-sm mt-1">Somadhan</p>
      </div>

      {/* ─── Card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8 sm:p-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900"><T en="Welcome back" /></h2>
          <p className="text-gray-500 mt-1 text-sm"><T en="Sign in to continue to your dashboard" /></p>
        </div>

        <SocialButtons />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">
              <T en="or sign in with email" />
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              <T en="Email address" />
            </label>
            <div className="relative">
              <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                focusedField === 'email' ? 'text-teal-500' : 'text-gray-400'
              }`}>
                <Mail size={18} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                className={`input-field pl-11 ${errors.email ? 'input-error' : ''}`}
              />
            </div>
            <AnimatePresence>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-red-500 text-xs mt-1.5"
                >
                  {errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                <T en="Password" />
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                <T en="Forgot password?" />
              </button>
            </div>
            <div className="relative">
              <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                focusedField === 'password' ? 'text-teal-500' : 'text-gray-400'
              }`}>
                <Lock size={18} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your password"
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

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer">
              <T en="Keep me signed in" />
            </label>
          </div>

          {/* Submit */}
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
                <span><T en="Signing in..." /></span>
              </>
            ) : (
              <>
                <span><T en="Sign In" /></span>
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-7 border-t border-slate-100 pt-5 text-center">
          <p className="text-sm text-slate-500">
            <T en="New to Somadhan?" />
          </p>
          <Link
            to="/signup"
            className="mt-2 inline-flex items-center justify-center text-sm font-bold text-teal-700 transition-colors hover:text-teal-800"
          >
            <T en="Create your account" />
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-white/30 mt-6">
        © 2026 সমাধান (Somadhan). All rights reserved.
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
