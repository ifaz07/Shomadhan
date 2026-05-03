import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import T from "./T";

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, loading }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999]"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden pointer-events-auto"
            >
              <div className="p-8">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>

                {/* Icon & Content */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                    <T en="Confirm Deletion" />
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed px-2">
                    <T en="Are you sure you want to delete this complaint? This action is permanent and cannot be undone." />
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-8">
                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <T en="Yes, Delete Complaint" />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    <T en="Cancel" />
                  </button>
                </div>
              </div>

              {/* Bottom Decoration */}
              <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmationModal;
