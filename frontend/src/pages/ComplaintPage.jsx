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
  ThumbsUp,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';
import VoiceMessagePlayer from '../components/VoiceMessagePlayer';
import {
  DEPARTMENT_OPTIONS,
  getDepartmentLabel,
} from '../constants/departments';

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
  const { language } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    location: '',
    isAnonymous: false,
    emergencyFlag: false,
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
  const [nearbyComplaints, setNearbyComplaints] = useState([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [votingId, setVotingId] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // ── Hooks that must be declared before any early return ─────────────
  const setAddress = useCallback((address) => {
    setFormData(prev => ({ ...prev, location: address }));
  }, []);

  const fetchNearbyComplaints = useCallback(async (lat, lng, category) => {
    setIsLoadingNearby(true);
    try {
      const res = await complaintAPI.getNearby(lat, lng, 1, category || '');
      setNearbyComplaints(res.data.data || []);
    } catch {
      setNearbyComplaints([]);
    } finally {
      setIsLoadingNearby(false);
    }
  }, []);

  useEffect(() => {
    if (mapPosition) {
      fetchNearbyComplaints(mapPosition[0], mapPosition[1], formData.category);
    }
  }, [mapPosition, formData.category, fetchNearbyComplaints]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (showSubmitConfirm) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showSubmitConfirm]);

  if (!user?.isVerified) {
    const isPendingVerification = user?.verificationDoc?.status === 'pending';

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
            <h2 className="text-2xl font-bold text-gray-900 mb-4"><T en="Account Verification Required" /></h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              <T en={isPendingVerification
                ? 'Your verification request is still under admin review. You can submit complaints after it is approved.'
                : 'To submit complaints and help improve our community, you need to verify your account with a valid document (NID, Birth Certificate, or Passport).'} />
            </p>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 bg-teal-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20"
            >
              <T en={isPendingVerification ? 'Check Verification Status' : 'Verify My Account'} />
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingDuration(0);
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
    if (!formData.title.trim() || (!formData.description.trim() && !audioBlob)) {
      toast.error('Please enter title and description (or record audio) before analyzing');
      return;
    }
    setIsAnalyzing(true);
    setNlpSuggestion(null);
    try {
      const textToAnalyze = formData.description.trim() || "Voice message description";
      const response = await complaintAPI.analyze(formData.title, textToAnalyze);
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
      setNlpSuggestion(null);
        toast.success(`Department set to "${getDepartmentLabel(nlpSuggestion.category)}"`);
    }
  };

  // Vote on a nearby complaint
  const handleVote = async (id) => {
    setVotingId(id);
    try {
      const res = await complaintAPI.vote(id);
      setNearbyComplaints(prev =>
        prev.map(c => c._id === id
          ? { ...c, voteCount: res.data.voteCount, _userVoted: res.data.voted }
          : c
        )
      );
      toast.success(res.data.voted ? 'Upvoted!' : 'Vote removed');
    } catch {
      toast.error('Failed to vote');
    } finally {
      setVotingId(null);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const maxFiles = audioBlob ? 4 : 5;
    
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} additional files allowed when using voice message`);
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

  const performSubmit = async () => {
    if (!formData.category) return toast.error('Please select a department');

    setIsSubmitting(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('category', formData.category);
    
    const finalDescription = audioBlob 
      ? (formData.description ? `${formData.description} (Voice message attached)` : "Voice message attached")
      : formData.description;
    data.append('description', finalDescription);
    
    data.append('location', formData.location);
    data.append('isAnonymous', formData.isAnonymous);
    data.append('emergencyFlag', formData.emergencyFlag);

    if (mapPosition) {
      data.append('latitude', mapPosition[0]);
      data.append('longitude', mapPosition[1]);
    }

    files.forEach(file => {
      data.append('evidence', file);
    });

    if (audioBlob) {
      const audioFile = new File([audioBlob], `voice-description-${Date.now()}.webm`, { type: 'audio/webm' });
      data.append('evidence', audioFile);
    }

    try {
      const response = await complaintAPI.create(data);
      if (response.data.success) {
        setSpamWarning(null);
        setShowSubmitConfirm(false);
        toast.success('Complaint submitted successfully!');
        setFormData({ title: '', category: '', description: '', location: '', isAnonymous: false, emergencyFlag: false });
        setFiles([]);
        setPreviews([]);
        setAudioBlob(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Please enter a complaint title');
    if (!formData.description.trim() && !audioBlob) return toast.error('Please enter complaint details or record a voice message');
    if (!formData.category) return toast.error('Please select a department');
    if (!formData.location.trim()) return toast.error('Please provide a complaint location');
    setShowSubmitConfirm(true);
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

  const nearbyCount = nearbyComplaints.length;
  const hasPinnedLocation = Boolean(mapPosition);
  const topSuggestions =
    nlpSuggestion?.topCategories ||
    (nlpSuggestion
      ? [{ category: nlpSuggestion.category, confidence: nlpSuggestion.confidence, department: nlpSuggestion.department }]
      : []);

  return (
    <DashboardLayout>
      <div className="w-full max-w-[1440px] mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-7 sm:px-8 sm:py-8 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)]"
        >
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-end">
            <div className="xl:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-100">
                <Sparkles size={12} className="text-teal-300" />
                Civic Reporting Desk
              </div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-4 text-3xl sm:text-4xl font-black tracking-tight"
              >
                <T en="Submit Complaint" />
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 }}
                className="mt-3 max-w-2xl text-sm sm:text-base text-slate-200/85 leading-relaxed"
              >
                <T en="Provide clear issue details, set the incident location, and attach useful evidence so the right department can act faster." />
              </motion.p>
            </div>

            <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Step 1</p>
                <p className="mt-1 text-sm font-semibold text-white">Describe the issue clearly</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Step 2</p>
                <p className="mt-1 text-sm font-semibold text-white">Pin the exact location</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Step 3</p>
                <p className="mt-1 text-sm font-semibold text-white">Upload supporting evidence</p>
              </div>
            </div>
          </div>
        </motion.header>

        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start"
        >
          {/* ─── Basic Info ─────────────────────────────────────────── */}
          <div className="xl:col-span-12 bg-white rounded-[2rem] shadow-[0_22px_50px_-30px_rgba(15,23,42,0.28)] border border-white/80 ring-1 ring-slate-100 p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Incident Brief</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">Tell us what happened</h3>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                <Building2 size={14} className="text-teal-500" />
                Routed to the right department
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <T en="Complaint Title" />
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
                  <T en="Department" />
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
                  <option value="">Select a department</option>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                <T en="Detailed Description" />
              </label>
              
              <div className="relative group">
                {isRecording ? (
                  <div className="flex items-center gap-4 p-5 bg-red-50 border-2 border-red-100 rounded-2xl shadow-inner min-h-[128px]">
                    <div className="flex flex-col items-center justify-center gap-3 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xl font-black text-red-600 tabular-nums tracking-wider">
                          {formatDuration(recordingDuration)}
                        </span>
                      </div>
                      
                      {/* Animated Waveform */}
                      <div className="flex items-end gap-1 h-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-red-400 rounded-full"
                            animate={{ 
                              height: [10, 24, 12, 30, 8][i % 5],
                            }}
                            transition={{ 
                              duration: 0.5, 
                              repeat: Infinity, 
                              delay: i * 0.1,
                              ease: "easeInOut" 
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          mediaRecorderRef.current?.stop();
                          setIsRecording(false);
                          clearInterval(timerRef.current);
                          setAudioBlob(null);
                          setRecordingDuration(0);
                        }}
                        className="p-3 rounded-xl bg-white text-slate-400 hover:text-red-500 transition-all shadow-sm border border-red-100"
                        title="Cancel"
                      >
                        <X size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20"
                        title="Save"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    </div>
                  </div>
                ) : audioBlob ? (
                  <div className="p-4 bg-teal-50 border-2 border-teal-100 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                          <Mic size={16} className="text-teal-600" />
                        </div>
                        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Voice Description</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={deleteRecording}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <VoiceMessagePlayer 
                      src={URL.createObjectURL(audioBlob)} 
                      className="!max-w-full bg-white/80 backdrop-blur-sm border-teal-100/50 shadow-none"
                    />
                  </div>
                ) : (
                  <>
                    <textarea
                      required={!audioBlob}
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Explain the issue in detail or use the mic to record..."
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none resize-none shadow-sm placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={startRecording}
                      className="absolute bottom-3 right-3 p-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-teal-500 hover:text-white transition-all shadow-sm group"
                      title="Record Voice"
                    >
                      <Mic size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </>
                )}
              </div>

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
                {isAnalyzing ? <T en="Analyzing..." /> : <T en="Find Department" />}
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
                className="xl:col-span-12 bg-violet-50 border border-violet-200 rounded-[2rem] p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-violet-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-500" />
                    <T en="AI Classification Result" />
                  </h4>
                  <button
                    type="button"
                    onClick={() => setNlpSuggestion(null)}
                    className="text-violet-400 hover:text-violet-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <Tag size={13} />
                    <T en="TOP SUGGESTED DEPARTMENTS" />
                  </div>
                  {topSuggestions.map((item, idx) => (
                    <div key={`${item.category}-${idx}`} className="bg-white rounded-xl p-4 border border-violet-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-violet-400">#{idx + 1}</span>
                        <div>
                          <span className="text-base font-bold text-gray-900">{getDepartmentLabel(item.category)}</span>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Building2 size={11} />
                            {item.department.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-semibold text-violet-600">{Math.round(item.confidence * 100)}%</span>
                        <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {nlpSuggestion.keywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2"><T en="EXTRACTED KEYWORDS" /></p>
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
                  <T en="Apply Suggested Department" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Location Section ───────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="xl:col-span-12 bg-white rounded-[2rem] shadow-[0_22px_50px_-30px_rgba(15,23,42,0.28)] border border-white/80 ring-1 ring-slate-100 p-6 md:p-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="text-teal-500" size={20} />
                  <T en="Incident Location" />
                </h3>
                <p className="text-sm text-gray-500 mt-1"><T en="Search an area or pin it on the map" /></p>
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
                  {isLocating ? <T en="Locating..." /> : <T en="My Location" />}
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

              <div className="h-[360px] w-full rounded-2xl overflow-hidden border border-gray-100 relative z-0">
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
                  <T en="Click to pin exact location" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Evidence Upload ────────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="xl:col-span-12 bg-white rounded-[2rem] shadow-[0_22px_50px_-30px_rgba(15,23,42,0.24)] border border-white/80 ring-1 ring-slate-100 p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700"><T en="Supporting Evidence" /></h3>
              <span className="text-xs text-gray-400"><T en="Max 5 files (Images, Video, Audio)" /></span>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Review Tip</p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Add a photo, short video, or audio clip if it helps prove the issue faster.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-teal-500/50 hover:bg-teal-50/30 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="text-gray-400 group-hover:text-teal-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700"><T en="Click to upload or drag and drop" /></p>
                <p className="text-xs text-gray-400 mt-1"><T en="PNG, JPG, MP4, MP3 up to 10MB each" /></p>
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

          {/* ─── Nearby Match Check ───────────────────────────────── */}
          <AnimatePresence>
            {(hasPinnedLocation || isLoadingNearby || nearbyCount === 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="xl:col-span-12 bg-white border border-amber-100 rounded-[2rem] p-5 shadow-[0_18px_44px_-34px_rgba(217,119,6,0.35)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-500">Nearby Match Check</p>
                    <h4 className="mt-2 text-lg font-bold text-slate-900">
                      Similar complaints
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {hasPinnedLocation
                        ? 'We are checking this area for existing open complaints so you can avoid filing duplicates.'
                        : 'Set the incident location first. Similar complaints will appear here automatically if we find a nearby match.'}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700">
                    {isLoadingNearby ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
                    <span className="text-xs font-bold uppercase tracking-[0.18em]">Matches</span>
                    <span className="text-lg font-black">{nearbyCount}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {!hasPinnedLocation ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No location pinned yet. Once you place the location on the map, similar complaints will be checked here.
                    </div>
                  ) : isLoadingNearby ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-5 text-sm text-amber-700">
                      Checking nearby complaints around the selected location...
                    </div>
                  ) : nearbyCount === 0 ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-5">
                      <p className="text-sm font-semibold text-emerald-800">0 similar complaints found nearby</p>
                      <p className="mt-1 text-sm text-emerald-700">
                        This looks like a fresh report for the selected area and department.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {nearbyComplaints.slice(0, 4).map((c) => (
                        <div key={c._id} className="rounded-2xl border border-amber-100 bg-amber-50/35 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{
                                    background: c.priority === 'Critical' ? '#fee2e2' : c.priority === 'High' ? '#ffedd5' : c.priority === 'Medium' ? '#fef9c3' : '#dcfce7',
                                    color: c.priority === 'Critical' ? '#dc2626' : c.priority === 'High' ? '#ea580c' : c.priority === 'Medium' ? '#ca8a04' : '#16a34a',
                                  }}
                                >
                                  • {c.priority}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">{getDepartmentLabel(c.category)}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                              </div>
                              <p className="text-sm font-semibold text-slate-900 mt-2 truncate">{c.title}</p>
                              <p className="text-[11px] text-slate-400 font-mono mt-1">{c.ticketId}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleVote(c._id)}
                              disabled={votingId === c._id}
                              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all disabled:opacity-50 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                            >
                              {votingId === c._id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <ThumbsUp size={14} className={c._userVoted ? 'fill-amber-500' : ''} />
                              )}
                              <span className="text-[10px] font-bold">{c.voteCount}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Spam / Duplicate Warning ───────────────────────────── */}
          <AnimatePresence>
            {spamWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="xl:col-span-12 bg-red-50 border border-red-200 rounded-[2rem] p-5 shadow-[0_16px_32px_-28px_rgba(220,38,38,0.45)]"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-900"><T en="Duplicate Complaint Detected" /></p>
                    <p className="text-sm text-red-700 mt-1">
                      <T en="A similar complaint from the same area was already submitted within the last 24 hours. Please check the existing ticket before submitting again." />
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-gray-500 font-medium"><T en="Existing ticket" /></span>
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
          <motion.div variants={itemVariants} className="xl:col-span-12 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-[1.6rem] flex items-center justify-center gap-2 text-white font-bold text-lg shadow-[0_22px_45px_-20px_rgba(13,148,136,0.45)] transition-all ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <T en="Submitting..." />
                </>
              ) : (
                <>
                  <Send size={20} />
                  <T en="Submit Complaint" />
                </>
              )}
            </button>
          </motion.div>
        </motion.form>

        <AnimatePresence>
          {showSubmitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                  setShowSubmitConfirm(false);
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl border border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        <T en="Confirm Complaint Submission" />
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        <T en="Please review how this complaint will be submitted before sending it." />
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => !isSubmitting && setShowSubmitConfirm(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">
                      Summary
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400"><T en="Title" /></p>
                        <p className="text-sm font-semibold text-gray-900">{formData.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400"><T en="Department" /></p>
                        <p className="text-sm font-semibold text-gray-900">{getDepartmentLabel(formData.category)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400"><T en="Location" /></p>
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{formData.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isAnonymous: !prev.isAnonymous,
                        }))
                      }
                      className={`rounded-2xl border p-4 text-left transition-all min-w-0 ${
                        formData.isAnonymous
                          ? 'border-teal-200 bg-teal-50 shadow-sm'
                          : 'border-gray-200 bg-gray-50 hover:border-teal-200 hover:bg-teal-50/60'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Info size={16} className={formData.isAnonymous ? 'text-teal-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                              <p className="text-sm font-bold text-gray-900 leading-tight"><T en="Anonymous Submission" /></p>
                            </div>
                          </div>
                          <div className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${formData.isAnonymous ? 'bg-teal-500' : 'bg-gray-200'}`}>
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                formData.isAnonymous ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </div>
                        </div>
                        <p className={`text-xs leading-relaxed break-words ${formData.isAnonymous ? 'text-teal-700' : 'text-gray-500'}`}>
                          <T en={formData.isAnonymous ? 'Other citizens will not see your name. The responsible department can still see your real details.' : 'Your name can be shown to other users on the complaint detail page.'} />
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          emergencyFlag: !prev.emergencyFlag,
                        }))
                      }
                      className={`rounded-2xl border p-4 text-left transition-all min-w-0 ${
                        formData.emergencyFlag
                          ? 'border-red-200 bg-red-50 shadow-sm'
                          : 'border-gray-200 bg-gray-50 hover:border-red-200 hover:bg-red-50/60'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle size={16} className={formData.emergencyFlag ? 'text-red-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                              <p className="text-sm font-bold text-gray-900 leading-tight"><T en="Emergency Priority" /></p>
                            </div>
                          </div>
                          <div className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${formData.emergencyFlag ? 'bg-red-500' : 'bg-gray-200'}`}>
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                formData.emergencyFlag ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </div>
                        </div>
                        <p className={`text-xs leading-relaxed break-words ${formData.emergencyFlag ? 'text-red-700' : 'text-gray-500'}`}>
                          <T en={formData.emergencyFlag ? 'This complaint will be submitted as an emergency and marked Critical immediately.' : 'This complaint will be submitted as a normal report.'} />
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(false)}
                    disabled={isSubmitting}
                    className="sm:flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-white transition-all disabled:opacity-50"
                  >
                    <T en="Cancel" />
                  </button>
                  <button
                    type="button"
                    onClick={performSubmit}
                    disabled={isSubmitting}
                    className={`sm:flex-1 py-3 rounded-2xl text-white font-semibold transition-all shadow-lg ${
                      formData.emergencyFlag
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-red-500/20 hover:scale-[1.01]'
                        : 'bg-gradient-to-r from-teal-500 to-blue-600 shadow-teal-500/20 hover:scale-[1.01]'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <T en="Submitting..." />
                      </span>
                    ) : (
                      <T en={formData.emergencyFlag ? 'Submit as Emergency' : 'Confirm & Submit'} />
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ComplaintPage;
