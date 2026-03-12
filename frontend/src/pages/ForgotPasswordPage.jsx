import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import { authAPI } from '../services/api';
import T from '../components/T';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8 sm:p-10">
        {submitted ? (
          // ─── Success state ──────────────────────────────────────────
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="flex justify-center mb-4">
              <CheckCircle size={52} className="text-teal-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              <T en="Check your email" />
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              <T en="If that email is registered, we sent a password reset link. It expires in 30 minutes." />
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors"
            >
              <ArrowLeft size={16} />
              <T en="Back to sign in" />
            </Link>
          </motion.div>
        ) : (
          // ─── Form state ─────────────────────────────────────────────
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                <T en="Forgot password?" />
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                <T en="Enter your email and we'll send you a reset link." />
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  <T en="Email address" />
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="you@example.com"
                    className={`input-field pl-11 ${error ? 'input-error' : ''}`}
                  />
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-500 text-xs mt-1.5"
                    >
                      {error}
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
                    <span><T en="Sending..." /></span>
                  </>
                ) : (
                  <>
                    <span><T en="Send Reset Link" /></span>
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
          </>
        )}
      </div>

      <p className="text-center text-xs text-white/30 mt-6">
        © 2026 সমাধান (Somadhan). All rights reserved.
      </p>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
