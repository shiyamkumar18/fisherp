/**
 * Voice Assistant Main Component
 * Orchestrates the voice-to-form workflow
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import ConfirmationModal from './ConfirmationModal';
import VoiceSettings from './VoiceSettings';
import '../styles/voice.css';

export default function VoiceAssistant({ formType = 'purchase', onSave, onCancel }) {
  const [sessionId, setSessionId] = useState(null);
  const [language, setLanguage] = useState('tamil');
  const [currentCommand, setCurrentCommand] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, processing, confirming, saved
  const [message, setMessage] = useState('');

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/voice/sessions/active_session/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.id);
        setLanguage(data.language);
      }
    } catch (err) {
      console.error('Failed to initialize session:', err);
      showMessage('Failed to initialize voice session', 'error');
    }
  };

  const handleProcessed = async (result) => {
    setCurrentCommand(result);
    setStatus('confirming');

    if (result.requires_confirmation) {
      setShowConfirmation(true);

      if (result.missing_fields.length > 0) {
        const missing = result.missing_fields.join(', ');
        showMessage(`Missing: ${missing}`, 'warning');
      }

      if (result.low_confidence_fields.length > 0) {
        const lowConf = result.low_confidence_fields.join(', ');
        showMessage(`Low confidence: ${lowConf}`, 'warning');
      }
    } else {
      // Auto-confirm if high confidence
      handleConfirm(result.extracted_entities, true);
    }
  };

  const handleConfirm = async (entities, auto = false) => {
    try {
      setStatus('saving');

      const response = await fetch('/api/voice/commands/confirm/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command_id: currentCommand.command_id,
          confirmed: true,
          corrections: entities
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus('saved');
        setShowConfirmation(false);

        // Add to history
        setHistory([...history, data]);

        showMessage('Voice command saved successfully!', 'success');

        if (onSave) {
          onSave(data);
        }

        // Reset for next command
        setTimeout(() => {
          setCurrentCommand(null);
          setStatus('idle');
        }, 2000);
      } else {
        throw new Error('Failed to confirm command');
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      showMessage('Failed to save voice command', 'error');
      setStatus('confirming');
    }
  };

  const handleCancel = () => {
    setCurrentCommand(null);
    setShowConfirmation(false);
    setStatus('idle');
  };

  const handleClarify = async (clarificationText) => {
    try {
      setStatus('processing');

      const response = await fetch('/api/voice/commands/clarify/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command_id: currentCommand.command_id,
          clarification_text: clarificationText
        })
      });

      if (response.ok) {
        const data = await response.json();
        handleConfirm(data.entities, false);
      }
    } catch (err) {
      console.error('Clarification error:', err);
      showMessage('Failed to process clarification', 'error');
    }
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  return (
    <div className="voice-assistant">
      <div className="voice-header">
        <h2>🎤 Voice Entry</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn btn-sm btn-outline"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message message-${status === 'saved' ? 'success' : 'warning'}`}>
          {status === 'saved' && <CheckCircle size={20} />}
          {status !== 'saved' && <AlertCircle size={20} />}
          {message}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <VoiceSettings
          language={language}
          onLanguageChange={setLanguage}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Main Recorder */}
      {!showSettings && (
        <div className="voice-main">
          {status === 'idle' || status === 'processing' ? (
            <VoiceRecorder
              sessionId={sessionId}
              onProcess={handleProcessed}
              language={language}
            />
          ) : status === 'confirming' ? (
            currentCommand && (
              <ConfirmationModal
                command={currentCommand}
                onConfirm={handleConfirm}
                onClarify={handleClarify}
                onCancel={handleCancel}
              />
            )
          ) : status === 'saved' ? (
            <div className="saved-confirmation">
              <CheckCircle size={64} color="#28a745" />
              <p>Voice entry saved successfully!</p>
            </div>
          ) : null}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="voice-history">
          <h3>Recent Voice Entries ({history.length})</h3>
          <div className="history-list">
            {history.map((entry, idx) => (
              <div key={idx} className="history-item">
                <span className="history-idx">{idx + 1}.</span>
                <span className="history-text">
                  {entry.entities.fish_name} - {entry.entities.quantity_boxes} boxes
                </span>
                <span className="history-status">✓ Saved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close Button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="btn btn-secondary btn-block"
        >
          Close Voice Entry
        </button>
      )}
    </div>
  );
}
