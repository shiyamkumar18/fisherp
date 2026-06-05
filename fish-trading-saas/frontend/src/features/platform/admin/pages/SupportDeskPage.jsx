import React, { useState, useEffect, useRef } from "react";
import { getSupportTickets, getWarRoomMetrics, updateTicketStatus, addTicketMessage, impersonateTenantFromTicket, resolveTicket, closeTicket, escalateTicket } from "../service/adminService";
import { useToast } from "@/components/shared/toast-provider";
import { WarRoomHeader } from "../components/war_room/WarRoomHeader";
import { SmartFilterBar } from "../components/war_room/SmartFilterBar";
import { AgentWorkloadPanel } from "../components/war_room/AgentWorkloadPanel";
import { DenseTicketCard } from "../components/war_room/DenseTicketCard";
import { UnifiedSupportWorkspace } from "../components/war_room/UnifiedSupportWorkspace";
import { ActionConfirmModal } from "../components/war_room/ActionConfirmModal";
import { ImpersonationConfirmModal } from "../components/war_room/ImpersonationConfirmModal";
import { CheckCircle2, ShieldAlert, X } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/store/authStore";

const KANBAN_COLUMNS = [
  { id: "new", label: "NEW", targetStatus: "new" },
  { id: "assigned", label: "ASSIGNED", targetStatus: "assigned" },
  { id: "in_progress", label: "IN PROGRESS", targetStatus: "in_progress" },
  { id: "waiting_for_customer", label: "WAITING CUSTOMER", targetStatus: "waiting_for_customer" },
  { id: "waiting_internal", label: "WAITING INTERNAL", targetStatus: "waiting_internal" },
  { id: "escalated_l1", label: "ESCALATED L1", targetStatus: "escalated_l1" },
  { id: "escalated_l2", label: "ESCALATED L2", targetStatus: "escalated_l2" },
  { id: "escalated_l3", label: "ESCALATED L3", targetStatus: "escalated_l3" },
  { id: "resolved", label: "RESOLVED", targetStatus: "resolved" },
  { id: "closed", label: "CLOSED", targetStatus: "closed" }
];

export default function SupportDeskPage() {
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", priority: "", category: "", is_escalated: "" });
  
  // Modals / Drawers
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [confirmActionData, setConfirmActionData] = useState(null);
  const [impersonationTarget, setImpersonationTarget] = useState(null);
  const [activeImpersonation, setActiveImpersonation] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState("create");
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuthStore();

  const isL1 = user?.role === 'platform_support_l1';
  const isL2 = user?.role === 'platform_support_l2';
  const isManagerOrAdmin = !isL1 && !isL2;

  const { push: toast } = useToast();
  const timerRef = useRef(null);

  const fetchBoardData = async (silent = true) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.is_escalated) params.is_escalated = filters.is_escalated;

      const [tktRes, metricsRes] = await Promise.all([
        getSupportTickets(params),
        getWarRoomMetrics()
      ]);
      const fetchedTickets = Array.isArray(tktRes.data) ? tktRes.data : (tktRes.data?.results || []);
      setTickets(fetchedTickets);
      setMetrics(metricsRes);
    } catch (err) {
      console.error("Failed to fetch war room data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData(false);
  }, [filters]);

  useEffect(() => {
    // Live Sync
    timerRef.current = setInterval(() => {
      fetchBoardData(true);
    }, 15000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus, targetColumnLabel) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (!ticketId) return;

    const ticket = tickets.find(t => t.id.toString() === ticketId.toString());
    if (!ticket || ticket.status === targetStatus) return;

    // Trigger confirmation modal instead of immediate update
    setConfirmActionData({
      ticket,
      targetStatus,
      targetColumnLabel
    });
  };

  const executeActionConfirm = async (ticketId, targetStatus, payload) => {
    setActionLoading(true);
    try {
      if (targetStatus === 'resolved') {
        await resolveTicket(ticketId, payload.reason);
      } else if (targetStatus === 'closed') {
        await closeTicket(ticketId);
        if (payload.note && payload.note.trim().length > 0) {
          await addTicketMessage(ticketId, payload.note, true);
        }
      } else if (targetStatus.startsWith('escalated')) {
        await escalateTicket(ticketId, { reason: payload.reason, priority: payload.priority });
      } else {
        await updateTicketStatus(ticketId, { status: targetStatus });
        if (payload.note && payload.note.trim().length > 0) {
          await addTicketMessage(ticketId, payload.note, true);
        }
      }
      
      toast({ message: `Ticket moved to ${targetStatus.replace('_', ' ')}` });
      setConfirmActionData(null);
      fetchBoardData(true);
    } catch (err) {
      toast({ message: err?.response?.data?.error || "Failed to update ticket", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImpersonateClick = (ticket) => {
    setImpersonationTarget(ticket);
  };

  const handleImpersonateConfirm = async (ticket, reason) => {
    setActionLoading(true);
    try {
      const res = await impersonateTenantFromTicket(ticket.id, reason);
      setActiveImpersonation({
        tenantName: ticket.tenant_name,
        sessionId: res.impersonation_id
      });
      toast({ message: "Impersonation session started" });
      setSelectedTicket(null);
      setImpersonationTarget(null);
    } catch (err) {
      toast({ message: err?.response?.data?.error || "Impersonation failed.", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (ticketId, content) => {
    try {
      await addTicketMessage(ticketId, content, false);
      toast({ message: "Message sent" });
      fetchBoardData(false); // Quick refresh to show message
      // Also update selected ticket messages
      const res = await getSupportTickets();
      const fetchedTickets = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const updatedTicket = fetchedTickets.find(t => t.id === ticketId);
      if (updatedTicket) setSelectedTicket(updatedTicket);
    } catch (err) {
      toast({ message: "Failed to send message", variant: "error" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-slate-300 font-sans overflow-hidden">
      {activeImpersonation && (
        <div className="bg-rose-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 z-50">
          <ShieldAlert size={14} />
          Currently Impersonating: {activeImpersonation.tenantName}
          <button 
            onClick={() => setActiveImpersonation(null)}
            className="ml-4 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
          >
            <X size={12} /> Exit Session
          </button>
        </div>
      )}
      <WarRoomHeader metrics={metrics} loading={loading} onOpenCreate={() => { setWorkspaceMode("create"); setSelectedTicket(null); setWorkspaceOpen(true); }} />
      <SmartFilterBar filters={filters} setFilters={setFilters} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Kanban Board Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-[#0f0f13]">
          <div className="flex h-full p-4 gap-4" style={{ minWidth: "max-content" }}>
            {KANBAN_COLUMNS.map(col => {
              const colTickets = tickets.filter(t => t.status === col.targetStatus);
              return (
                <div 
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.targetStatus, col.label)}
                  className="w-72 md:w-80 h-full flex flex-col bg-black/40 rounded-xl border border-white/5 overflow-hidden shrink-0"
                >
                  <div className="p-3 border-b border-white/5 bg-[#121215] flex justify-between items-center sticky top-0 z-10">
                    <span className="text-xs font-bold text-slate-400 tracking-widest">{col.label}</span>
                    <span className="text-[10px] font-mono bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/10">
                      {colTickets.length}
                    </span>
                  </div>
                  
                  <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar relative">
                    {colTickets.length > 0 ? (
                      colTickets.map(ticket => (
                        <DenseTicketCard 
                          key={ticket.id} 
                          ticket={ticket} 
                          onDragStart={handleDragStart} 
                          onClick={(t) => {
                            setSelectedTicket(t);
                            setWorkspaceMode('view');
                            setWorkspaceOpen(true);
                          }}
                        />
                      ))
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 opacity-50">
                        <CheckCircle2 size={32} className="mb-2 text-slate-600" />
                        <p className="text-xs font-medium">Queue is empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Panel - Workload */}
        {isManagerOrAdmin && (
          <AgentWorkloadPanel 
            agents={metrics?.agents || []} 
            tickets={tickets}
            onSelectTicket={(t) => {
              setSelectedTicket(t);
              setWorkspaceMode('view');
              setWorkspaceOpen(true);
            }}
            onAssignTicket={executeActionConfirm} 
          />
        )}
      </div>

      {/* Overlays */}
      <UnifiedSupportWorkspace
        isOpen={workspaceOpen}
        mode={workspaceMode}
        ticket={selectedTicket}
        onClose={() => {
          setWorkspaceOpen(false);
          setSelectedTicket(null);
        }}
        onSuccess={() => fetchBoardData(false)}
      />
      
      <ActionConfirmModal 
        isOpen={!!confirmActionData}
        onClose={() => setConfirmActionData(null)}
        actionData={confirmActionData}
        onConfirm={executeActionConfirm}
        loading={actionLoading}
      />

      <ImpersonationConfirmModal
        isOpen={!!impersonationTarget}
        onClose={() => setImpersonationTarget(null)}
        ticket={impersonationTarget}
        onConfirm={handleImpersonateConfirm}
        loading={actionLoading}
      />
    </div>
  );
}
