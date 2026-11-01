import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Mic, ArrowLeft } from 'lucide-react';
import { useVoiceStore } from '@/store/voiceStore';
import VoiceTranscript from './VoiceTranscript';
import VoiceConfirmation from './VoiceConfirmation';
import VoicePermissionGuard from './VoicePermissionGuard';
import VoiceHistory from './VoiceHistory';

export default function VoiceAssistantDrawer() {
  const { 
    isOpen, 
    setIsOpen, 
    processingState, 
    commandData,
    error
  } = useVoiceStore();

  const [showHistory, setShowHistory] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setShowHistory(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end md:bg-black/50 bg-black/70 overflow-hidden backdrop-blur-sm" onClick={handleClose}>
        
        <motion.div
          initial={{ x: '100%', y: 0 }}
          animate={{ x: 0, y: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full md:w-[450px] bg-surface h-[85vh] md:h-full mt-[15vh] md:mt-0 rounded-t-3xl md:rounded-l-2xl md:rounded-tr-none shadow-2xl flex flex-col border-l border-t md:border-t-0 border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-elevated/50 backdrop-blur-md rounded-t-3xl md:rounded-tl-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                {showHistory ? <History className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-textPrimary tracking-tight">
                  {showHistory ? "Voice History" : "Voice ERP"}
                </h2>
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                  {showHistory ? "Recent Commands" : "Fast Entry System"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 rounded-xl text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors"
              >
                {showHistory ? <ArrowLeft className="h-5 w-5" /> : <History className="h-5 w-5" />}
              </button>
              <button onClick={handleClose} className="p-2 rounded-xl text-textSecondary hover:bg-border/30 hover:text-textPrimary transition-colors bg-border/10">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
            
            {showHistory ? (
              <VoiceHistory />
            ) : (
              <>
                {/* Error Guard */}
                {processingState === 'error' && (
                  <VoicePermissionGuard error={error} />
                )}

                {/* Success State */}
                {processingState === 'success' && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center space-y-4"
                  >
                    <div className="h-20 w-20 bg-success/20 text-success rounded-full flex items-center justify-center shadow-lg shadow-success/10">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-textPrimary">Success!</h3>
                      <p className="text-sm text-textSecondary mt-2">Your record has been saved to the ERP.</p>
                    </div>
                  </motion.div>
                )}

                {/* Transcript / Listening State */}
                {(processingState === 'idle' || processingState === 'listening' || processingState === 'processing') && (
                   <VoiceTranscript />
                )}

                {/* Confirmation State */}
                {processingState === 'confirming' && commandData && (
                   <VoiceConfirmation data={commandData} />
                )}
              </>
            )}

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
