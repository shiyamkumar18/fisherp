import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useVoiceStore } from '@/store/voiceStore';

export default function VoicePermissionGuard({ error }) {
  const { resetState } = useVoiceStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-danger/20 animate-ping rounded-full" />
        <div className="relative bg-danger/10 p-6 rounded-full text-danger border border-danger/20 shadow-lg shadow-danger/10">
          <ShieldAlert className="w-12 h-12" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-extrabold text-textPrimary tracking-tight">Access Denied</h3>
        <p className="text-sm font-medium text-danger bg-danger/5 py-2 px-4 rounded-lg inline-block border border-danger/10">
          {error || "You don't have permission to perform this action."}
        </p>
        <p className="text-xs text-textSecondary max-w-[250px] mx-auto mt-4">
          Role-based restrictions prevent this command. Contact your administrator if you need access.
        </p>
      </div>

      <button
        onClick={resetState}
        className="mt-8 flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-xl text-textPrimary font-bold hover:bg-border/30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Go Back
      </button>
    </motion.div>
  );
}
