import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoiceStore } from '@/store/voiceStore';
import { safeArrayAccess } from '@/utils/security/safeAccess';

export default function VoiceTranscript() {
  const { 
    isListening, 
    startListening, 
    stopListening, 
    transcript, 
    setTranscript, 
    processTranscript, 
    processingState 
  } = useVoiceStore();
  
  const [editableText, setEditableText] = useState('');
  const recognitionRef = useRef(null);

  // Sync internal state when store updates
  useEffect(() => {
    setEditableText(transcript);
  }, [transcript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      
      rec.onstart = () => {};
      
      rec.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = safeArrayAccess(event.results, i);
          if (result) {
            const firstAlt = safeArrayAccess(result, 0);
            if (firstAlt) {
              const t = firstAlt.transcript;
              if (result.isFinal) finalTranscript += t + ' ';
              else interimTranscript += t;
            }
          }
        }
        
        const fullText = (transcript + ' ' + finalTranscript + interimTranscript).trim();
        setTranscript(fullText);
      };
      
      rec.onerror = (e) => {
        console.error("Speech Error:", e);
        stopListening();
      };
      
      rec.onend = () => {
        // If user manually stopped, it's fine. If browser cut it off, we might want to auto process
        if (isListening) {
           // auto restart?
        }
      };
      
      recognitionRef.current = rec;
    }
  }, []); // Intentionally leaving empty to init once

  useEffect(() => {
    if (isListening && recognitionRef.current) {
       try {
         recognitionRef.current.lang = localStorage.getItem('appLang') === 'ta' ? 'ta-IN' : 'en-US';
         recognitionRef.current.start();
       } catch (e) {
         console.warn("Already started");
       }
    } else if (!isListening && recognitionRef.current) {
       recognitionRef.current.stop();
    }
  }, [isListening]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript(''); // Clear on new session
      startListening();
    }
  };

  const handleProcess = () => {
    stopListening();
    if (editableText.trim()) {
      processTranscript(editableText);
    }
  };

  const isProcessing = processingState === 'processing';

  return (
    <div className="flex flex-col h-full items-center pt-8 space-y-10">
      
      {/* Waveform / Status text */}
      <div className="text-center space-y-4 w-full">
        <h3 className="text-lg font-bold text-textPrimary">
          {isListening ? "Listening..." : isProcessing ? "Understanding..." : "Ready"}
        </h3>
        <p className="text-sm text-textSecondary font-medium px-4">
          {isListening 
            ? "சொல்லுங்க... வாங்கியது, விற்றது அல்லது payment (Say your entry in Tamil/English)"
            : "Tap the mic to speak or type below."
          }
        </p>
        
        {/* Animated Sound Wave visualizer (CSS/Framer) */}
        <div className="h-16 flex items-center justify-center gap-1.5 my-8">
          {[1,2,3,4,5,6].map((i) => (
            <motion.div 
              key={i}
              animate={{ 
                height: isListening ? [10, 30 + Math.random()*30, 10] : 10,
                opacity: isListening ? 1 : 0.3
              }}
              transition={{
                repeat: Infinity,
                duration: 0.8 + Math.random() * 0.5,
                ease: "easeInOut"
              }}
              className={`w-2 rounded-full ${isListening ? 'bg-danger' : 'bg-primary'}`}
            />
          ))}
        </div>
      </div>

      {/* Mic Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        disabled={isProcessing}
        className={`h-24 w-24 rounded-full flex items-center justify-center shadow-xl shadow-black/20 ${
          isListening 
            ? 'bg-danger text-white ring-8 ring-danger/20' 
            : 'bg-primary text-white shadow-primary/30'
        } disabled:opacity-50 transition-all`}
      >
        {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-10 h-10" />}
      </motion.button>

      {/* Editable Transcript Card */}
      <div className="w-full mt-auto">
        <div className="bg-elevated border border-border rounded-2xl p-4 shadow-sm focus-within:ring-2 ring-primary/50 transition-all">
          <textarea
            value={editableText}
            onChange={(e) => {
              setEditableText(e.target.value);
              setTranscript(e.target.value);
            }}
            placeholder="Transcript will appear here..."
            className="w-full bg-transparent border-none focus:ring-0 text-textPrimary resize-none min-h-[100px] text-base"
            disabled={isListening || isProcessing}
          />
          <div className="flex justify-between items-center mt-2 border-t border-border pt-3">
             <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
               You can type corrections
             </span>
             <button
               onClick={handleProcess}
               disabled={!editableText.trim() || isListening || isProcessing}
               className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
               {isProcessing ? 'Processing' : 'Process'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
