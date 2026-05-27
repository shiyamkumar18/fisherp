/**
 * Voice Recorder Component
 * Handles audio recording with visualization
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play } from 'lucide-react';
import WaveformDisplay from './WaveformDisplay';
import '../styles/voice.css';

export default function VoiceRecorder({ sessionId, onProcess, language = 'tamil' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState(null);
  const [waveform, setWaveform] = useState([]);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;

      // Setup audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Setup media recorder
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioData(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setWaveform([]);

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start waveform animation
      updateWaveform();
    } catch (err) {
      setError(err.message);
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const updateWaveform = () => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Sample data points
    const samples = [];
    const step = Math.floor(dataArray.length / 50);
    for (let i = 0; i < dataArray.length; i += step) {
      samples.push(dataArray[i] / 255);
    }

    setWaveform(samples);

    if (isRecording) {
      requestAnimationFrame(updateWaveform);
    }
  };

  const processAudio = async () => {
    if (!audioData) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio_file', audioData, 'recording.webm');
      formData.append('session_id', sessionId);
      formData.append('language', language);

      const response = await fetch('/api/voice/commands/process/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const result = await response.json();
      onProcess(result);
    } catch (err) {
      setError(err.message);
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetRecording = () => {
    setAudioData(null);
    setDuration(0);
    setWaveform([]);
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-container">
        {/* Waveform Display */}
        {(isRecording || waveform.length > 0) && (
          <div className="waveform-container">
            <WaveformDisplay data={waveform} isLive={isRecording} />
          </div>
        )}

        {/* Duration Display */}
        {(isRecording || duration > 0) && (
          <div className="duration-display">
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </div>
        )}

        {/* Status */}
        {isRecording && (
          <div className="recording-status">
            <span className="recording-indicator"></span>
            Listening...
          </div>
        )}

        {isProcessing && (
          <div className="processing-status">
            Processing...
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="recorder-controls">
          {!isRecording && !audioData && (
            <button
              onClick={startRecording}
              className="btn btn-primary btn-large"
              disabled={isProcessing}
            >
              <Mic size={32} />
              <span>Start Recording</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="btn btn-danger btn-large"
            >
              <Square size={32} />
              <span>Stop</span>
            </button>
          )}

          {audioData && !isRecording && (
            <div className="audio-controls">
              <button
                onClick={processAudio}
                className="btn btn-success btn-large"
                disabled={isProcessing}
              >
                <Play size={32} />
                <span>Process</span>
              </button>
              <button
                onClick={resetRecording}
                className="btn btn-secondary btn-large"
                disabled={isProcessing}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
