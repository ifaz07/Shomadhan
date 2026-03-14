import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, MapPin, AlertTriangle, Clock } from 'lucide-react';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import T from './T';

const PRIORITY_STYLES = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High:     'bg-orange-100 text-orange-700 border-orange-200',
  Medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:      'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_STYLES = {
  pending:     'bg-amber-50 text-amber-600',
  'in-progress': 'bg-blue-50 text-blue-600',
  resolved:    'bg-green-50 text-green-600',
  rejected:    'bg-red-50 text-red-500',
};

const NearbyComplaints = ({ mapPosition }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [votedIds, setVotedIds] = useState(new Set());
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!mapPosition) {
      setComplaints([]);
      return;
    }

    // Debounce 800ms so we don't fire on every GPS drag
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [lat, lng] = mapPosition;
        const res = await complaintAPI.getNearby(lat, lng, 1.0);
        setComplaints(res.data.data || []);
      } catch {
        setComplaints([]);
      } finally {
        setIsLoading(false);
      }
    }, 800);

    return () => clearTimeout(debounceRef.current);
  }, [mapPosition]);

  const handleVote = async (complaint) => {
    if (!user) return;
    const id = complaint._id;
    const wasVoted = votedIds.has(id);

    // Optimistic update
    setVotedIds((prev) => {
      const next = new Set(prev);
      wasVoted ? next.delete(id) : next.add(id);
      return next;
    });
    setComplaints((prev) =>
      prev.map((c) =>
        c._id === id
          ? { ...c, voteCount: wasVoted ? c.voteCount - 1 : c.voteCount + 1 }
          : c
      )
    );

    try {
      await complaintAPI.vote(id);
    } catch {
      // Revert on error
      setVotedIds((prev) => {
        const next = new Set(prev);
        wasVoted ? next.add(id) : next.delete(id);
        return next;
      });
      setComplaints((prev) =>
        prev.map((c) =>
          c._id === id
            ? { ...c, voteCount: wasVoted ? c.voteCount + 1 : c.voteCount - 1 }
            : c
        )
      );
    }
  };

  if (!mapPosition) return null;
  if (isLoading) return (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <T en="Checking nearby complaints..." />
    </div>
  );
  if (complaints.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-amber-200 bg-amber-50 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            <T en={`${complaints.length} similar complaint${complaints.length > 1 ? 's' : ''} found nearby`} />
          </p>
        </div>
        <p className="text-xs text-amber-600 mb-3">
          <T en="Consider upvoting an existing issue instead of filing a duplicate." />
        </p>

        <div className="space-y-2">
          {complaints.map((c) => {
            const voted = votedIds.has(c._id);
            const canVote = user && c.status !== 'resolved' && c.status !== 'rejected';

            return (
              <div
                key={c._id}
                className="bg-white rounded-lg border border-amber-100 p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {c.category}
                    </span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[c.priority] || PRIORITY_STYLES.Low}`}>
                      {c.priority}
                    </span>
                    {c.distance != null && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <MapPin size={10} />
                        {c.distance < 1
                          ? `${Math.round(c.distance * 1000)}m`
                          : `${c.distance.toFixed(1)}km`}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>

                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLES[c.status] || ''}`}>
                      {c.status}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{c.ticketId}</span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <Clock size={10} />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Upvote button */}
                <button
                  type="button"
                  disabled={!canVote}
                  onClick={() => handleVote(c)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
                    voted
                      ? 'bg-teal-50 border-teal-300 text-teal-600'
                      : canVote
                        ? 'bg-white border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-500'
                        : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                  title={canVote ? (voted ? 'Remove upvote' : 'Upvote this complaint') : 'Cannot vote on closed complaint'}
                >
                  <ThumbsUp size={14} className={voted ? 'fill-teal-500' : ''} />
                  <span className="text-xs font-medium">{c.voteCount}</span>
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NearbyComplaints;
