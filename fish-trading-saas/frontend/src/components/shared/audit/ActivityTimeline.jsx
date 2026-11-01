import React, { useState, useEffect } from "react";
import { api } from "@/services/core/apiClient";
import { Clock, Edit3, PlusCircle, Trash2, ShieldAlert, CheckCircle, MapPin, Monitor } from "lucide-react";
import clsx from "clsx";

export default function ActivityTimeline({ entityType, entityId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entityType && entityId) {
      fetchTimeline();
    }
  }, [entityType, entityId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/audit/timeline/?entity_type=${entityType}&entity_id=${entityId}`);
      setLogs(data?.results || data || []);
    } catch (err) {
      console.error("Failed to load timeline", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE': return <PlusCircle className="text-green-500 w-4 h-4" />;
      case 'UPDATE': return <Edit3 className="text-blue-500 w-4 h-4" />;
      case 'DELETE': return <Trash2 className="text-red-500 w-4 h-4" />;
      case 'APPROVE': return <CheckCircle className="text-primary w-4 h-4" />;
      case 'IMPERSONATION_START': return <ShieldAlert className="text-purple-500 w-4 h-4" />;
      default: return <Clock className="text-textSecondary w-4 h-4" />;
    }
  };

  const formatDelta = (log) => {
    if (log.action === 'CREATE') {
      return <span className="text-xs text-textSecondary">Record created.</span>;
    }
    
    if (log.action === 'UPDATE' && log.changed_fields?.length > 0) {
      return (
        <div className="mt-2 text-xs bg-surface border border-border p-2 rounded-md font-mono space-y-1">
          {log.changed_fields.map((field) => (
            <div key={field} className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-textPrimary">{field}:</span>
              <span className="text-red-400 line-through truncate max-w-[120px]">
                {String(log.before_state?.[field] ?? 'None')}
              </span>
              <span className="text-textSecondary">→</span>
              <span className="text-green-500 font-bold truncate max-w-[120px]">
                {String(log.after_state?.[field] ?? 'None')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    
    if (log.reason) {
      return <span className="text-xs text-textSecondary italic">"{log.reason}"</span>;
    }

    return null;
  };

  if (loading) {
    return <div className="p-4 text-center text-textSecondary text-sm animate-pulse">Loading timeline...</div>;
  }

  if (logs.length === 0) {
    return <div className="p-4 text-center text-textSecondary text-sm">No activity recorded.</div>;
  }

  return (
    <div className="space-y-6 pl-2">
      {logs.map((log, idx) => (
        <div key={log.id} className="relative pl-6 pb-2">
          {/* Vertical Line */}
          {idx !== logs.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-border rounded-full" />
          )}
          
          {/* Timeline Dot/Icon */}
          <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-surface border-2 border-border flex items-center justify-center shadow-sm z-10">
            {getActionIcon(log.action)}
          </div>
          
          {/* Content */}
          <div className="bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl p-3 border border-border/50 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-textPrimary">
                <span>{log.action}</span>
                <span className="text-textSecondary font-normal px-2 py-0.5 bg-border/50 rounded-md text-[10px]">
                  by {log.username}
                </span>
                {log.impersonator_username && (
                  <span className="text-purple-500 font-bold px-2 py-0.5 bg-purple-500/10 rounded-md text-[10px] flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Impersonated by {log.impersonator_username}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-textSecondary font-medium whitespace-nowrap">
                {new Date(log.performed_at).toLocaleString()}
              </span>
            </div>
            
            {formatDelta(log)}

            {/* Forensic Metadata */}
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-textSecondary/70 font-medium">
              {(log.os || log.device || log.browser) && (
                <div className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  <span>{[log.os, log.browser, log.device].filter(Boolean).join(' • ')}</span>
                </div>
              )}
              {log.ip_address && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>IP: {log.ip_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
