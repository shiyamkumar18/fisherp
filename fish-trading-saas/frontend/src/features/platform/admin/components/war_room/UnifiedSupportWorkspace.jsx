import React from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Sparkles, Play, X } from 'lucide-react';
import { useSupportWorkspace } from "../../hooks/useSupportWorkspace";
import { WorkspaceMetadataPanel } from "./WorkspaceMetadataPanel";
import { WorkspaceComposerPanel } from "./WorkspaceComposerPanel";
import { TenantIntelligenceSidebar } from "./TenantIntelligenceSidebar";
import { WorkspaceFooterActions } from "./WorkspaceFooterActions";

export function UnifiedSupportWorkspace({ isOpen, mode: initialMode = 'create', ticket, onClose, onSuccess }) {
  const {
    workspaceMode, setWorkspaceMode,
    activeTicket,
    subject, setSubject,
    description, setDescription,
    tenantId, setTenantId,
    priority, setPriority,
    severity, setSeverity,
    category, setCategory,
    issueType, setIssueType,
    affectedModule, setAffectedModule,
    environment, setEnvironment,
    tags, setTags,
    branch, setBranch,
    subscriptionId, setSubscriptionId,
    department, setDepartment,
    escalationLevel, setEscalationLevel,
    source, setSource,
    channel, setChannel,
    flags, toggleFlag,
    files, setFiles,
    tenants,
    intelligence,
    loading,
    actionType,
    fetchingTenants,
    fetchingIntel,
    isDraftSaved,
    showCloseConfirm, setShowCloseConfirm,
    hasUnsavedChanges,
    applyTemplate,
    handleSubmit,
    handleSendMessage,
    handleEscalate,
    handleResolve,
    handleCloseTicket,
    handleAssignSelf,
    handleImpersonateClick,
    handleCloseConfirm,
    getEstimatedSLA
  } = useSupportWorkspace({ isOpen, initialMode, ticket, onClose, onSuccess });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseConfirm()}>
      <DialogContent className="w-full sm:w-[92vw] sm:max-w-[1800px] h-full sm:h-[92vh] sm:max-h-[92vh] max-h-[100vh] sm:rounded-2xl rounded-none p-0 overflow-hidden flex flex-col bg-[#0b0c0e] border border-white/10 shadow-2xl relative">
        
        {/* Unified Header */}
        <div className="h-[90px] px-8 border-b border-white/5 bg-[#101216] shrink-0 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div>
              <DialogTitle className="text-sm font-bold text-slate-100 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {workspaceMode === 'create' ? "Create Support Ticket" : workspaceMode === 'edit' ? "Edit Support Ticket" : `Support Ticket Workspace`}
                {activeTicket && (
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    {activeTicket.ticket_number || `TKT-${activeTicket.id}`}
                  </span>
                )}
              </DialogTitle>
              <p className="text-[10px] text-slate-500 mt-0.5">Enterprise platform command center operations console.</p>
            </div>
          </div>

          {/* Quick Actions in Center of Header */}
          {workspaceMode === 'view' && activeTicket && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleImpersonateClick}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all select-none"
              >
                <Play size={11} /> Impersonate Tenant
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCloseConfirm}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* 12-Column Responsive Body */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-12 gap-8 bg-[#0b0c0e] min-w-0">
          
          <WorkspaceMetadataPanel
            mode={workspaceMode}
            tenantId={tenantId}
            setTenantId={setTenantId}
            tenants={tenants}
            fetchingTenants={fetchingTenants}
            category={category}
            setCategory={setCategory}
            issueType={issueType}
            setIssueType={setIssueType}
            affectedModule={affectedModule}
            setAffectedModule={setAffectedModule}
            environment={environment}
            setEnvironment={setEnvironment}
            priority={priority}
            setPriority={setPriority}
            severity={severity}
            setSeverity={setSeverity}
            source={source}
            setSource={setSource}
            channel={channel}
            setChannel={setChannel}
            flags={flags}
            toggleFlag={toggleFlag}
            branch={branch}
            setBranch={setBranch}
            subscriptionId={subscriptionId}
            setSubscriptionId={setSubscriptionId}
            department={department}
            setDepartment={setDepartment}
            escalationLevel={escalationLevel}
            setEscalationLevel={setEscalationLevel}
            estimatedSLA={getEstimatedSLA()}
            intelligence={intelligence}
            ticket={activeTicket}
          />

          <WorkspaceComposerPanel
            mode={workspaceMode}
            subject={subject}
            setSubject={setSubject}
            description={description}
            setDescription={setDescription}
            applyTemplate={applyTemplate}
            priority={priority}
            severity={severity}
            tags={tags}
            setTags={setTags}
            files={files}
            setFiles={setFiles}
            ticket={activeTicket}
            onSendMessage={handleSendMessage}
            estimatedSLA={getEstimatedSLA()}
          />

          <TenantIntelligenceSidebar
            tenantId={tenantId}
            tenants={tenants}
            intelligence={intelligence}
            loading={fetchingIntel}
          />

        </div>

        {/* Unified Sticky Footer Actions */}
        <WorkspaceFooterActions
          mode={workspaceMode}
          setMode={setWorkspaceMode}
          category={category}
          priority={priority}
          severity={severity}
          loading={loading}
          actionType={actionType}
          onClose={handleCloseConfirm}
          onSubmit={handleSubmit}
          onAssignSelf={handleAssignSelf}
          onEscalate={handleEscalate}
          onResolve={handleResolve}
          onCloseTicket={handleCloseTicket}
          isDraftSaved={isDraftSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          ticket={activeTicket}
        />

        {/* Safety Close Confirm Dialog Overlay */}
        {showCloseConfirm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#12141a] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle size={24} />
                <h4 className="font-bold text-slate-100">Unsaved Composer Changes</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                You have active edits in the composer area. If you close this workspace, your updates will be kept in local draft cache, but current form changes will not be committed to the system.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-lg"
                >
                  Discard & Close
                </button>
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
