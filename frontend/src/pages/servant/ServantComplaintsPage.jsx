import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Loader2,
  CheckCircle2,
  ClipboardList,
  MapPin,
  ThumbsUp,
  ChevronDown,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { servantAPI } from '../../services/api';
import ServantLayout from '../../components/layout/ServantLayout';

const PRIORITY_STYLE = {
  Critical: { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500' },
  High:     { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  Low:      { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  dot: 'bg-green-500' },
};

const STATUS_STYLE = {
  pending:       { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Pending' },
  'in-progress': { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'In Progress' },
  resolved:      { bg: 'bg-green-100', text: 'text-green-700', label: 'Resolved' },
  rejected:      { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Rejected' },
};

// What status transitions are allowed per current status
const NEXT_STATUSES = {
  pending:       ['in-progress'],
  'in-progress': ['resolved', 'rejected'],
  resolved:      [],
  rejected:      [],
};

const STATUS_LABELS = {
  'in-progress': 'Mark In Progress',
  resolved:      'Mark Resolved',
  rejected:      'Mark Rejected',
};

// ─── Status Update Modal ───────────────────────────────────────────────
const StatusModal = ({ complaint, onClose, onUpdated }) => {
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const nextOptions = NEXT_STATUSES[complaint.status] || [];

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await servantAPI.updateStatus(complaint._id, selected, note);
      toast.success(`Status updated to "${selected}"`);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Update Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4 truncate">
          <span className="font-medium text-gray-800">{complaint.title}</span>{' '}
          <span className="text-gray-400 font-mono text-xs">({complaint.ticketId})</span>
        </p>

        {/* Status options */}
        <div className="space-y-2 mb-4">
          {nextOptions.map((s) => (
            <button
              key={s}
              onClick={() => setSelected(s)}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                selected === s
                  ? s === 'resolved'
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : s === 'rejected'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Optional note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Complaint Card ────────────────────────────────────────────────────
const ComplaintCard = ({ complaint, onUpdateClick }) => {
  const pStyle = PRIORITY_STYLE[complaint.priority] || PRIORITY_STYLE.Low;
  const sStyle = STATUS_STYLE[complaint.status] || STATUS_STYLE.pending;
  const canUpdate = NEXT_STATUSES[complaint.status]?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pStyle.bg} ${pStyle.text}`}>
            ● {complaint.priority}
          </span>
          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${sStyle.bg} ${sStyle.text}`}>
            {sStyle.label}
          </span>
          <span className="text-[11px] text-gray-400 font-medium border border-gray-200 px-2 py-0.5 rounded-lg">
            {complaint.category}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono shrink-0">{complaint.ticketId}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">{complaint.title}</h3>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
        {complaint.location && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {complaint.location.slice(0, 50)}{complaint.location.length > 50 ? '…' : ''}
          </span>
        )}
        <span className="flex items-center gap-1">
          <ThumbsUp size={11} /> {complaint.voteCount}
        </span>
        <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Action */}
      {canUpdate ? (
        <button
          onClick={() => onUpdateClick(complaint)}
          className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <ChevronDown size={14} />
          Update Status
        </button>
      ) : (
        <div className={`w-full py-2 rounded-xl text-xs font-semibold text-center ${sStyle.bg} ${sStyle.text}`}>
          {sStyle.label} — No further action needed
        </div>
      )}
    </motion.div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────
const ServantComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalComplaint, setModalComplaint] = useState(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await servantAPI.getComplaints({
        status: statusFilter,
        priority: priorityFilter,
        page,
        limit: 12,
      });
      setComplaints(res.data.data);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, page]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter]);

  return (
    <ServantLayout>
      <div className="space-y-5 max-w-6xl">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600" />
            Department Complaints
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} complaint{total !== 1 ? 's' : ''} in your department
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <Filter size={15} className="text-gray-400" />

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'pending', 'in-progress', 'resolved', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {s === 'all' ? 'All Status' : STATUS_STYLE[s]?.label || s}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'Critical', 'High', 'Medium', 'Low'].map((p) => {
              const pStyle = PRIORITY_STYLE[p];
              return (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                    priorityFilter === p
                      ? p === 'all'
                        ? 'bg-gray-800 text-white border-gray-800'
                        : `${pStyle?.bg} ${pStyle?.text} ${pStyle?.border}`
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {p === 'all' ? 'All Priority' : p}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Complaint grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-blue-500" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-gray-400">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
            <p className="font-medium text-gray-600">No complaints found</p>
            <p className="text-sm mt-1">Try changing the filters above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {complaints.map((c) => (
              <ComplaintCard
                key={c._id}
                complaint={c}
                onUpdateClick={setModalComplaint}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── Status Update Modal ── */}
      <AnimatePresence>
        {modalComplaint && (
          <StatusModal
            complaint={modalComplaint}
            onClose={() => setModalComplaint(null)}
            onUpdated={fetchComplaints}
          />
        )}
      </AnimatePresence>
    </ServantLayout>
  );
};

export default ServantComplaintsPage;
