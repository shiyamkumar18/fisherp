/**
 * Confirmation Modal Component
 * Shows extracted data and allows corrections
 */

import React, { useState } from 'react';
import { AlertCircle, Edit2, Check, X } from 'lucide-react';
import '../styles/voice.css';

export default function ConfirmationModal({
  command,
  onConfirm,
  onClarify,
  onCancel
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedEntities, setEditedEntities] = useState(command.extracted_entities);
  const [clarificationText, setClarificationText] = useState('');

  const handleFieldChange = (field, value) => {
    setEditedEntities({
      ...editedEntities,
      [field]: value
    });
  };

  const handleConfirm = () => {
    onConfirm(editedEntities, false);
  };

  const handleClarify = () => {
    if (clarificationText.trim()) {
      onClarify(clarificationText);
      setClarificationText('');
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#28a745'; // green
    if (confidence >= 0.6) return '#ffc107'; // yellow
    return '#dc3545'; // red
  };

  return (
    <div className="confirmation-modal-overlay">
      <div className="confirmation-modal">
        <div className="modal-header">
          <h3>Verify Voice Entry</h3>
          <button onClick={onCancel} className="btn-close">×</button>
        </div>

        <div className="modal-body">
          {/* Transcript */}
          <div className="section">
            <h4>What I heard:</h4>
            <div className="transcript-box">
              "{command.transcript}"
            </div>
          </div>

          {/* Overall Confidence */}
          <div className="confidence-display">
            <span>Confidence: {(command.overall_confidence * 100).toFixed(0)}%</span>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width: `${command.overall_confidence * 100}%`,
                  backgroundColor: getConfidenceColor(command.overall_confidence)
                }}
              />
            </div>
          </div>

          {/* Extracted Data */}
          <div className="section">
            <div className="section-header">
              <h4>Extracted Data:</h4>
              <button
                onClick={() => setEditMode(!editMode)}
                className="btn btn-sm btn-outline"
              >
                <Edit2 size={16} />
                {editMode ? 'Done' : 'Edit'}
              </button>
            </div>

            <div className="entities-display">
              {Object.entries(editedEntities).map(([field, value]) => (
                <div key={field} className="entity-row">
                  <label>{field.replace(/_/g, ' ')}</label>

                  {editMode ? (
                    <input
                      type="text"
                      value={value || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="form-input"
                    />
                  ) : (
                    <div className="entity-value">
                      <span>{value}</span>
                      <span className="confidence-badge">
                        {(command.confidence_scores[field] * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Missing Fields Warning */}
          {command.missing_fields && command.missing_fields.length > 0 && (
            <div className="alert alert-warning">
              <AlertCircle size={16} />
              <span>Missing: {command.missing_fields.join(', ')}</span>
            </div>
          )}

          {/* Low Confidence Fields Warning */}
          {command.low_confidence_fields && command.low_confidence_fields.length > 0 && (
            <div className="alert alert-warning">
              <AlertCircle size={16} />
              <span>Low confidence: {command.low_confidence_fields.join(', ')}</span>
            </div>
          )}

          {/* Clarification Option */}
          <div className="section">
            <label>Or tell me what's wrong:</label>
            <textarea
              placeholder="e.g., 'Rate is 420 not 420', 'Buyer is Ravi not Ram'"
              value={clarificationText}
              onChange={(e) => setClarificationText(e.target.value)}
              className="form-input"
              rows={3}
            />
            <button
              onClick={handleClarify}
              className="btn btn-secondary btn-block"
              disabled={!clarificationText.trim()}
            >
              Clarify
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
          >
            <X size={16} /> Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-success"
          >
            <Check size={16} /> Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
}
