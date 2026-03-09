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
  Building2,
  BadgeCheck,
  Briefcase,
  CreditCard,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import SocialButtons from '../components/auth/SocialButtons';
import PasswordStrength from '../components/auth/PasswordStrength';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// ─── Department options ──────────────────────────────────────────────
const DEPARTMENTS = [
  { value: 'public_works', label: 'Public Works' },
  { value: 'water_authority', label: 'Water Authority' },
  { value: 'electricity', label: 'Electricity Dept' },
  { value: 'sanitation', label: 'Sanitation Dept' },
  { value: 'public_safety', label: 'Public Safety Dept' },
  { value: 'animal_control', label: 'Animal Control' },
  { value: 'health', label: 'Health Dept' },
  { value: 'transport', label: 'Transport Dept' },
  { value: 'environment', label: 'Environment Dept' },
  { value: 'other', label: 'Other' },
];

// ─── Multi-step signup ───────────────────────────────────────────────
// Citizen:         Step 1 (role) → Step 2 (basic info) → Step 3 (password)
// Public Servant:  Step 1 (role) → Step 2 (basic + govt info) → Step 3 (password)
const SignupPage = () => {
  const { register } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '', // 'citizen' or 'department_officer'
    name: '',
    email: '',
    phone: '',
    // Public servant extras
    department: '',
    employeeId: '',
    governmentEmail: '',
    designation: '',
    // Password step
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const isPublicServant = formData.role === 'department_officer';
  const totalSteps = 3;

  // ─── Validation per step ─────────────────────────────────────────
  const validateStep2 = () => {
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
    // Public servant extra fields
    if (isPublicServant) {
      if (!formData.department) newErrors.department = 'Department is required';
      if (!formData.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
      if (!formData.governmentEmail.trim()) {
        newErrors.governmentEmail = 'Government email is required';
      } else if (!/^\S+@\S+\.\S+$/.test(formData.governmentEmail)) {
        newErrors.governmentEmail = 'Please enter a valid email';
      }
      if (!formData.designation.trim()) newErrors.designation = 'Designation is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
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
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // ─── Step navigation ─────────────────────────────────────────────
  const selectRole = (role) => {
    setFormData((prev) => ({ ...prev, role }));
    setErrors({});
    setStep(2);
  };

  const goToStep3 = () => {
    if (validateStep2()) setStep(3);
  };

  // ─── Submit registration ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
      };
      if (isPublicServant) {
        payload.role = 'department_officer';
        payload.department = formData.department;
        payload.employeeId = formData.employeeId;
        payload.governmentEmail = formData.governmentEmail;
        payload.designation = formData.designation;
      }
      await register(payload);
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
        if (serverErrors.name || serverErrors.email || serverErrors.phone || serverErrors.department) {
          setStep(2);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render input helper ─────────────────────────────────────────
  const renderInput = ({ name, label, type = 'text', icon: Icon, placeholder, autoComplete, isPassword, showToggle, toggleFn, optional }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {optional && <span className="text-gray-400 font-normal ml-1">({t('optional')})</span>}
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
      {[1, 2, 3].map((s) => (
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
          {s < totalSteps && (
            <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors duration-500 ${
              step > s ? 'bg-teal-500' : 'bg-gray-200'
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('createAccount')}</h2>
          <p className="text-gray-500 mt-1 text-sm">
            {step === 1 && t('chooseRole')}
            {step === 2 && (isPublicServant ? t('enterPersonalDetails') : t('enterBasicInfo'))}
            {step === 3 && t('setPassword')}
          </p>
        </div>

        <StepIndicator />

        <AnimatePresence mode="wait">
          {/* ─── Step 1: Role Selection ──────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <SocialButtons />

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">
                    {t('orChooseRole')}
                  </span>
                </div>
              </div>

              {/* Role Cards */}
              <div className="grid grid-cols-1 gap-3">
                {/* Citizen Card */}
                <motion.button
                  type="button"
                  onClick={() => selectRole('citizen')}
                  className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-teal-400 hover:bg-teal-50/50 transition-all duration-200"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0 group-hover:from-teal-200 group-hover:to-teal-300 transition-colors">
                    <Users size={22} className="text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{t('citizen')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{t('citizenDesc')}</p>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-teal-500 transition-colors" />
                </motion.button>

                {/* Public Servant Card */}
                <motion.button
                  type="button"
                  onClick={() => selectRole('department_officer')}
                  className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
                    <Building2 size={22} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{t('publicServant')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{t('publicServantDesc')}</p>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Basic Info (+ Public Servant extras) ───── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Role badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-5 ${
                isPublicServant
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-teal-100 text-teal-700'
              }`}>
                {isPublicServant ? <Building2 size={13} /> : <Users size={13} />}
                {isPublicServant ? t('publicServant') : t('citizen')}
              </div>

              <div className="space-y-3.5">
                {renderInput({
                  name: 'name',
                  label: t('fullName'),
                  icon: User,
                  placeholder: 'e.g. Rafiq Ahmed',
                  autoComplete: 'name',
                })}
                {renderInput({
                  name: 'email',
                  label: t('emailAddress'),
                  type: 'email',
                  icon: Mail,
                  placeholder: 'you@example.com',
                  autoComplete: 'email',
                })}
                {renderInput({
                  name: 'phone',
                  label: t('phoneNumber'),
                  type: 'tel',
                  icon: Phone,
                  placeholder: '+880 1XXXXXXXXX',
                  autoComplete: 'tel',
                  optional: true,
                })}

                {/* ─── Public Servant Extra Fields ─────────────────── */}
                {isPublicServant && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3.5 pt-2 border-t border-gray-100"
                  >
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                      {t('officialDetails')}
                    </p>

                    {/* Department Dropdown */}
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('department')}
                      </label>
                      <div className="relative">
                        <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                          focusedField === 'department' ? 'text-teal-500' : 'text-gray-400'
                        }`}>
                          <Building2 size={18} />
                        </div>
                        <select
                          id="department"
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          onFocus={() => setFocusedField('department')}
                          onBlur={() => setFocusedField(null)}
                          className={`input-field pl-11 appearance-none cursor-pointer ${errors.department ? 'input-error' : ''}`}
                        >
                          <option value="">{t('selectDepartment')}</option>
                          {DEPARTMENTS.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                      <AnimatePresence>
                        {errors.department && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-red-500 text-xs mt-1.5">
                            {errors.department}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {renderInput({
                      name: 'employeeId',
                      label: t('employeeId'),
                      icon: CreditCard,
                      placeholder: 'e.g. GOV-2024-1234',
                    })}
                    {renderInput({
                      name: 'governmentEmail',
                      label: t('governmentEmail'),
                      type: 'email',
                      icon: BadgeCheck,
                      placeholder: 'you@govt.bd',
                    })}
                    {renderInput({
                      name: 'designation',
                      label: t('designation'),
                      icon: Briefcase,
                      placeholder: 'e.g. Junior Engineer, Inspector',
                    })}
                  </motion.div>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    onClick={() => { setStep(1); setErrors({}); }}
                    className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <ArrowLeft size={16} />
                    <span>{t('back')}</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={goToStep3}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span>{t('continue')}</span>
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Password + Terms ───────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  {renderInput({
                    name: 'password',
                    label: t('password'),
                    icon: Lock,
                    placeholder: 'Create a strong password',
                    autoComplete: 'new-password',
                    isPassword: true,
                    showToggle: showPassword,
                    toggleFn: () => setShowPassword(!showPassword),
                  })}
                  <PasswordStrength password={formData.password} />
                </div>

                {renderInput({
                  name: 'confirmPassword',
                  label: t('confirmPassword'),
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
                      {t('agreeTerms')}{' '}
                      <button type="button" className="text-teal-600 hover:text-teal-700 font-medium underline">
                        {t('termsOfService')}
                      </button>{' '}
                      {t('and')}{' '}
                      <button type="button" className="text-teal-600 hover:text-teal-700 font-medium underline">
                        {t('privacyPolicy')}
                      </button>
                    </span>
                  </label>
                  <AnimatePresence>
                    {errors.agreeTerms && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-red-500 text-xs mt-1.5 ml-6">
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
                    <strong>{t('profileVerification')}</strong> — {t('verificationNotice')}
                  </p>
                </motion.div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <ArrowLeft size={16} />
                    <span>{t('back')}</span>
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
                        <span>{t('creatingAccount')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('createAccount')}</span>
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
          {t('alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
            {t('signInLink')}
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-white/30 mt-6">{t('copyright')}</p>
    </AuthLayout>
  );
};

export default SignupPage;
