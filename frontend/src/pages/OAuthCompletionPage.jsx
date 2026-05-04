import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getDefaultDashboardRoute } from "../utils/roleRoutes";
import { getApiBaseUrl } from "../utils/apiBase";
import T from "../components/T";

const OAuthCompletionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const handled = useRef(false);

  const token = searchParams.get("token");
  const isNew = searchParams.get("isNew") === "true";
  const error = searchParams.get("error");

  // Verification form state
  const [step, setStep] = useState(isNew ? "verify" : "completing");
  const [formData, setFormData] = useState({
    docType: "nid",
    documentNumber: "",
    phone: "",
    file: null,
  });
  const [isLoading, setIsLoading] = useState(step === "completing");
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // ─── Handle initial OAuth error or returning user ─────────────────
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (error || !token) {
      toast.error("Social login failed. Please try again.");
      navigate("/login", { replace: true });
      return;
    }

    // For returning users, directly log them in
    if (!isNew) {
      setStep("completing");
      loginWithToken(token)
        .then((user) => {
          toast.success("Welcome back!");
          navigate(getDefaultDashboardRoute(user?.role), { replace: true });
        })
        .catch(() => {
          toast.error("Failed to sign in. Please try again.");
          navigate("/login", { replace: true });
        });
    }
  }, []);

  // ─── Validate form ───────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!formData.documentNumber.trim()) {
      newErrors.documentNumber = "Document number is required";
    } else {
      const docNum = formData.documentNumber.trim();
      if (formData.docType === "nid" && docNum.length !== 10) {
        newErrors.documentNumber = "NID must be exactly 10 digits";
      } else if (
        formData.docType === "birth_certificate" &&
        docNum.length !== 17
      ) {
        newErrors.documentNumber =
          "Birth Certificate must be exactly 17 digits";
      } else if (formData.docType === "passport" && docNum.length !== 9) {
        newErrors.documentNumber = "Passport must be exactly 9 characters";
      }
    }

    if (formData.phone && !/^(\+880|0)?1[3-9]\d{8}$/.test(formData.phone)) {
      newErrors.phone = "Invalid Bangladesh phone number";
    }

    if (!formData.file) {
      newErrors.file = "Document image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Handle form submission ──────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("docType", formData.docType);
      formDataObj.append("documentNumber", formData.documentNumber);
      if (formData.phone) formDataObj.append("phone", formData.phone);
      formDataObj.append("file", formData.file);

      const response = await fetch(
        `${getApiBaseUrl()}/auth/verify-oauth`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataObj,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Verification failed");
      }

      toast.success("Verification submitted. It is now pending admin review.");
      setStep("completing");

      // Log in the user
      await loginWithToken(token);
      navigate("/verify", { replace: true });
    } catch (err) {
      toast.error(err.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Handle input changes ────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
      if (errors.file) setErrors((prev) => ({ ...prev, file: "" }));
    }
  };

  // ─── Loading state ───────────────────────────────────────────────
  if (step === "completing") {
    return (
      <div className="min-h-screen auth-page-wrapper flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-12 h-12 border-4 border-[#a1824a] border-t-transparent rounded-full" />
          </motion.div>
          <p className="text-white font-black tracking-widest uppercase text-xs opacity-50">
            {isNew ? "Setting up your account..." : "Signing you in..."}
          </p>
        </div>
      </div>
    );
  }

  // ─── New user verification form ──────────────────────────────────
  return (
    <div className="min-h-screen auth-page-wrapper flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 relative z-10 border border-white/10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="w-20 h-20 bg-[#0d3b4b]/5 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[#a1824a]/20 overflow-hidden"
          >
             <img src="/assets/auth-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </motion.div>
          <h2 className="text-2xl font-black text-[#0d3b4b] mb-2 tracking-tight">
            <T en="Verify Your Identity" />
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            <T en="Complete your profile with a valid document to begin." />
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Document Type */}
          <div>
            <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-2 tracking-wider">
              <T en="Document Type" />
            </label>
            <select
              name="docType"
              value={formData.docType}
              onChange={handleChange}
              className="theme-input text-sm !pl-4"
            >
              <option value="nid">National ID (NID)</option>
              <option value="passport">Passport</option>
              <option value="birth_certificate">Birth Certificate</option>
            </select>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-2 tracking-wider">
              <T en="Document Number" />
            </label>
            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 theme-icon"><AlertCircle size={18} /></div>
               <input
                type="text"
                name="documentNumber"
                placeholder={formData.docType === "nid" ? "1234567890" : "Enter number"}
                value={formData.documentNumber}
                onChange={handleChange}
                className={`theme-input ${errors.documentNumber ? "border-red-400" : ""}`}
              />
            </div>
            {errors.documentNumber && (
              <p className="text-red-500 text-[10px] font-bold mt-1.5 flex items-center gap-1">
                {errors.documentNumber}
              </p>
            )}
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-2 tracking-wider">
              <T en="Phone Number (Optional)" />
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="+8801XXXXXXXXX"
              value={formData.phone}
              onChange={handleChange}
              className={`theme-input ${errors.phone ? "border-red-400" : ""}`}
            />
            {errors.phone && (
              <p className="text-red-500 text-[10px] font-bold mt-1.5">{errors.phone}</p>
            )}
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-2 tracking-wider">
              <T en="Upload Document" />
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                errors.file
                  ? "border-red-300 bg-red-50"
                  : formData.file
                    ? "border-[#a1824a] bg-[#a1824a]/5"
                    : "border-slate-200 hover:border-[#a1824a]/50 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {formData.file ? (
                <div className="flex items-center gap-2 justify-center text-[#a1824a] font-bold">
                  <CheckCircle size={20} />
                  <span className="text-sm truncate max-w-[200px]">{formData.file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-500"><T en="Click to upload" /></p>
                </div>
              )}
            </div>
            {errors.file && (
              <p className="text-red-500 text-[10px] font-bold mt-1.5">{errors.file}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="gold-btn w-full mt-6"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <T en="Submit & Continue" />
            )}
          </button>
        </form>
      </motion.div>
      
      <p className="absolute bottom-8 text-white/30 text-[10px] font-black tracking-widest uppercase z-10">
        Government of Bangladesh • Verified Social Authentication
      </p>
    </div>
  );
};

export default OAuthCompletionPage;
