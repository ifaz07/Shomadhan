import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ShieldAlert, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MayorPendingPage = () => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 border border-slate-100 text-center"
      >
        <div className="w-24 h-24 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
          <Clock size={48} className="text-amber-500" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full border-4 border-white"
          />
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
          Pending Authorization
        </h1>
        
        <p className="text-slate-500 font-medium leading-relaxed mb-8">
          Welcome, <span className="text-slate-900 font-bold">{user?.name}</span>. 
          Your request for the <span className="text-amber-600 font-bold">Mayor</span> role is currently being reviewed. 
          <span className="block mt-2 text-teal-600 font-bold">Once verified by the System Admin, you will gain full access to the Mayor Dashboard and city analytics.</span>
        </p>

        <div className="space-y-4 mb-10">
          <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
            <ShieldAlert size={20} className="text-amber-500 mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Access Restricted</p>
              <p className="text-xs text-slate-500 font-medium">Executive tools are locked until your credentials are verified.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
            <Mail size={20} className="text-blue-500 mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Automatic Activation</p>
              <p className="text-xs text-slate-500 font-medium">You'll be redirected to your dashboard automatically upon approval.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={logout}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            <LogOut size={18} />
            Sign Out & Return Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MayorPendingPage;
