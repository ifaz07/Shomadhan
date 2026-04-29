import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Calendar,
  MapPin,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { caseAPI } from '../services/api';

const PoliceCaseProgressPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);

  useEffect(() => {
    fetchCases();
  }, [statusFilter, severityFilter]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await caseAPI.getAll(statusFilter, severityFilter);
      setCases(response.data.data);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('Failed to fetch police cases');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCase = (caseData) => {
    setSelectedCase(caseData);
    setShowCaseDetails(true);
  };

  const statuses = [
    'registered',
    'under_investigation',
    'evidence_collecting',
    'suspect_identified',
    'arrest_warranted',
    'trial_ongoing',
    'closed_solved',
    'closed_unsolved',
  ];

  const severities = ['minor', 'moderate', 'serious', 'critical'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Police Case Progress</h1>
            <p className="text-gray-600">Track investigation status and case details</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severity</option>
            {severities.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>

          <button
            onClick={fetchCases}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>

        {/* Cases Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : cases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cases.map((caseData) => (
              <CaseCard
                key={caseData._id}
                caseData={caseData}
                onViewDetails={() => handleViewCase(caseData)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No police cases found</p>
          </div>
        )}

        {/* Case Details Modal */}
        {showCaseDetails && selectedCase && (
          <CaseDetailsModal case={selectedCase} onClose={() => setShowCaseDetails(false)} />
        )}
      </div>
    </DashboardLayout>
  );
};

// ─── Helper Components ──────────────────────────────────────────────

const CaseCard = ({ caseData, onViewDetails }) => {
  const getSeverityColor = (severity) => {
    const colors = {
      minor: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      serious: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    if (status.includes('closed')) return <CheckCircle2 size={20} className="text-green-600" />;
    if (status === 'arrest_warranted') return <AlertCircle size={20} className="text-red-600" />;
    return <Clock size={20} className="text-blue-600" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900">{caseData.caseNumber}</h3>
          <p className="text-xs text-gray-500">Case ID</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(caseData.severity)}`}>
          {caseData.severity}
        </span>
      </div>

      {/* Complaint Info */}
      {caseData.complaint && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-1">{caseData.complaint.title}</p>
          <p className="text-xs text-gray-600">{caseData.complaint.category}</p>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        {getStatusIcon(caseData.investigationStatus)}
        <span className="text-sm font-medium text-gray-700">{caseData.investigationStatus.replace(/_/g, ' ')}</span>
      </div>

      {/* Case Type */}
      <div className="mb-3">
        <p className="text-xs text-gray-600">Type</p>
        <p className="text-sm font-medium text-gray-900 capitalize">{caseData.caseType.replace(/_/g, ' ')}</p>
      </div>

      {/* Investigation Days */}
      {caseData.investigationDaysElapsed && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Days Elapsed</p>
          <p className="text-lg font-bold text-gray-900">{caseData.investigationDaysElapsed}</p>
        </div>
      )}

      {/* Action Button */}
      <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium mt-3">
        View Details
      </button>
    </motion.div>
  );
};

const CaseDetailsModal = ({ caseData, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Case #{caseData.caseNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Status" value={caseData.investigationStatus.replace(/_/g, ' ')} />
            <InfoItem label="Severity" value={caseData.severity} />
            <InfoItem label="Type" value={caseData.caseType} />
            <InfoItem label="SLA Compliant" value={caseData.slaCompliant ? 'Yes' : 'No'} />
          </div>

          {/* Complaint Details */}
          {caseData.complaint && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Complaint Details</h3>
              <p className="text-sm text-gray-700">{caseData.complaint.title}</p>
              <p className="text-xs text-gray-600 mt-1">{caseData.complaint.description}</p>
            </div>
          )}

          {/* Evidence */}
          {caseData.evidenceCollected.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Evidence ({caseData.evidenceCollected.length})</h3>
              <div className="space-y-2">
                {caseData.evidenceCollected.map((evidence, idx) => (
                  <div key={idx} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                    <p className="font-medium">{evidence.description}</p>
                    <p className="text-xs text-gray-600">Type: {evidence.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Witnesses */}
          {caseData.witnesses.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Witnesses ({caseData.witnesses.length})</h3>
              <div className="space-y-2">
                {caseData.witnesses.map((witness, idx) => (
                  <div key={idx} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                    <p className="font-medium">{witness.name}</p>
                    <p className="text-xs text-gray-600">{witness.contact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suspects */}
          {caseData.suspects.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Suspects ({caseData.suspects.length})</h3>
              <div className="space-y-2">
                {caseData.suspects.map((suspect, idx) => (
                  <div key={idx} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                    <p className="font-medium">{suspect.name}</p>
                    <p className="text-xs text-gray-600">Status: {suspect.status}</p>
                    {suspect.arrestWarrant && <p className="text-xs text-red-600 font-semibold">Arrest Warrant Issued</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updates */}
          {caseData.updates.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Updates ({caseData.updates.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {caseData.updates.map((update, idx) => (
                  <div key={idx} className="text-sm p-2 bg-gray-50 rounded border-l-2 border-blue-500">
                    <p className="text-xs text-gray-500 mb-1">{new Date(update.updatedAt).toLocaleString()}</p>
                    <p className="text-gray-700">{update.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-600 mb-1">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value}</p>
  </div>
);

export default PoliceCaseProgressPage;
