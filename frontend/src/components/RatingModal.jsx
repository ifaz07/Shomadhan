import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star } from "lucide-react";
import toast from "react-hot-toast";
import { complaintAPI } from "../services/api";
import T from "./T";

const RatingModal = ({ complaint, isOpen, onClose, onSuccess }) => {
  const [ratings, setRatings] = useState({
    resolutionQuality: 0,
    responseTime: 0,
    officerProfessionalism: 0,
  });
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStarClick = (field, value) => {
    setRatings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate
    if (
      !ratings.resolutionQuality ||
      !ratings.responseTime ||
      !ratings.officerProfessionalism
    ) {
      toast.error("Please rate all categories");
      return;
    }

    setLoading(true);
    try {
      await complaintAPI.submitFeedback(complaint._id, {
        resolutionQuality: ratings.resolutionQuality,
        responseTime: ratings.responseTime,
        officerProfessionalism: ratings.officerProfessionalism,
        comment,
        isAnonymous,
      });

      toast.success("Thank you for your feedback!");
      setRatings({
        resolutionQuality: 0,
        responseTime: 0,
        officerProfessionalism: 0,
      });
      setComment("");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ field, label }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          <T en={label} />
        </label>
        <span className="text-xs text-gray-500">{ratings[field] || 0}/5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleStarClick(field, star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={`${
                star <= ratings[field]
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    <T en="Rate Your Experience" />
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    <T en="Help us improve" /> - {complaint.ticketId}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Rating Form */}
              <div className="space-y-6">
                <StarRating
                  field="resolutionQuality"
                  label="Resolution Quality"
                />
                <StarRating field="responseTime" label="Response Time" />
                <StarRating
                  field="officerProfessionalism"
                  label="Officer Professionalism"
                />

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    <T en="Additional Comments" />{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your feedback..."
                    maxLength={500}
                    className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {comment.length}/500
                  </p>
                </div>

                {/* Anonymous Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">
                    <T en="Submit feedback anonymously" />
                  </span>
                </label>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <T en="Cancel" />
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <T en="Submitting..." />
                    ) : (
                      <T en="Submit Feedback" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RatingModal;
