/**
 * Waveform Display Component
 * Visualizes audio waveform in real-time
 */

import React, { useEffect, useRef } from 'react';

export default function WaveformDisplay({ data, isLive = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.strokeStyle = isLive ? '#dc3545' : '#007bff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.length > 0) {
      const centerY = height / 2;
      const barWidth = width / data.length;

      ctx.beginPath();

      data.forEach((value, index) => {
        const x = index * barWidth;
        const barHeight = value * (height / 2);
        const y = centerY - barHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw mirror effect
      ctx.strokeStyle = isLive ? 'rgba(220, 53, 69, 0.3)' : 'rgba(0, 123, 255, 0.3)';
      ctx.beginPath();

      data.forEach((value, index) => {
        const x = index * barWidth;
        const barHeight = value * (height / 2);
        const y = centerY + barHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw center line
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [data, isLive]);

  return (
    <div className="waveform-display">
      <canvas
        ref={canvasRef}
        width={300}
        height={100}
        className="waveform-canvas"
      />
    </div>
  );
}
