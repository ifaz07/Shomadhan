import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getDefaultDashboardRoute } from "../utils/roleRoutes";
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
        `${import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1"}/auth/verify-oauth`,
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
      <div className="min-h-screen auth-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full" />
          </motion.div>
          <p className="text-white/70 font-medium">
            {isNew ? "Setting up your account..." : "Signing you in..."}
          </p>
        </div>
      </div>
    );
  }

  // ─── New user verification form ──────────────────────────────────
  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl shadow-black/20 w-full max-w-md p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="text-teal-600" size={24} />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            <T en="Verify Your Identity" />
          </h2>
          <p className="text-gray-500 text-sm">
            <T en="To ensure security, please verify your account with a valid document." />
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Document Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <T en="Document Type" />
            </label>
            <select
              name="docType"
              value={formData.docType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50 transition-all"
            >
              <option value="nid">
                <T en="National ID (NID)" />
              </option>
              <option value="passport">
                <T en="Passport" />
              </option>
              <option value="birth_certificate">
                <T en="Birth Certificate" />
              </option>
            </select>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <T en="Document Number" />
            </label>
            <input
              type="text"
              name="documentNumber"
              placeholder={
                formData.docType === "nid"
                  ? "1234567890"
                  : formData.docType === "passport"
                    ? "AB123456"
                    : "123456789012345678"
              }
              value={formData.documentNumber}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.documentNumber
                  ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                  : "border-gray-300 focus:border-teal-500 focus:ring-teal-50"
              }`}
            />
            {errors.documentNumber && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.documentNumber}
              </p>
            )}
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <T en="Phone Number (Optional)" />
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="+8801XXXXXXXXX"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.phone
                  ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                  : "border-gray-300 focus:border-teal-500 focus:ring-teal-50"
              }`}
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <T en="Upload Document" />
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                errors.file
                  ? "border-red-300 bg-red-50"
                  : formData.file
                    ? "border-teal-300 bg-teal-50"
                    : "border-gray-300 hover:border-teal-400 hover:bg-teal-50/30"
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
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle size={20} className="text-teal-600" />
                  <span className="text-sm text-teal-700 font-medium">
                    {formData.file.name}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    <T en="Click to upload" />
                  </p>
                  <p className="text-xs text-gray-500">
                    <T en="PNG, JPG, PDF up to 10MB" />
                  </p>
                </div>
              )}
            </div>
            {errors.file && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.file}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <T en="Submitting..." />
              </span>
            ) : (
              <T en="Submit for Review" />
            )}
          </button>

          {/* Security Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">
              🔒 <T en="Your information is secure" />
            </p>
            <p>
              <T en="We use industry-standard encryption to protect your personal data." />
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default OAuthCompletionPage;
