import { create } from 'zustand';
import { voiceService } from '@/services/voiceService';

export const useVoiceStore = create((set, get) => ({
  isOpen: false,
  isListening: false,
  transcript: '',
  processingState: 'idle', // idle, listening, processing, confirming, success, error
  commandData: null, // Holds the result from /voice/process/
  error: null,
  history: [],

  // Actions
  setIsOpen: (isOpen) => set({ isOpen }),
  setTranscript: (transcript) => set({ transcript }),
  
  startListening: () => {
    set({ isListening: true, processingState: 'listening', error: null });
  },
  
  stopListening: () => {
    set({ isListening: false });
  },
  
  resetState: () => {
    set({ 
      transcript: '', 
      processingState: 'idle', 
      commandData: null, 
      error: null,
      isListening: false 
    });
  },

  processTranscript: async (text) => {
    set({ processingState: 'processing', transcript: text, error: null });
    try {
      // Use standard browser locale or 'en'
      const lang = localStorage.getItem('appLang') || 'ta';
      const data = await voiceService.processVoiceText(text, lang);
      
      if (data.status === 'failed') {
        set({ processingState: 'error', error: data.error_message || 'Processing failed' });
        return;
      }
      
      set({ processingState: 'confirming', commandData: data });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error occurred';
      set({ processingState: 'error', error: errorMsg });
    }
  },

  confirmCommand: async (corrections = {}) => {
    const { commandData } = get();
    if (!commandData?.command_id) return;
    
    set({ processingState: 'processing' });
    try {
      await voiceService.confirmCommand(commandData.command_id, true, corrections);
      set({ processingState: 'success' });
      
      // Auto close after success
      setTimeout(() => {
        const { processingState } = get();
        if (processingState === 'success') {
           get().resetState();
           get().setIsOpen(false);
           // reload window to reflect new data or show success toast
           // A global event could trigger refresh
           window.dispatchEvent(new CustomEvent('voiceActionCompleted'));
        }
      }, 2000);
      
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to confirm';
      set({ processingState: 'error', error: errorMsg });
    }
  },
  
  cancelCommand: async () => {
    const { commandData } = get();
    if (commandData?.command_id) {
      try {
        await voiceService.confirmCommand(commandData.command_id, false);
      } catch (e) {
         // ignore
      }
    }
    get().resetState();
  },
  
  fetchHistory: async () => {
    try {
       const history = await voiceService.getCommandHistory();
       set({ history: Array.isArray(history) ? history : history.results || [] });
    } catch (err) {
       console.error("Failed to load history", err);
    }
  }
}));
