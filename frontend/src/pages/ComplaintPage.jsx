import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Mic,
  X,
  Upload,
  Send,
  Info,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Navigation,
  MousePointer2,
  Search,
  Loader2,
  ShieldCheck,
  Sparkles,
  Tag,
  Building2,
  Copy,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const categories = [
  'Road', 
  'Waste', 
  'Electricity', 
  'Water', 
  'Safety', 
  'Environment', 
  'Other'
];

// Helper to handle map clicks and marker placement
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
    if (position) {
      map.flyTo(position, 16); // Zoom in when pin is set
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} />
  );
};

// Function to get address from coordinates using Nominatim (OSM)
const reverseGeocode = async (lat, lng, setAddress) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    if (data && data.display_name) {
      setAddress(data.display_name);
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
};

const ComplaintPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    location: '',
    isAnonymous: false,
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapPosition, setMapPosition] = useState(null); // [lat, lng]
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nlpSuggestion, setNlpSuggestion] = useState(null);
  const [spamWarning, setSpamWarning] = useState(null); // { ticketId, similarity, method }
  const fileInputRef = useRef(null);

  const setAddress = useCallback((address) => {
    setFormData(prev => ({ ...prev, location: address }));
  }, []);

  if (!user?.isVerified) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-20 px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100"
          >
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40} className="text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Verification Required</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              To submit complaints and help improve our community, you need to verify your account with a valid document (NID, Birth Certificate, or Passport).
            </p>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 bg-teal-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20"
            >
              Verify My Account
            </Link>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Prevent "Enter" from submitting the form
  const preventEnterSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.name === 'location') {
        searchLocation();
      }
    }
  };

  const getCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapPosition([latitude, longitude]);
        reverseGeocode(latitude, longitude, setAddress);
        setIsLocating(false);
        toast.success('Location found!');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to retrieve your location');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const searchLocation = async () => {
    if (!formData.location.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPos = [parseFloat(lat), parseFloat(lon)];
        setMapPosition(newPos);
        setFormData(prev => ({ ...prev, location: display_name }));
        toast.success('Location found on map');
      } else {
        toast.error('Location not found. Try being more specific.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error searching for location');
    } finally {
      setIsSearching(false);
    }
  };

  const analyzeWithNLP = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please enter both title and description before analyzing');
      return;
    }
    setIsAnalyzing(true);
    setNlpSuggestion(null);
    try {
      const response = await complaintAPI.analyze(formData.title, formData.description);
      if (response.data.success) {
        setNlpSuggestion(response.data.data);
        toast.success('AI analysis complete!');
      }
    } catch (error) {
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = () => {
    if (nlpSuggestion?.category) {
      setFormData(prev => ({ ...prev, category: nlpSuggestion.category }));
      toast.success(`Category set to "${nlpSuggestion.category}"`);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    // Create previews
    const newPreviews = selectedFiles.map(file => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file)
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);

    const updatedPreviews = [...previews];
    URL.revokeObjectURL(updatedPreviews[index].url);
    updatedPreviews.splice(index, 1);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) return toast.error('Please select a category');
    
    setIsSubmitting(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('category', formData.category);
    data.append('description', formData.description);
    data.append('location', formData.location);
    data.append('isAnonymous', formData.isAnonymous);
    
    if (mapPosition) {
      data.append('latitude', mapPosition[0]);
      data.append('longitude', mapPosition[1]);
    }
    
    files.forEach(file => {
      data.append('evidence', file);
    });

    try {
      const response = await complaintAPI.create(data);
      if (response.data.success) {
        setSpamWarning(null);
        toast.success('Complaint submitted successfully!');
        setFormData({ title: '', category: '', description: '', location: '', isAnonymous: false });
        setFiles([]);
        setPreviews([]);
        setMapPosition(null);
      }
    } catch (error) {
      console.error('Submission error:', error);
      if (error.response?.status === 409 && error.response.data?.duplicate) {
        setSpamWarning(error.response.data.duplicate);
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit complaint');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <header className="mb-8">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-gray-900"
          >
            Submit Complaint
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 mt-2"
          >
            Provide details about the issue and upload supporting evidence to help us resolve it.
          </motion.p>
        </header>

        <motion.form 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* ─── Basic Info ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  Complaint Title
                </label>
                <input
                  required
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    preventEnterSubmit(e);
                  }}
                  placeholder="Short, descriptive title"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Category
                </label>
                <select
                  required
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    preventEnterSubmit(e);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none appearance-none bg-white"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Detailed Description
              </label>
              <textarea
                required
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Explain the issue in detail..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none resize-none"
              />
              <button
                type="button"
                onClick={analyzeWithNLP}
                disabled={isAnalyzing}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-sm font-semibold hover:bg-violet-100 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                {isAnalyzing ? 'Analyzing...' : 'AI Auto-Classify'}
              </button>
            </motion.div>
          </div>

          {/* ─── NLP Suggestion Panel ───────────────────────────────── */}
          <AnimatePresence>
            {nlpSuggestion && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-violet-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-500" />
                    AI Classification Result
                  </h4>
                  <button
                    type="button"
                    onClick={() => setNlpSuggestion(null)}
                    className="text-violet-400 hover:text-violet-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-violet-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                      <Tag size={13} />
                      SUGGESTED CATEGORY
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">{nlpSuggestion.category}</span>
                      <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all"
                          style={{ width: `${Math.round(nlpSuggestion.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-violet-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                      <Building2 size={13} />
                      RESPONSIBLE DEPARTMENT
                    </div>
                    <span className="text-lg font-bold text-gray-900">{nlpSuggestion.department.name}</span>
                  </div>
                </div>

                {nlpSuggestion.keywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">EXTRACTED KEYWORDS</p>
                    <div className="flex flex-wrap gap-2">
                      {nlpSuggestion.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-3 py-1 bg-white border border-violet-200 text-violet-700 rounded-full text-xs font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={applySuggestion}
                  className="w-full py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Apply Suggested Category
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Location Section ───────────────────────────────────── */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="text-teal-500" size={20} />
                  Incident Location
                </h3>
                <p className="text-sm text-gray-500 mt-1">Search an area or pin it on the map</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-100 transition-all disabled:opacity-50"
                >
                  {isLocating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Navigation size={16} />
                  )}
                  {isLocating ? 'Locating...' : 'My Location'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      preventEnterSubmit(e);
                    }}
                    placeholder="Search area (e.g. Dhanmondi, Dhaka)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                  />
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={searchLocation}
                  disabled={isSearching}
                  className="px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center min-w-[50px] disabled:bg-gray-400"
                >
                  {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                </button>
              </div>

              <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-gray-100 relative z-0">
                <MapContainer 
                  center={mapPosition || [23.8103, 90.4125]} // Default to Dhaka
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={mapPosition} setPosition={setMapPosition} setAddress={setAddress} />
                </MapContainer>
                
                <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2 text-[10px] font-medium text-gray-600">
                  <MousePointer2 size={12} className="text-teal-500" />
                  Click to pin exact location
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Evidence Upload ────────────────────────────────────── */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Supporting Evidence</h3>
              <span className="text-xs text-gray-400">Max 5 files (Images, Video, Audio)</span>
            </div>

            <div 
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-teal-500/50 hover:bg-teal-50/30 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="text-gray-400 group-hover:text-teal-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, MP4, MP3 up to 10MB each</p>
              </div>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*"
              />
            </div>

            {/* Previews */}
            <AnimatePresence>
              {previews.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6"
                >
                  {previews.map((preview, index) => (
                    <motion.div 
                      key={index}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50"
                    >
                      {preview.type.startsWith('image/') ? (
                        <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                      ) : preview.type.startsWith('video/') ? (
                        <div className="w-full h-full flex items-center justify-center text-blue-500">
                          <Video size={32} />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-teal-500">
                          <Mic size={32} />
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/40 text-[10px] text-white truncate px-2">
                        {preview.name}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ─── Anonymous Submission ───────────────────────────────── */}
          <motion.div 
            variants={itemVariants}
            className="bg-teal-50/50 rounded-2xl p-6 border border-teal-100"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Info size={20} className="text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-teal-900">Submit Anonymously</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isAnonymous"
                      checked={formData.isAnonymous}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>
                <p className="text-sm text-teal-700 mt-1">
                  Your identity will be hidden from the authorities and other users. However, we'll still be able to track the complaint status.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ─── Spam / Duplicate Warning ───────────────────────────── */}
          <AnimatePresence>
            {spamWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-5"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-900">Duplicate Complaint Detected</p>
                    <p className="text-sm text-red-700 mt-1">
                      A similar complaint from the same area was already submitted within the last 24 hours.
                      Please check the existing ticket before submitting again.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-gray-500 font-medium">Existing ticket</span>
                        <span className="text-sm font-bold text-gray-900 font-mono">{spamWarning.ticketId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(spamWarning.ticketId);
                            toast.success('Ticket ID copied');
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded-full">
                        {Math.round(spamWarning.similarity * 100)}% similar · {spamWarning.method}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpamWarning(null)}
                    className="text-red-400 hover:text-red-600 shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Submit Button ──────────────────────────────────────── */}
          <motion.div variants={itemVariants} className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-lg shadow-lg shadow-teal-500/20 transition-all ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-teal-500 to-blue-600 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Complaint
                </>
              )}
            </button>
          </motion.div>
        </motion.form>
      </div>
    </DashboardLayout>
  );
};

export default ComplaintPage;
