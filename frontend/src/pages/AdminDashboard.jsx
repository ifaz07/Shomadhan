import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  ShieldCheck,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  UserCheck,
  Briefcase,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';
import { adminAPI } from '../services/api';
import { getAssetBaseUrl } from '../utils/apiBase';

const resolveFileUrl = (url) => {
  if (!url) return null;

  // Current Cloudinary uploads are absolute URLs. Earlier local uploads were
  // persisted as a Windows filesystem path (for example
  // `C:\\...\\uploads\\verification\\document.jpg`), so normalize those records
  // to the public upload route before displaying them.
  if (/^https?:\/\//i.test(url)) return url;

  const normalizedPath = url.replace(/\\/g, '/');
  const uploadPathIndex = normalizedPath.toLowerCase().indexOf('/uploads/');
  const publicPath = uploadPathIndex >= 0
    ? normalizedPath.slice(uploadPathIndex)
    : normalizedPath.startsWith('/')
      ? normalizedPath
      : `/${normalizedPath}`;

  return `${getAssetBaseUrl()}${publicPath}`;
};

const formatDepartment = (value) => {
  if (!value) return 'N/A';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const memberSummaryCards = [
  {
    key: 'citizens',
    label: 'Citizens',
    icon: Users,
    accent: 'from-teal-500 to-cyan-500',
    ring: 'ring-teal-100',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    valueColor: 'text-teal-700',
  },
  {
    key: 'servants',
    label: 'Public Servants',
    icon: Briefcase,
    accent: 'from-blue-500 to-indigo-500',
    ring: 'ring-blue-100',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-700',
  },
  {
    key: 'mayors',
    label: 'Mayors',
    icon: Shield,
    accent: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-100',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
  },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('citizens');
  const [users, setUsers] = useState([]);
  const [pendingMayors, setPendingMayors] = useState([]);
  const [pendingServants, setPendingServants] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberCounts, setMemberCounts] = useState({
    citizens: 0,
    servants: 0,
    mayors: 0,
  });
  const [searchTerm, setSearchSearchTerm] = useState('');
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewType, setReviewType] = useState(null);
  const [verificationActionLoading, setVerificationActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentPreviewFailed, setDocumentPreviewFailed] = useState(false);

  const tabs = [
    { id: 'citizens', label: 'Citizens', icon: Users, role: 'citizen' },
    { id: 'servants', label: 'Public Servants', icon: Briefcase, role: 'department_officer' },
    { id: 'mayors', label: 'Mayors', icon: Shield, role: 'mayor' },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentRole = tabs.find((t) => t.id === activeTab).role;
      const [resResult, citizensResult, servantsResult, mayorsResult] = await Promise.allSettled([
        adminAPI.getUsersByRole(currentRole),
        adminAPI.getUsersByRole('citizen'),
        adminAPI.getUsersByRole('department_officer'),
        adminAPI.getUsersByRole('mayor'),
      ]);

      if (resResult.status === 'fulfilled' && resResult.value.data.success) {
        setUsers(resResult.value.data.data);
      } else if (resResult.status === 'rejected') {
        const err = resResult.reason;
        console.error('Failed to fetch current tab users:', err);
        if (!err.response) {
          toast.error('Network Error: Cannot connect to backend API server at http://localhost:5000');
        } else {
          toast.error(err.response.data?.message || `Error ${err.response.status}: Failed to fetch user data`);
        }
      }

      setMemberCounts({
        citizens: citizensResult.status === 'fulfilled' ? citizensResult.value.data?.data?.length || 0 : 0,
        servants: servantsResult.status === 'fulfilled' ? servantsResult.value.data?.data?.length || 0 : 0,
        mayors: mayorsResult.status === 'fulfilled' ? mayorsResult.value.data?.data?.length || 0 : 0,
      });

      if (activeTab === 'mayors') {
        try {
          const pendingRes = await adminAPI.getPendingMayors();
          if (pendingRes.data.success) setPendingMayors(pendingRes.data.data);
        } catch (err) {
          console.error('Failed to fetch pending mayors:', err);
        }
      }

      if (activeTab === 'servants') {
        try {
          const pendingServantRes = await adminAPI.getPendingServants();
          if (pendingServantRes.data.success) setPendingServants(pendingServantRes.data.data);
        } catch (err) {
          console.error('Failed to fetch pending servants:', err);
        }
      }

      if (activeTab === 'citizens') {
        try {
          const pendingVerRes = await adminAPI.getPendingVerifications();
          if (pendingVerRes.data.success) setPendingVerifications(pendingVerRes.data.data);
        } catch (err) {
          console.error('Failed to fetch pending verifications:', err);
        }
      }
    } catch (error) {
      console.error('Admin fetchData unexpected error:', error);
      toast.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user? This action is permanent.')) return;

    try {
      const res = await adminAPI.deleteUser(userId);
      if (res.data.success) {
        toast.success('User removed successfully');
        setUsers(users.filter((u) => u._id !== userId));
        setPendingMayors(pendingMayors.filter((u) => u._id !== userId));
        setPendingServants(pendingServants.filter((u) => u._id !== userId));
        setPendingVerifications(pendingVerifications.filter((u) => u._id !== userId));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleApproveVerification = async (userId, status) => {
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return false;
    }

    try {
      setVerificationActionLoading(true);
      const res = await adminAPI.approveVerification(
        userId,
        status,
        status === 'rejected' ? rejectionReason.trim() : undefined
      );

      if (res.data.success) {
        toast.success(`Verification ${status}`);
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification action failed');
    } finally {
      setVerificationActionLoading(false);
    }

    return false;
  };

  const handleRoleApproval = async (type, userId, status) => {
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return false;
    }

    try {
      setVerificationActionLoading(true);
      const apiCall = type === 'servant' ? adminAPI.approveServant : adminAPI.approveMayor;

      const res = await apiCall(
        userId,
        status,
        rejectionReason.trim() || undefined
      );

      if (res.data.success) {
        toast.success(`${type === 'servant' ? 'Public servant' : 'Mayor'} request ${status}`);
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Approval action failed');
    } finally {
      setVerificationActionLoading(false);
    }

    return false;
  };

  const getVerificationBadgeClass = (u) => {
    const status = u.verificationDoc?.status || 'none';
    if (status === 'approved' || u.isVerified) return 'bg-emerald-100 text-emerald-700';
    if (status === 'pending') return 'bg-amber-100 text-amber-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-500';
  };

  const getVerificationLabel = (u) => {
    const status = u.verificationDoc?.status || 'none';
    if (status === 'approved' || u.isVerified) return 'Verified';
    if (status === 'pending') return 'Pending Review';
    if (status === 'rejected') return 'Rejected';
    return 'Not Submitted';
  };

  const openReviewModal = (item, type) => {
    setReviewItem(item);
    setReviewType(type);
    setRejectionReason('');
    setDocumentPreviewFailed(false);
  };

  const closeReviewModal = () => {
    setReviewItem(null);
    setReviewType(null);
    setRejectionReason('');
  };

  const handleReviewApproval = async (status) => {
    if (!reviewItem || !reviewType) return;

    const ok =
      reviewType === 'citizen'
        ? await handleApproveVerification(reviewItem._id, status)
        : await handleRoleApproval(reviewType, reviewItem._id, status);

    if (ok) {
      closeReviewModal();
      fetchData();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fileUrl = resolveFileUrl(reviewItem?.verificationDoc?.fileUrl);
  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf');
  const isCitizenReview = reviewType === 'citizen';

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 px-0 sm:px-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl font-bold text-gray-900"><T en="System Administration" /></h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              <T en="Manage platform members across the system." />
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              {memberSummaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className={`group relative overflow-hidden rounded-2xl bg-white border border-gray-100 px-4 py-4 shadow-sm ring-1 ${card.ring}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.iconBg}`}>
                          <Icon size={18} className={card.iconColor} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
                            <T en="Members" />
                          </p>
                          <p className="text-sm font-bold text-gray-900 truncate">
                            <T en={card.label} />
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black leading-none ${card.valueColor}`}>
                          {memberCounts[card.key]}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          <T en="Live Count" />
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <T en={tab.label} />
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {activeTab === 'citizens' && pendingVerifications.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-teal-600 flex items-center gap-2 px-1 uppercase tracking-wider">
                <UserCheck size={16} />
                <T en="Pending Verification Requests" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingVerifications.map((u) => (
                  <div key={u._id} className="bg-white border border-teal-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 font-bold text-lg">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{u.name}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {u.verificationDoc?.docType} • {u.verificationDoc?.submittedAt ? new Date(u.verificationDoc.submittedAt).toLocaleDateString() : 'Submitted'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openReviewModal(u, 'citizen')}
                      className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-2"
                    >
                      <Eye size={14} /> <T en="Review" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'mayors' && pendingMayors.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-amber-600 flex items-center gap-2 px-1 uppercase tracking-wider">
                <ShieldCheck size={16} />
                <T en="Pending Mayor Approvals" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingMayors.map((u) => (
                  <div key={u._id} className="bg-amber-50/30 border border-amber-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-bold text-lg">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{u.name}</h3>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{u.designation || 'Mayor Applicant'}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.employeeId} • {u.governmentEmail}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openReviewModal(u, 'mayor')}
                      className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition-all flex items-center gap-2"
                    >
                      <Eye size={14} /> <T en="Review" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'servants' && pendingServants.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-blue-600 flex items-center gap-2 px-1 uppercase tracking-wider">
                <Briefcase size={16} />
                <T en="Pending Public Servant Approvals" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingServants.map((u) => (
                  <div key={u._id} className="bg-blue-50/30 border border-blue-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{u.name}</h3>
                        <p className="text-xs text-gray-500 truncate max-w-[220px]">
                          {u.designation} • {formatDepartment(u.department)}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {u.employeeId} • {u.governmentEmail}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openReviewModal(u, 'servant')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Eye size={14} /> <T en="Review" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={`${<T en="Search" />} ${activeTab}...`}
                  className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-teal-400 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchSearchTerm(e.target.value)}
                />
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-widest">
                {users.length} <T en="Platform Members" />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-teal-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-gray-400 font-medium italic"><T en="No users found." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Member</th>
                      {activeTab === 'servants' && (
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Department</th>
                      )}
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 text-sm">
                              {u.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        {activeTab === 'servants' && (
                          <td className="px-6 py-4 text-xs font-semibold text-blue-600">
                            {formatDepartment(u.department)}
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getVerificationBadgeClass(u)}`}>
                            {getVerificationLabel(u)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">{u.phone || 'N/A'}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(u._id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {reviewItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeReviewModal}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white w-full max-w-xl max-h-[90vh] rounded-[2rem] overflow-y-auto shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {reviewType === 'citizen'
                        ? <T en="Review Identity Document" />
                        : reviewType === 'servant'
                          ? <T en="Review Public Servant Request" />
                          : <T en="Review Mayor Request" />}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-0.5">
                      {reviewItem.name} | {reviewType === 'citizen' ? reviewItem.verificationDoc?.docType : reviewItem.role}
                    </p>
                  </div>
                  <button onClick={closeReviewModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <XCircle className="text-gray-400" size={24} />
                  </button>
                </div>

                {isCitizenReview && (
                  <div className="flex-1 p-6 bg-gray-50 overflow-y-auto max-h-[60vh]">
                    <div className="bg-white p-2 rounded-2xl shadow-inner border border-gray-200">
                      {isPdf ? (
                        <div className="space-y-3">
                          <iframe src={fileUrl} title="Verification document" className="w-full h-[480px] rounded-xl" />
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700">
                            <ExternalLink size={16} />
                            Open document in new tab
                          </a>
                        </div>
                      ) : documentPreviewFailed || !fileUrl ? (
                        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 px-6 py-10 text-center">
                          <Eye size={28} className="text-slate-400" />
                          <p className="text-sm font-semibold text-slate-700">Document preview is unavailable</p>
                          <p className="text-xs text-slate-500">The uploaded file could not be loaded from its saved location.</p>
                          {fileUrl && (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700">
                              <ExternalLink size={16} />
                              Try opening document
                            </a>
                          )}
                        </div>
                      ) : (
                        <img
                          src={fileUrl}
                          alt="Document"
                          onError={() => setDocumentPreviewFailed(true)}
                          className="w-full h-auto rounded-xl"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="p-6 bg-white border-t border-gray-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-500 font-medium">{isCitizenReview ? 'Document Number' : 'Employee ID'}</span>
                      <span className="font-black text-gray-900">
                        {isCitizenReview ? reviewItem.verificationDoc?.documentNumber : reviewItem.employeeId || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-500 font-medium">Submitted</span>
                      <span className="font-black text-gray-900">
                        {reviewItem.verificationDoc?.submittedAt ? new Date(reviewItem.verificationDoc.submittedAt).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-500 font-medium">Email</span>
                      <span className="font-black text-gray-900">{reviewItem.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-500 font-medium">Phone</span>
                      <span className="font-black text-gray-900">{reviewItem.phone || 'N/A'}</span>
                    </div>

                    {!isCitizenReview && (
                      <>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                          <span className="text-gray-500 font-medium">Government Email</span>
                          <span className="font-black text-gray-900">{reviewItem.governmentEmail || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                          <span className="text-gray-500 font-medium">Designation</span>
                          <span className="font-black text-gray-900">{reviewItem.designation || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 sm:col-span-2">
                          <span className="text-gray-500 font-medium">Department</span>
                          <span className="font-black text-gray-900">{formatDepartment(reviewItem.department)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 sm:col-span-2">
                          <span className="text-gray-500 font-medium">NID Number</span>
                          <span className="font-black text-gray-900">{reviewItem.verificationDoc?.documentNumber || 'N/A'}</span>
                        </div>
                      </>
                    )}

                    {reviewItem.presentAddress?.address && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 sm:col-span-2">
                        <span className="text-gray-500 font-medium">Present Address</span>
                        <span className="font-black text-gray-900 text-right">{reviewItem.presentAddress.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Rejection reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this request is being rejected"
                      rows={3}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      disabled={verificationActionLoading}
                      onClick={() => handleReviewApproval('approved')}
                      className="flex-1 bg-teal-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-100 disabled:opacity-60"
                    >
                      {verificationActionLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                      {reviewType === 'citizen' ? 'Approve Document' : reviewType === 'servant' ? 'Approve Servant' : 'Approve Mayor'}
                    </button>
                    <button
                      disabled={verificationActionLoading}
                      onClick={() => handleReviewApproval('rejected')}
                      className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      {verificationActionLoading ? <Loader2 size={20} className="animate-spin" /> : <XCircle size={20} />}
                      {reviewType === 'citizen' ? 'Reject' : reviewType === 'servant' ? 'Reject Servant' : 'Reject Mayor'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
