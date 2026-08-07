import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Truck, Radio, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import T from '../components/T';
import { complaintAPI } from '../services/api';
import EmergencyBroadcastPage from './EmergencyBroadcastPage';
import ResourceAllocationPage from './ResourceAllocationPage';
import './ServantDashboard.css';

const ServantDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('complaints');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchComplaints();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await complaintAPI.get('/complaints/stats', { withCredentials: true });
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data } = await complaintAPI.get('/complaints?status=pending&status=in-progress', { withCredentials: true });
      if (data.success) {
        setComplaints(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 px-6 py-7 text-white shadow-lg"
        >
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Welcome, {user?.name?.split(' ')[0]}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-200/85">
              Manage complaints, send emergency broadcasts, and coordinate resources from your dashboard.
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm"
            >
              <p className="text-xs font-bold text-gray-400 uppercase">Pending Cases</p>
              <p className="text-2xl font-black text-blue-600 mt-2">{stats.pending || 0}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm"
            >
              <p className="text-xs font-bold text-gray-400 uppercase">In Progress</p>
              <p className="text-2xl font-black text-amber-600 mt-2">{stats.inProgress || 0}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm"
            >
              <p className="text-xs font-bold text-gray-400 uppercase">Resolved</p>
              <p className="text-2xl font-black text-emerald-600 mt-2">{stats.resolved || 0}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm"
            >
              <p className="text-xs font-bold text-gray-400 uppercase">Critical</p>
              <p className="text-2xl font-black text-red-600 mt-2">{stats.critical || 0}</p>
            </motion.div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 overflow-x-auto bg-white rounded-t-lg">
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'complaints'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            My Complaints
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'emergency'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Radio size={16} /> Emergency Broadcast
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'resources'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Truck size={16} /> Resource Allocation
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'complaints' ? (
          <div className="bg-white rounded-b-lg border border-t-0 border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">Assigned Complaints</h2>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" />
                <p className="text-gray-500">Loading complaints...</p>
              </div>
            ) : complaints.length > 0 ? (
              <div className="space-y-3">
                {complaints.slice(0, 5).map(complaint => (
                  <div
                    key={complaint._id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{complaint.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{complaint.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded font-semibold">
                            {complaint.category}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded font-semibold text-white ${
                              complaint.priority === 'Critical'
                                ? 'bg-red-500'
                                : complaint.priority === 'High'
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                            }`}
                          >
                            {complaint.priority}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          complaint.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : complaint.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {complaint.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No complaints assigned to you</p>
            )}
          </div>
        ) : activeTab === 'emergency' ? (
          <EmergencyBroadcastPage />
        ) : activeTab === 'resources' ? (
          <ResourceAllocationPage />
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default ServantDashboard;
