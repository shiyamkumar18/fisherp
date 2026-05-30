import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, X, MessageSquare } from 'lucide-react';
import { useTranslation } from '../../utils/i18n.jsx';
import axios from 'axios';

export default function VoiceAssistant({ onFieldsParsed }) {
  const { lang, voiceLangCode, t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [assistantText, setAssistantText] = useState('How can I help you today?');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setAssistantText('Listening...');
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
        setAssistantText('Sorry, I did not catch that. Please try again.');
        speakBack('Sorry, I did not catch that.');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setAssistantText(`You said: "${text}"`);
        await parseVoiceText(text);
      };

      recognitionRef.current = rec;
    }
  }, [lang]);

  const speakBack = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      // Try to find a matching voice language
      const locale = voiceLangCode();
      utterance.lang = locale;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setAssistantText('Speech recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = voiceLangCode();
      recognitionRef.current.start();
    }
  };

  const parseVoiceText = async (text) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/voice/parse/', {
        text: text,
        language: voiceLangCode()
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data && response.data.success) {
        const { entities, next_prompt } = response.data;
        if (next_prompt) {
          setAssistantText(next_prompt);
          speakBack(next_prompt);
        }
        if (entities) {
          if (onFieldsParsed) {
            onFieldsParsed(entities);
          }
          const event = new CustomEvent("voiceFieldsParsed", { detail: entities });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error parsing voice text', error);
      setAssistantText('Error communicating with voice server.');
    }
  };

  return (
    <div className="voice-assistant-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
      {/* Floating Action Button */}
      <motion.button
        id="voice-assistant-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            const greetText = lang === 'ta' ? 'நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?' : 'How can I help you?';
            setAssistantText(greetText);
            speakBack(greetText);
          }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: isListening ? '#ef4444' : '#3b82f6',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        {isListening ? <Mic className="animate-pulse" size={28} /> : <MessageSquare size={28} />}
      </motion.button>

      {/* Floating Dialogue UI */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: 'absolute',
              bottom: '80px',
              right: '0',
              width: '320px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              border: '1px solid #475569',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={18} /> {t('voice_assistant')}
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              padding: '12px',
              minHeight: '80px',
              fontSize: '14px',
              color: '#cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              {assistantText}
            </div>

            {transcript && (
              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                "{transcript}"
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              <button
                onClick={toggleListening}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: isListening ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '8px 16px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                {isListening ? (
                  <>
                    <MicOff size={16} /> {t('cancel')}
                  </>
                ) : (
                  <>
                    <Mic size={16} /> {t('speak_now')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
