import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  FileText,
  Clock,
  Info,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { authAPI } from '../services/api';

const DOC_TYPES = [
  { value: 'nid', label: 'National ID Card (NID)' },
  { value: 'passport', label: 'Passport' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
];

const VerificationPage = () => {
  const { user, getMe } = useAuth();
  const navigate = useNavigate();
  const [verDocType, setVerDocType] = useState('nid');
  const [verDocNumber, setVerDocNumber] = useState('');
  const [verFile, setVerFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [verLoading, setVerLoading] = useState(false);
  const fileInputRef = useRef(null);

  const verificationStatus = user?.verificationDoc?.status || 'none';

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setVerFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null); // It's a PDF or something else
      }
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!verDocNumber.trim()) {
      toast.error('Please enter your document number');
      return;
    }

    if (!verFile) {
      toast.error('Please upload your document file');
      return;
    }

    // Digit validation
    if (verDocType === 'nid' && verDocNumber.length !== 10) {
      return toast.error('NID must be exactly 10 digits.');
    }
    if (verDocType === 'birth_certificate' && verDocNumber.length !== 17) {
      return toast.error('Birth Certificate number must be exactly 17 digits.');
    }
    if (verDocType === 'passport' && verDocNumber.length !== 9) {
      return toast.error('Passport number must be exactly 9 characters.');
    }

    setVerLoading(true);
    const formData = new FormData();
    formData.append('docType', verDocType);
    formData.append('documentNumber', verDocNumber);
    formData.append('file', verFile);

    try {
      const { data } = await authAPI.verify(formData);
      
      if (data.success) {
        toast.success("Account verified successfully!");
        await getMe(); // Refresh global user state
        setTimeout(() => navigate('/profile'), 2000);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerLoading(false);
    }
  };

  const VerificationStatusCard = () => {
    const statusMap = {
      none: { icon: Shield, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: 'Not Verified', desc: 'Submit your identity document to get verified and start filing complaints.' },
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Verification Pending', desc: 'Your document is under review.' },
      approved: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Verified', desc: 'Your identity has been verified. You can now submit complaints.' },
      rejected: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Verification Rejected', desc: user?.verificationDoc?.rejectionReason || 'Your document was rejected.' },
    };
    const s = statusMap[verificationStatus];
    const Icon = s.icon;

    return (
      <div className={`${s.bg} border rounded-2xl p-6 flex items-start gap-4 mb-8`}>
        <div className={`p-3 rounded-xl ${s.bg} border-2 border-white shadow-sm`}>
          <Icon size={24} className={s.color} />
        </div>
        <div>
          <p className={`font-bold text-lg ${s.color}`}>{s.label}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.desc}</p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link to="/profile" className="text-teal-600 flex items-center gap-2 text-sm font-medium mb-2 hover:underline">
              <ArrowLeft size={16} /> Back to Profile
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Account Verification</h1>
            <p className="text-gray-500 mt-1">Verify your identity to unlock all features</p>
          </div>
        </header>

        <VerificationStatusCard />

        {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
          >
            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              {/* Doc type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Select Document Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DOC_TYPES.map((doc) => (
                    <button
                      key={doc.value}
                      type="button"
                      onClick={() => setVerDocType(doc.value)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all text-sm font-semibold ${
                        verDocType === doc.value
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Info size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  {verDocType === 'nid' && "Please provide your 10-digit National ID number."}
                  {verDocType === 'birth_certificate' && "Please provide your 17-digit Birth Registration number."}
                  {verDocType === 'passport' && "Please provide your 9-character Passport number."}
                </p>
              </div>

              {/* Doc number */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Document Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FileText size={20} />
                  </div>
                  <input
                    type="text"
                    value={verDocNumber}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => setVerDocNumber(e.target.value)}
                    placeholder={verDocType === 'nid' ? 'e.g. 1234567890' : verDocType === 'passport' ? 'e.g. AB1234567' : 'e.g. 20001234567890123'}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none font-medium"
                  />
                </div>
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Upload Document Copy</label>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-teal-500/50 hover:bg-teal-50/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                  ) : verFile && verFile.type === 'application/pdf' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 opacity-20">
                      <FileText size={48} className="text-gray-400" />
                    </div>
                  ) : null}

                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                    <Upload className="text-gray-400 group-hover:text-teal-500" />
                  </div>
                  <div className="text-center relative z-10">
                    <p className="text-sm font-medium text-gray-700">
                      {verFile ? verFile.name : 'Click to upload your document'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={verLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                whileHover={{ scale: verLoading ? 1 : 1.01 }}
                whileTap={{ scale: verLoading ? 1 : 0.99 }}
              >
                {verLoading ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <ShieldCheck size={22} />
                )}
                <span>{verLoading ? 'Verifying...' : 'Complete Verification'}</span>
              </motion.button>
            </form>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VerificationPage;
