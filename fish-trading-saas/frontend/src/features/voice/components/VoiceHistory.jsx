import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVoiceStore } from '@/store/voiceStore';
import { Clock, RefreshCw, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';

export default function VoiceHistory() {
  const { history, fetchHistory, processTranscript } = useVoiceStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getIcon = (formType) => {
    switch (formType) {
      case 'purchase': return <ShoppingBag className="w-4 h-4" />;
      case 'sale': return <TrendingUp className="w-4 h-4" />;
      case 'payment': return <DollarSign className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleRetry = (transcript) => {
    processTranscript(transcript);
  };

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-textSecondary space-y-4">
        <Clock className="w-12 h-12 opacity-20" />
        <p className="text-sm font-semibold">No recent voice commands</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <h3 className="text-sm font-extrabold text-textPrimary uppercase tracking-wider mb-4 px-2">
        Recent Activity
      </h3>
      
      <div className="space-y-3">
        {history.map((cmd) => (
          <div key={cmd.id} className="bg-surface border border-border p-4 rounded-2xl flex items-center justify-between gap-4">
            
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                cmd.status === 'confirmed' ? 'bg-success/10 text-success' : 
                cmd.status === 'failed' ? 'bg-danger/10 text-danger' : 
                'bg-warning/10 text-warning'
              }`}>
                {getIcon(cmd.form_type)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-textPrimary capitalize truncate">
                  {cmd.form_type || 'Unknown Action'}
                </p>
                <p className="text-xs text-textSecondary italic truncate" title={cmd.transcript_cleaned}>
                  "{cmd.transcript_cleaned}"
                </p>
                <span className={`text-[10px] uppercase font-bold tracking-wider mt-1 block ${
                  cmd.status === 'confirmed' ? 'text-success' : 
                  cmd.status === 'failed' ? 'text-danger' : 
                  'text-warning'
                }`}>
                  {cmd.status}
                </span>
              </div>
            </div>

            {cmd.status !== 'confirmed' && (
              <button
                onClick={() => handleRetry(cmd.transcript_cleaned)}
                className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-colors shrink-0"
                title="Retry Command"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

          </div>
        ))}
      </div>
    </motion.div>
  );
}
