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
  ArrowLeft,
  Upload,
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
        toast.success('Verification submitted. It is now pending admin review.');
        await getMe(); // Refresh global user state
        setTimeout(() => navigate('/profile'), 1500);
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
      none: { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200', label: 'Not Verified', desc: 'Submit your identity document to get verified and start filing complaints.' },
      pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Verification Pending', desc: 'Your document is under review.' },
      approved: { icon: ShieldCheck, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200', label: 'Verified', desc: 'Your identity has been verified. You can now submit complaints.' },
      rejected: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Verification Rejected', desc: user?.verificationDoc?.rejectionReason || 'Your document was rejected.' },
    };
    const s = statusMap[verificationStatus];
    const Icon = s.icon;

    return (
      <div className={`${s.bg} border rounded-2xl p-6 flex items-start gap-4 mb-8 shadow-sm`}>
        <div className={`p-3 rounded-xl ${s.bg} border-2 border-white shadow-sm`}>
          <Icon size={24} className={s.color} />
        </div>
        <div>
          <p className={`font-bold text-lg ${s.color}`}>{s.label}</p>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed font-medium">{s.desc}</p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link to="/profile" className="text-[#0d3b4b] flex items-center gap-2 text-sm font-bold mb-2 hover:underline">
              <ArrowLeft size={16} /> Back to Profile
            </Link>
            <h1 className="text-3xl font-black text-[#0d3b4b]">Account Verification</h1>
            <p className="text-slate-500 mt-1 font-medium">Verify your identity to unlock all features</p>
          </div>
        </header>

        <VerificationStatusCard />

        {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100"
          >
            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              {/* Doc type */}
              <div>
                <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-3 tracking-wider">Select Document Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DOC_TYPES.map((doc) => (
                    <button
                      key={doc.value}
                      type="button"
                      onClick={() => setVerDocType(doc.value)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all text-sm font-bold ${
                        verDocType === doc.value
                          ? 'border-[#a1824a] bg-[#a1824a]/5 text-[#a1824a]'
                          : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-[#0d3b4b]/5 p-4 rounded-2xl border border-[#0d3b4b]/10 flex items-start gap-3">
                <Info size={20} className="text-[#0d3b4b] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#0d3b4b]/70 leading-relaxed font-bold">
                  {verDocType === 'nid' && "Please provide your 10-digit National ID number."}
                  {verDocType === 'birth_certificate' && "Please provide your 17-digit Birth Registration number."}
                  {verDocType === 'passport' && "Please provide your 9-character Passport number."}
                </p>
              </div>

              {/* Doc number */}
              <div>
                <label className="block text-xs font-bold text-[#0d3b4b] uppercase mb-2 tracking-wider">Document Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1824a]">
                    <FileText size={20} />
                  </div>
                  <input
                    type="text"
                    value={verDocNumber}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => setVerDocNumber(e.target.value)}
                    placeholder={verDocType === 'nid' ? 'e.g. 1234567890' : verDocType === 'passport' ? 'e.g. AB1234567' : 'e.g. 20001234567890123'}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-[#a1824a] focus:ring-4 focus:ring-[#a1824a]/10 transition-all outline-none font-bold text-[#0d3b4b]"
                  />
                </div>
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#0d3b4b] uppercase tracking-wider">Upload Document Copy</label>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[#a1824a]/50 hover:bg-[#a1824a]/5 transition-all cursor-pointer group relative overflow-hidden"
                >
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                  ) : verFile && verFile.type === 'application/pdf' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 opacity-20">
                      <FileText size={48} className="text-gray-400" />
                    </div>
                  ) : null}

                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                    <Upload className="text-slate-400 group-hover:text-[#a1824a]" />
                  </div>
                  <div className="text-center relative z-10">
                    <p className="text-sm font-bold text-[#0d3b4b]">
                      {verFile ? verFile.name : 'Click to upload your document'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">JPG, PNG or PDF up to 5MB</p>
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
                className="w-full py-4 rounded-2xl bg-[#0d3b4b] text-[#a1824a] font-black text-lg shadow-xl flex items-center justify-center gap-2 hover:bg-[#0d3b4b]/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                whileHover={{ scale: verLoading ? 1 : 1.01 }}
                whileTap={{ scale: verLoading ? 1 : 0.99 }}
              >
                {verLoading ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <ShieldCheck size={22} />
                )}
                <span>{verLoading ? 'Submitting...' : 'Submit for Review'}</span>
              </motion.button>
            </form>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VerificationPage;
