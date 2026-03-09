import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import SocialButtons from '../components/auth/SocialButtons';
import PasswordStrength from '../components/auth/PasswordStrength';
import { useAuth } from '../context/AuthContext';

// ─── Multi-step signup: Step 1 = basic info, Step 2 = password ───────
const SignupPage = () => {
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  // ─── Client-side validation per step ─────────────────────────────
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (formData.phone && !/^(\+880|0)?1[3-9]\d{8}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid BD phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Must contain a lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Must contain an uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Must contain a number';
    } else if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
      newErrors.password = 'Must contain a special character';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must accept the terms';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Handle input changes ────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ─── Step navigation ─────────────────────────────────────────────
  const goToStep2 = () => {
    if (validateStep1()) setStep(2);
  };

  // ─── Submit registration ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
      });
    } catch (error) {
      const msg =
        error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);

      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setErrors(serverErrors);
        // If error is on step-1 fields, go back
        if (serverErrors.name || serverErrors.email || serverErrors.phone) {
          setStep(1);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render input with icon ──────────────────────────────────────
  const renderInput = ({ name, label, type = 'text', icon: Icon, placeholder, autoComplete, isPassword, showToggle, toggleFn, optional }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      <div className="relative">
        <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
          focusedField === name ? 'text-teal-500' : 'text-gray-400'
        }`}>
          <Icon size={18} />
        </div>
        <input
          id={name}
          name={name}
          type={isPassword ? (showToggle ? 'text' : 'password') : type}
          autoComplete={autoComplete}
          value={formData[name]}
          onChange={handleChange}
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField(null)}
          placeholder={placeholder}
          className={`input-field pl-11 ${isPassword ? 'pr-11' : ''} ${errors[name] ? 'input-error' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={toggleFn}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showToggle ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {errors[name] && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-500 text-xs mt-1.5"
          >
            {errors[name]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── Step indicator ──────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <motion.div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
              s < step
                ? 'bg-teal-500 text-white'
                : s === step
                ? 'bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-gray-100 text-gray-400'
            }`}
            animate={s === step ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {s < step ? <CheckCircle2 size={16} /> : s}
          </motion.div>
          {s < 2 && (
            <div className={`w-12 h-0.5 rounded-full transition-colors duration-500 ${
              step > 1 ? 'bg-teal-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <AuthLayout>
      {/* ─── Mobile logo ──────────────────────────────────────────── */}
      <div className="lg:hidden text-center mb-6">
        <motion.div
          className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        >
          <span className="text-2xl font-bold text-white font-bengali">স</span>
        </motion.div>
        <h1 className="text-2xl font-bold text-white font-bengali">সমাধান</h1>
      </div>

      {/* ─── Card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8 sm:p-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="text-gray-500 mt-1 text-sm">
            {step === 1
              ? 'Start by entering your basic information'
              : 'Set a secure password for your account'}
          </p>
        </div>

        <StepIndicator />

        {/* ─── Step 1: Social + Basic Info ──────────────────────── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <SocialButtons />

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">
                    or sign up with email
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {renderInput({
                  name: 'name',
                  label: 'Full name',
                  icon: User,
                  placeholder: 'e.g. Rafiq Ahmed',
                  autoComplete: 'name',
                })}
                {renderInput({
                  name: 'email',
                  label: 'Email address',
                  type: 'email',
                  icon: Mail,
                  placeholder: 'you@example.com',
                  autoComplete: 'email',
                })}
                {renderInput({
                  name: 'phone',
                  label: 'Phone number',
                  type: 'tel',
                  icon: Phone,
                  placeholder: '+880 1XXXXXXXXX',
                  autoComplete: 'tel',
                  optional: true,
                })}

                <motion.button
                  type="button"
                  onClick={goToStep2}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Password + Terms ───────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Password */}
                <div>
                  {renderInput({
                    name: 'password',
                    label: 'Password',
                    icon: Lock,
                    placeholder: 'Create a strong password',
                    autoComplete: 'new-password',
                    isPassword: true,
                    showToggle: showPassword,
                    toggleFn: () => setShowPassword(!showPassword),
                  })}
                  <PasswordStrength password={formData.password} />
                </div>

                {/* Confirm Password */}
                {renderInput({
                  name: 'confirmPassword',
                  label: 'Confirm password',
                  icon: Shield,
                  placeholder: 'Re-enter your password',
                  autoComplete: 'new-password',
                  isPassword: true,
                  showToggle: showConfirm,
                  toggleFn: () => setShowConfirm(!showConfirm),
                })}

                {/* Terms */}
                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      name="agreeTerms"
                      type="checkbox"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 leading-tight">
                      I agree to the{' '}
                      <button type="button" className="text-teal-600 hover:text-teal-700 font-medium underline">
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button type="button" className="text-teal-600 hover:text-teal-700 font-medium underline">
                        Privacy Policy
                      </button>
                    </span>
                  </label>
                  <AnimatePresence>
                    {errors.agreeTerms && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-red-500 text-xs mt-1.5 ml-6"
                      >
                        {errors.agreeTerms}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Verification notice */}
                <motion.div
                  className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-start gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Shield size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-teal-700 leading-relaxed">
                    <strong>Profile verification</strong> — To file complaints, you'll need
                    to verify your identity with a NID, Passport, or Birth Certificate.
                    You can do this after creating your account.
                  </p>
                </motion.div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </motion.button>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    whileHover={{ scale: isLoading ? 1 : 1.01 }}
                    whileTap={{ scale: isLoading ? 1 : 0.99 }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-teal-600 hover:text-teal-700 font-semibold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-white/30 mt-6">
        © 2026 সমাধান (Somadhan). All rights reserved.
      </p>
    </AuthLayout>
  );
};

export default SignupPage;
