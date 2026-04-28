import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  MapPin,
  Navigation,
  Search,
  MousePointer2,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import AuthLayout from "../components/auth/AuthLayout";
import SocialButtons from "../components/auth/SocialButtons";
import PasswordStrength from "../components/auth/PasswordStrength";
import { useAuth } from "../context/AuthContext";
import T from "../components/T";

// Fix for default marker icons
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── Map Helpers ─────────────────────────────────────────────────────
const LocationMarker = ({ position, setPosition, setAddress }) => {
  const map = useMap();
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      reverseGeocode(lat, lng, setAddress);
    },
  });
  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [position, map]);
  return position === null ? null : <Marker position={position} />;
};

const reverseGeocode = async (lat, lng, setAddress) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    );
    const data = await response.json();
    if (data && data.display_name) setAddress(data.display_name);
  } catch (error) {
    console.error("Geocoding error:", error);
  }
};

const DEPARTMENTS = [
  { value: "public_works", label: <T en="Public Works" /> },
  { value: "water_authority", label: <T en="Water Authority" /> },
  { value: "electricity", label: <T en="Electricity Dept" /> },
  { value: "sanitation", label: <T en="Sanitation Dept" /> },
  { value: "public_safety", label: <T en="Public Safety Dept" /> },
  { value: "animal_control", label: <T en="Animal Control" /> },
  { value: "health", label: <T en="Health Dept" /> },
  { value: "transport", label: <T en="Transport Dept" /> },
  { value: "environment", label: <T en="Environment Dept" /> },
  { value: "police", label: <T en="Police Department" /> },
  { value: "other", label: <T en="Other" /> },
];

const SignupPage = () => {
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: "",
    name: "",
    email: "",
    phone: "",
    // Address
    presentAddress: { address: "", lat: null, lng: null },
    // Public servant extras
    department: "",
    employeeId: "",
    governmentEmail: "",
    designation: "",
    nidNumber: "",
    // Password step
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [mapPosition, setMapPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const isPublicServant = formData.role === "department_officer";
  const totalSteps = 4;

  const setAddressLabel = useCallback((addr) => {
    setFormData((prev) => ({
      ...prev,
      presentAddress: { ...prev.presentAddress, address: addr },
    }));
  }, []);

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Valid email required";

    if (
      formData.phone.trim() &&
      !/^(\+880|0)?1[3-9]\d{8}$/.test(formData.phone.trim())
    ) {
      newErrors.phone = "Invalid BD phone number";
    }

    if (isPublicServant) {
      if (!formData.department) newErrors.department = "Department is required";
      if (!formData.nidNumber.trim()) newErrors.nidNumber = "NID required";
      else if (formData.nidNumber.trim().length !== 10)
        newErrors.nidNumber = "NID must be 10 digits";
      if (!formData.employeeId.trim())
        newErrors.employeeId = "Employee ID is required";
      if (!formData.governmentEmail.trim())
        newErrors.governmentEmail = "Gov Email is required";
      else if (!/^\S+@\S+\.\S+$/.test(formData.governmentEmail))
        newErrors.governmentEmail = "Valid email required";
      if (!formData.designation.trim())
        newErrors.designation = "Designation is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    if (!formData.presentAddress.address || !mapPosition) {
      toast.error("Please pinpoint your address on the map");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    const newErrors = {};
    if (!formData.password) newErrors.password = "Password required";
    else if (formData.password.length < 8)
      newErrors.password = "Min 8 characters";
    else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formData.password)
    ) {
      newErrors.password = "Must include A-Z, a-z, 0-9, and !@#$%^&*";
    }
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.agreeTerms) newErrors.agreeTerms = "Accept terms to continue";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const selectRole = (role) => {
    setFormData((prev) => ({ ...prev, role }));
    setStep(2);
  };

  const goToStep3 = () => {
    if (validateStep2()) setStep(3);
  };
  const goToStep4 = () => {
    if (validateStep3()) setStep(4);
  };

  const getCurrentLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapPosition([pos.coords.latitude, pos.coords.longitude]);
        reverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude,
          setAddressLabel,
        );
        setIsLocating(false);
      },
      () => {
        toast.error("Location access denied");
        setIsLocating(false);
      },
    );
  };

  const searchLocation = async () => {
    if (!formData.presentAddress.address.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.presentAddress.address)}&limit=1`,
      );
      const data = await response.json();
      if (data?.[0]) {
        setMapPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setAddressLabel(data[0].display_name);
      } else {
        toast.error("Location not found");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep4()) return;

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        phone: formData.phone.trim() || undefined,
        presentAddress: {
          address: formData.presentAddress.address,
          lat: mapPosition[0],
          lng: mapPosition[1],
        },
      };
      await register(payload);
      toast.success("Account created successfully!");
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach((err) => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
        toast.error("Validation failed. Please check the form.");
      } else {
        toast.error(error.response?.data?.message || "Registration failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = ({
    name,
    label,
    type = "text",
    icon: Icon,
    placeholder,
    isPassword,
    showToggle,
    toggleFn,
  }) => (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {errors[name] && (
          <span className="text-[10px] font-bold text-rose-500 animate-pulse uppercase">
            {errors[name]}
          </span>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon size={18} />
        </div>
        <input
          name={name}
          type={isPassword ? (showToggle ? "text" : "password") : type}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className={`input-field pl-11 transition-all ${errors[name] ? "border-rose-400 focus:ring-rose-200" : "focus:ring-teal-200"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={toggleFn}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showToggle ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? "bg-teal-500" : "bg-gray-100"}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <SocialButtons />
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => selectRole("citizen")}
                  className="flex items-center gap-4 p-5 rounded-xl border-2 hover:border-teal-400 text-left transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <Users />
                  </div>
                  <div>
                    <h3 className="font-bold">Citizen</h3>
                    <p className="text-xs text-gray-500">
                      Report & track issues
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => selectRole("department_officer")}
                  className="flex items-center gap-4 p-5 rounded-xl border-2 hover:border-blue-400 text-left transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Building2 />
                  </div>
                  <div>
                    <h3 className="font-bold">Public Servant</h3>
                    <p className="text-xs text-gray-500">
                      Manage assigned tasks
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
            >
              {renderInput({
                name: "name",
                label: "Full Name",
                icon: User,
                placeholder: "Rafiq Ahmed",
              })}
              {renderInput({
                name: "email",
                label: "Email",
                icon: Mail,
                type: "email",
                placeholder: "rafiq@example.com",
              })}
              {renderInput({
                name: "phone",
                label: "Phone Number (Optional)",
                icon: Phone,
                placeholder: "01XXXXXXXXX",
              })}
              {isPublicServant && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Department
                      </label>
                      {errors.department && (
                        <span className="text-[10px] font-bold text-rose-500">
                          {errors.department}
                        </span>
                      )}
                    </div>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className={`input-field ${errors.department ? "border-rose-400" : ""}`}
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {renderInput({
                    name: "nidNumber",
                    label: "NID Number",
                    icon: Shield,
                    placeholder: "10-digit NID",
                  })}
                  {renderInput({
                    name: "employeeId",
                    label: "Employee ID",
                    icon: BadgeCheck,
                    placeholder: "ID-12345",
                  })}
                  {renderInput({
                    name: "governmentEmail",
                    label: "Gov Email",
                    icon: Mail,
                    type: "email",
                    placeholder: "officer@gov.bd",
                  })}
                  {renderInput({
                    name: "designation",
                    label: "Designation",
                    icon: Briefcase,
                    placeholder: "Senior Engineer",
                  })}
                </>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl border-2 text-gray-500 font-bold"
                >
                  <ArrowLeft />
                </button>
                <button
                  onClick={goToStep3}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="text-teal-500" size={18} /> Present Address
              </h3>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={formData.presentAddress.address}
                  onChange={(e) => setAddressLabel(e.target.value)}
                  placeholder="Search area..."
                  className="input-field text-sm"
                />
                <button
                  onClick={searchLocation}
                  className="p-3 bg-gray-900 text-white rounded-xl"
                >
                  {isSearching ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Search size={18} />
                  )}
                </button>
              </div>
              <div className="h-[240px] w-full rounded-xl overflow-hidden border relative z-0">
                <MapContainer
                  center={[23.8103, 90.4125]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationMarker
                    position={mapPosition}
                    setPosition={setMapPosition}
                    setAddress={setAddressLabel}
                  />
                </MapContainer>
              </div>
              <button
                onClick={getCurrentLocation}
                className="text-xs font-bold text-teal-600 flex items-center gap-1"
              >
                <Navigation size={14} /> Use My Location
              </button>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-3 rounded-xl border-2 text-gray-500 font-bold"
                >
                  <ArrowLeft />
                </button>
                <button
                  onClick={goToStep4}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {renderInput({
                name: "password",
                label: "Password",
                icon: Lock,
                isPassword: true,
                showToggle: showPassword,
                toggleFn: () => setShowPassword(!showPassword),
              })}
              {renderInput({
                name: "confirmPassword",
                label: "Confirm Password",
                icon: Lock,
                isPassword: true,
                showToggle: showConfirm,
                toggleFn: () => setShowConfirm(!showConfirm),
              })}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span className="text-xs text-gray-600">
                  I agree to the Terms and Privacy Policy
                </span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-3 rounded-xl border-2 text-gray-500 font-bold"
                >
                  <ArrowLeft />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-teal-500 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
