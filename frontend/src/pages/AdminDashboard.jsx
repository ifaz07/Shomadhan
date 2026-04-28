import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Shield, ShieldCheck, Mail, Phone, 
  Trash2, CheckCircle, XCircle, Plus, Search,
  Loader2, UserCheck, Briefcase, UserPlus, 
  FileText, ExternalLink, Eye, Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

const resolveAvatar = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE.replace('/api/v1', '')}${url}`;
};

const AdminDashboard = () => {
  const { user: adminUser } = useAuth();
  const [activeTab, setActiveTab] = useState('citizens'); // 'citizens', 'servants', 'mayors'
  const [users, setUsers] = useState([]);
  const [pendingMayors, setPendingMayors] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchSearchTerm] = useState('');
  const [viewingDoc, setViewDoc] = useState(null);

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
      const currentRole = tabs.find(t => t.id === activeTab).role;
      const res = await axios.get(`${API_BASE}/admin/users?role=${currentRole}`, { withCredentials: true });
      if (res.data.success) {
        setUsers(res.data.data);
      }
      
      if (activeTab === 'mayors') {
        const pendingRes = await axios.get(`${API_BASE}/admin/pending-mayors`, { withCredentials: true });
        if (pendingRes.data.success) {
          setPendingMayors(pendingRes.data.data);
        }
      }

      if (activeTab === 'citizens') {
        const pendingVerRes = await axios.get(`${API_BASE}/admin/pending-verifications`, { withCredentials: true });
        if (pendingVerRes.data.success) {
          setPendingVerifications(pendingVerRes.data.data);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user? This action is permanent.')) return;
    try {
      const res = await axios.delete(`${API_BASE}/admin/users/${userId}`, { withCredentials: true });
      if (res.data.success) {
        toast.success('User removed successfully');
        setUsers(users.filter(u => u._id !== userId));
        setPendingMayors(pendingMayors.filter(u => u._id !== userId));
        setPendingVerifications(pendingVerifications.filter(u => u._id !== userId));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleApproveMayor = async (userId, status) => {
    try {
      const res = await axios.put(`${API_BASE}/admin/approve-mayor/${userId}`, { status }, { withCredentials: true });
      if (res.data.success) {
        toast.success(`Mayor request ${status}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Approval action failed');
    }
  };

  const handleApproveVerification = async (userId, status) => {
    try {
      const res = await axios.put(`${API_BASE}/admin/approve-verification/${userId}`, { status }, { withCredentials: true });
      if (res.data.success) {
        toast.success(`Verification ${status}`);
        fetchData();
        setViewDoc(null);
      }
    } catch (error) {
      toast.error('Verification action failed');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Manage platform members and verify identity documents.
            </p>
          </motion.div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-gray-900 text-white shadow-lg' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Content Area ── */}
        <div className="space-y-6">
          {/* Pending Verifications Section (Citizens Tab Only) */}
          {activeTab === 'citizens' && pendingVerifications.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-teal-600 flex items-center gap-2 px-1 uppercase tracking-wider">
                <UserCheck size={16} />
                Pending Verification Requests
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
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.verificationDoc?.docType}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewDoc(u)}
                      className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-2"
                    >
                      <Eye size={14} /> Review
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pending Mayors Section (Mayors Tab Only) */}
          {activeTab === 'mayors' && pendingMayors.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-amber-600 flex items-center gap-2 px-1 uppercase tracking-wider">
                <ShieldCheck size={16} />
                Pending Mayor Approvals
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
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveMayor(u._id, 'approved')} className="bg-white text-emerald-600 p-2 rounded-lg border border-emerald-100 hover:bg-emerald-50"><CheckCircle size={20}/></button>
                      <button onClick={() => handleApproveMayor(u._id, 'rejected')} className="bg-white text-red-600 p-2 rounded-lg border border-red-100 hover:bg-red-50"><XCircle size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* User List Table */}
          <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" placeholder={`Search ${activeTab}...`}
                  className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-teal-400 outline-none"
                  value={searchTerm} onChange={(e) => setSearchSearchTerm(e.target.value)}
                />
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-widest">
                {users.length} Platform Members
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-teal-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-gray-400 font-medium italic">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Member</th>
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
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {u.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">{u.phone || 'N/A'}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(u._id)} className="text-gray-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Verification Review Modal ── */}
        <AnimatePresence>
          {viewingDoc && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewDoc(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Review Identity Document</h2>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-0.5">{viewingDoc.name} · {viewingDoc.verificationDoc?.docType}</p>
                  </div>
                  <button onClick={() => setViewDoc(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XCircle className="text-gray-400" size={24}/></button>
                </div>
                
                <div className="flex-1 p-6 bg-gray-50 overflow-y-auto max-h-[60vh]">
                  <div className="bg-white p-2 rounded-2xl shadow-inner border border-gray-200">
                    <img src={resolveAvatar(viewingDoc.verificationDoc?.fileUrl)} alt="Document" className="w-full h-auto rounded-xl" />
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 font-medium">Document Number:</span>
                    <span className="font-black text-gray-900">{viewingDoc.verificationDoc?.documentNumber}</span>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleApproveVerification(viewingDoc._id, 'approved')}
                      className="flex-1 bg-teal-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-100"
                    >
                      <CheckCircle size={20} /> Approve Document
                    </button>
                    <button 
                      onClick={() => handleApproveVerification(viewingDoc._id, 'rejected')}
                      className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                    >
                      <XCircle size={20} /> Reject
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
