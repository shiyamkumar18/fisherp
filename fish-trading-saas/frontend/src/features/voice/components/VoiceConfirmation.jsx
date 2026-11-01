import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useVoiceStore } from '@/store/voiceStore';
import { Check, X, Edit2, Loader2, AlertTriangle } from 'lucide-react';

export default function VoiceConfirmation({ data }) {
  const { confirmCommand, cancelCommand, processingState } = useVoiceStore();
  const [isEditing, setIsEditing] = useState(false);
  const [corrections, setCorrections] = useState({});

  const entities = data.extracted_entities || {};
  const action = entities.action || data.form_type || 'Unknown';
  const prompt = data.confirmation_prompt || "Please confirm the details.";
  
  const isProcessing = processingState === 'processing';

  const handleFieldChange = (key, value) => {
    setCorrections(prev => ({ ...prev, [key]: value }));
  };

  const getFieldValue = (key) => {
    return corrections[key] !== undefined ? corrections[key] : entities[key];
  };

  const renderField = (label, key, type = 'text', symbol = '') => {
    const value = getFieldValue(key);
    if (!value && !isEditing) return null;
    
    return (
      <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
        <span className="text-sm font-semibold text-textSecondary">{label}</span>
        {isEditing ? (
           <div className="flex items-center gap-1">
             {symbol && <span className="text-textSecondary">{symbol}</span>}
             <input 
               type={type}
               className="bg-background border border-border rounded px-2 py-1 text-sm font-bold text-textPrimary text-right w-24 focus:ring-1 focus:ring-primary outline-none"
               value={value || ''}
               onChange={(e) => handleFieldChange(key, e.target.value)}
             />
           </div>
        ) : (
           <span className="text-sm font-extrabold text-textPrimary">
             {symbol}{value}
           </span>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full space-y-6"
    >
      {/* Bot Prompt */}
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
        <p className="text-sm font-bold text-primary leading-relaxed">
          {prompt}
        </p>
      </div>

      {/* Warning/Clarification */}
      {data.clarification_prompt && (
        <div className="bg-warning/10 border border-warning/30 p-3 rounded-xl flex items-start gap-2">
           <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
           <p className="text-xs font-bold text-warning">{data.clarification_prompt}</p>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-elevated border border-border rounded-2xl overflow-hidden shadow-lg shadow-black/5">
        <div className="bg-surface border-b border-border px-4 py-3 flex justify-between items-center">
           <span className="font-extrabold text-textPrimary uppercase tracking-wider text-xs">
             {action} Summary
           </span>
           <button 
             onClick={() => setIsEditing(!isEditing)}
             className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"
           >
             {isEditing ? <X className="w-3 h-3"/> : <Edit2 className="w-3 h-3"/>}
             {isEditing ? 'Cancel Edit' : 'Edit'}
           </button>
        </div>
        
        <div className="p-4 space-y-1">
          {action === 'purchase' || action === 'sale' ? (
             <>
               {renderField('Fish Name', 'fish_name')}
               {renderField(action === 'purchase' ? 'Supplier' : 'Buyer', action === 'purchase' ? 'supplier_name' : 'buyer_name')}
               {renderField('Quantity (Boxes)', 'quantity_boxes', 'number')}
               {renderField('Weight/Box (kg)', 'weight_kg', 'number')}
               {renderField('Rate per kg', 'price_per_kg', 'number', '₹')}
               
               <div className="mt-4 pt-4 border-t border-dashed border-border">
                 <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider mb-2 block">Expenses (Optional)</span>
                 {renderField('Labour', 'labour_cost', 'number', '₹')}
                 {renderField('Ice', 'ice_cost', 'number', '₹')}
                 {renderField('Transport', 'transport_cost', 'number', '₹')}
               </div>
             </>
          ) : action === 'payment' ? (
             <>
               {renderField('Person Name', 'person_name')}
               {renderField('Amount', 'amount', 'number', '₹')}
               {renderField('Payment Mode', 'payment_mode')}
             </>
          ) : (
             <div className="text-sm text-textSecondary italic">Unknown action fields mapped dynamically.</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto pt-4 flex gap-3">
        <button
          onClick={cancelCommand}
          disabled={isProcessing}
          className="flex-1 py-3.5 rounded-xl font-bold text-textPrimary bg-surface border border-border hover:bg-border/30 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => confirmCommand(Object.keys(corrections).length > 0 ? corrections : {})}
          disabled={isProcessing}
          className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          {isProcessing ? 'Saving...' : 'Confirm'}
        </button>
      </div>

    </motion.div>
  );
}
