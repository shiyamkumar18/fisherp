/**
 * Voice Settings Component
 * User voice preferences and configuration
 */

import React, { useState, useEffect } from 'react';
import { Save, Volume2, Zap } from 'lucide-react';
import '../styles/voice.css';

export default function VoiceSettings({ language, onLanguageChange, onClose }) {
  const [settings, setSettings] = useState({
    primary_language: language,
    secondary_language: 'english',
    voice_gender: 'female',
    voice_speed: 1.0,
    mic_sensitivity: 1.0,
    noise_cancellation_enabled: true,
    auto_save_enabled: false,
    auto_save_confidence_threshold: 80,
    require_confirmation: true,
    confidence_threshold: 70,
    max_recording_duration: 120,
    auto_stop_silence_duration: 3,
    store_audio: true,
    auto_delete_audio_days: 30,
    large_ui: false,
    high_contrast: false,
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/voice/settings/retrieve_settings/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings({
      ...settings,
      [field]: value
    });
    setSaved(false);
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/voice/settings/update_settings/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSaved(true);
        onLanguageChange(settings.primary_language);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voice-settings-panel">
      <div className="settings-header">
        <h3>⚙️ Voice Settings</h3>
        <button onClick={onClose} className="btn-close">×</button>
      </div>

      {loading ? (
        <div className="loading">Loading settings...</div>
      ) : (
        <div className="settings-body">
          {/* Language Settings */}
          <div className="settings-section">
            <h4>Language</h4>
            
            <div className="setting-item">
              <label>Primary Language:</label>
              <select
                value={settings.primary_language}
                onChange={(e) => handleChange('primary_language', e.target.value)}
              >
                <option value="tamil">Tamil</option>
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="tanglish">Tanglish</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Secondary Language:</label>
              <select
                value={settings.secondary_language}
                onChange={(e) => handleChange('secondary_language', e.target.value)}
              >
                <option value="">None</option>
                <option value="english">English</option>
                <option value="tamil">Tamil</option>
                <option value="hindi">Hindi</option>
              </select>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="settings-section">
            <h4><Volume2 size={16} /> Voice</h4>
            
            <div className="setting-item">
              <label>Voice Gender:</label>
              <select
                value={settings.voice_gender}
                onChange={(e) => handleChange('voice_gender', e.target.value)}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Voice Speed: {settings.voice_speed.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.voice_speed}
                onChange={(e) => handleChange('voice_speed', parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Microphone Settings */}
          <div className="settings-section">
            <h4>Microphone</h4>
            
            <div className="setting-item">
              <label>Mic Sensitivity: {settings.mic_sensitivity.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.mic_sensitivity}
                onChange={(e) => handleChange('mic_sensitivity', parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.noise_cancellation_enabled}
                  onChange={(e) => handleChange('noise_cancellation_enabled', e.target.checked)}
                />
                <span>Enable Noise Cancellation</span>
              </label>
            </div>
          </div>

          {/* Auto-Save Settings */}
          <div className="settings-section">
            <h4><Zap size={16} /> Auto-Save</h4>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.auto_save_enabled}
                  onChange={(e) => handleChange('auto_save_enabled', e.target.checked)}
                />
                <span>Enable Auto-Save</span>
              </label>
            </div>

            {settings.auto_save_enabled && (
              <div className="setting-item">
                <label>Confidence Threshold: {settings.auto_save_confidence_threshold}%</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={settings.auto_save_confidence_threshold}
                  onChange={(e) => handleChange('auto_save_confidence_threshold', parseInt(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Confirmation Settings */}
          <div className="settings-section">
            <h4>Confirmation</h4>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.require_confirmation}
                  onChange={(e) => handleChange('require_confirmation', e.target.checked)}
                />
                <span>Require Confirmation Before Save</span>
              </label>
            </div>

            <div className="setting-item">
              <label>Ask Clarification If Below: {settings.confidence_threshold}%</label>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={settings.confidence_threshold}
                onChange={(e) => handleChange('confidence_threshold', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Recording Settings */}
          <div className="settings-section">
            <h4>Recording</h4>
            
            <div className="setting-item">
              <label>Max Recording Duration (seconds):</label>
              <input
                type="number"
                value={settings.max_recording_duration}
                onChange={(e) => handleChange('max_recording_duration', parseInt(e.target.value))}
                min="10"
                max="600"
              />
            </div>

            <div className="setting-item">
              <label>Auto-Stop After (seconds of silence):</label>
              <input
                type="number"
                value={settings.auto_stop_silence_duration}
                onChange={(e) => handleChange('auto_stop_silence_duration', parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="settings-section">
            <h4>Privacy</h4>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.store_audio}
                  onChange={(e) => handleChange('store_audio', e.target.checked)}
                />
                <span>Store Audio for Improvement</span>
              </label>
            </div>

            <div className="setting-item">
              <label>Auto-Delete Audio After (days):</label>
              <input
                type="number"
                value={settings.auto_delete_audio_days}
                onChange={(e) => handleChange('auto_delete_audio_days', parseInt(e.target.value))}
                min="1"
                max="365"
              />
            </div>
          </div>

          {/* Accessibility Settings */}
          <div className="settings-section">
            <h4>Accessibility</h4>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.large_ui}
                  onChange={(e) => handleChange('large_ui', e.target.checked)}
                />
                <span>Large UI</span>
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.high_contrast}
                  onChange={(e) => handleChange('high_contrast', e.target.checked)}
                />
                <span>High Contrast</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="settings-footer">
            {saved && <span className="saved-message">✓ Settings saved</span>}
            <button
              onClick={saveSettings}
              className="btn btn-success"
              disabled={loading}
            >
              <Save size={16} /> Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
