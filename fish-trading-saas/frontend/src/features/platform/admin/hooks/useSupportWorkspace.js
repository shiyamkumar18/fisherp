import { useState, useEffect } from 'react';
import { useToast } from "@/components/shared/toast-provider";
import { apiClient } from '@/services/apiClient';
import {
  getCompanies,
  updateTicketStatus,
  addTicketMessage,
  assignTicket,
  escalateTicket,
  resolveTicket,
  closeTicket,
  impersonateTenantFromTicket
} from "../service/adminService";

export function useSupportWorkspace({ isOpen, initialMode, ticket, onClose, onSuccess }) {
  const [workspaceMode, setWorkspaceMode] = useState(initialMode);
  const [activeTicket, setActiveTicket] = useState(null);

  // Form Fields State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("technical");
  const [issueType, setIssueType] = useState("bug");
  const [affectedModule, setAffectedModule] = useState("");
  const [environment, setEnvironment] = useState("Production");
  const [tags, setTags] = useState("");
  const [branch, setBranch] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [department, setDepartment] = useState("");
  const [escalationLevel, setEscalationLevel] = useState("L1");
  const [source, setSource] = useState("Web Portal");
  const [channel, setChannel] = useState("Support UI");

  const [flags, setFlags] = useState({
    bug_reproducible: false,
    production_impact: false,
    financial_impact: false,
    voice_failure: false,
    branch_impact: false,
    order_impact: false,
    inventory_impact: false,
    payment_impact: false
  });

  const [files, setFiles] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [fetchingTenants, setFetchingTenants] = useState(false);
  const [fetchingIntel, setFetchingIntel] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const { push: toast } = useToast();
  const hasUnsavedChanges = (workspaceMode === 'create' || workspaceMode === 'edit') && (!!subject || !!description);

  // Sync mode state from props
  useEffect(() => {
    setWorkspaceMode(initialMode);
    if (!isOpen) {
      setActiveTicket(null);
      clearForm();
    }
  }, [initialMode, isOpen]);

  // Load companies list
  useEffect(() => {
    if (isOpen) {
      setFetchingTenants(true);
      getCompanies()
        .then(res => {
          const d = res.data;
          setTenants(Array.isArray(d) ? d : (d?.tenants || d?.results || []));
        })
        .finally(() => setFetchingTenants(false));

      if (initialMode === 'create') {
        const draft = localStorage.getItem('ticket_draft');
        if (draft) {
          try {
            const p = JSON.parse(draft);
            setSubject(p.subject || "");
            setDescription(p.description || "");
          } catch {}
        }
      }
    }
  }, [isOpen]);

  // Load active ticket details & sync states
  useEffect(() => {
    if (isOpen && ticket?.id && workspaceMode !== 'create') {
      fetchTicketDetails(ticket.id);
    }
  }, [isOpen, ticket?.id, workspaceMode === 'create']);

  // Fetch intelligence on tenant selection
  useEffect(() => {
    if (tenantId) {
      setFetchingIntel(true);
      apiClient.get(`/platform/enterprise/tenant/${tenantId}/intelligence/`)
        .then(res => {
          setIntelligence(res.data);
          if (res.data?.subscription?.id && workspaceMode === 'create') {
            setSubscriptionId(res.data.subscription.id.toString());
          }
        })
        .finally(() => setFetchingIntel(false));
    } else {
      setIntelligence(null);
    }
  }, [tenantId]);

  // Debounced Autosave for Create Drafts
  useEffect(() => {
    if (!isOpen || workspaceMode !== 'create') return;
    setIsDraftSaved(false);
    const handler = setTimeout(() => {
      if (subject || description) {
        localStorage.setItem('ticket_draft', JSON.stringify({ subject, description }));
        setIsDraftSaved(true);
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [subject, description, isOpen, workspaceMode]);

  // SLA prioritization rules
  useEffect(() => {
    if (category === 'billing' && intelligence?.subscription?.tier === 'pro') {
      setPriority('high');
    } else if (severity === 'critical') {
      setPriority('critical');
    }
  }, [category, severity, intelligence]);

  const clearForm = () => {
    setSubject(""); setDescription(""); setTenantId(""); setPriority("medium"); setSeverity("medium");
    setCategory("technical"); setIssueType("bug"); setAffectedModule(""); setEnvironment("Production");
    setTags(""); setBranch(""); setSubscriptionId(""); setDepartment(""); setEscalationLevel("L1");
    setSource("Web Portal"); setChannel("Support UI"); setFiles([]); setIntelligence(null);
  };

  const fetchTicketDetails = async (id) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/support/tickets/${id}/`);
      setActiveTicket(res.data);
      // Sync form states for edit mode support
      setSubject(res.data.subject || "");
      setDescription(res.data.description || "");
      setTenantId(res.data.tenant ? res.data.tenant.toString() : "");
      setPriority(res.data.priority || "medium");
      setSeverity(res.data.severity || "medium");
      setCategory(res.data.category || "technical");
      setIssueType(res.data.issue_type || "bug");
      setAffectedModule(res.data.affected_module || "");
      setBranch(res.data.branch || "");
      setSubscriptionId(res.data.linked_subscription || "");
      setDepartment(res.data.department || "");
      setEscalationLevel(res.data.escalation_level ? `L${res.data.escalation_level}` : "L1");
      
      const tf = res.data.tenant_environment || {};
      setEnvironment(tf.environment || "Production");
      setSource(tf.source || "Web Portal");
      setChannel(tf.channel || "Support UI");
      setTags(res.data.tags?.join(", ") || "");
      setFlags({
        bug_reproducible: !!tf.bug_reproducible,
        production_impact: !!tf.production_impact,
        financial_impact: !!tf.financial_impact,
        voice_failure: !!tf.voice_failure,
        branch_impact: !!tf.branch_impact,
        order_impact: !!tf.order_impact,
        inventory_impact: !!tf.inventory_impact,
        payment_impact: !!tf.payment_impact
      });
    } catch {
      toast({ message: "Failed to load ticket updates", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = (flagKey) => {
    setFlags(prev => ({ ...prev, [flagKey]: !prev[flagKey] }));
  };

  const applyTemplate = (type) => {
    const tpls = {
      billing: { cat: 'billing', type: 'billing', sub: 'Billing Issue: ', desc: "Invoice ID: \nSubscription ID: \nPayment attempt date: \n\nIssue summary: \n\nAmount impacted: \n\nBusiness impact: \n" },
      technical: { cat: 'technical', type: 'bug', sub: 'Technical Issue: ', desc: "Problem:\n\nExpected behavior:\n\nActual behavior:\n\nSteps to reproduce:\n1.\n2.\n\nBrowser:\n\nAPI logs:\n\nBusiness impact:\n" },
      voice: { cat: 'voice', type: 'incident', sub: 'Voice AI Failure: ', desc: "Language:\nTamil/Tanglish\n\nVoice sample context:\n\nExpected output:\n\nWrong detection:\n\nDevice:\n\nAudio quality:\n", flag: 'voice_failure' },
      security: { cat: 'security', type: 'access_problem', sub: 'Security Incident: ', desc: "Security Incident Details:\n\nType of Breach / Alert:\n\nIP Address(es):\n\nImpacted Accounts:\n\nDiagnostic Info:\n" },
      inventory: { cat: 'trading', type: 'incident', sub: 'Inventory Sync Error: ', desc: "Warehouse Location:\n\nSKU / Batch Impacted:\n\nDiscrepancy Detail:\n\nAPI Payload log:\n", flag: 'inventory_impact' },
      payment: { cat: 'billing', type: 'billing', sub: 'Payment Processing Failure: ', desc: "Transaction Ref:\n\nGateway:\n\nErrorCode:\n\nFailure Log snippet:\n", flag: 'payment_impact' },
      api_failure: { cat: 'technical', type: 'incident', sub: 'Core API Endpoint Failure: ', desc: "Endpoint Path:\n\nMethod:\n\nResponse Status Code:\n\nRequest Payload:\n\nStack Trace:\n" }
    };
    const t = tpls[type];
    if (t) {
      setCategory(t.cat); setIssueType(t.type); setSubject(t.sub); setDescription(t.desc);
      if (t.flag) setFlags(p => ({ ...p, [t.flag]: true }));
    }
  };

  const handleSubmit = async (e, action = 'create') => {
    if (e) e.preventDefault();
    if (action !== 'draft' && (!subject.trim() || !description.trim())) {
      toast({ message: "Subject and Description are required fields", variant: "error" });
      return;
    }

    setActionType(action);
    setLoading(true);

    try {
      const payload = {
        subject, description, priority, severity, category,
        affected_module: affectedModule, environment, issue_type: issueType,
        source, channel, branch_id: branch, subscription_id: subscriptionId,
        department, escalation_level: escalationLevel, ...flags,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        save_draft: action === 'draft'
      };

      if (tenantId) payload.tenant_id = parseInt(tenantId, 10);

      if (action === 'edit' && activeTicket) {
        await updateTicketStatus(activeTicket.id, payload);
        toast({ message: "Ticket updated successfully!" });
        setWorkspaceMode('view');
        fetchTicketDetails(activeTicket.id);
      } else {
        if (action === 'assign') payload.assignee_id = 1;
        await apiClient.post("/support/tickets/", payload);
        toast({ message: action === 'draft' ? "Draft saved." : "Ticket dispatched successfully!" });
        localStorage.removeItem('ticket_draft');
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast({ message: err?.response?.data?.error || "Failed to process operation", variant: "error" });
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleSendMessage = async (tktId, content, isNote) => {
    try {
      await addTicketMessage(tktId, content, isNote);
      toast({ message: isNote ? "Internal note posted" : "Response sent to client" });
      fetchTicketDetails(tktId);
      onSuccess?.();
    } catch {
      toast({ message: "Failed to send message", variant: "error" });
    }
  };

  const handleEscalate = async (tktId, reason, priorityVal) => {
    try {
      await escalateTicket(tktId, { reason, priority: priorityVal });
      toast({ message: "Ticket successfully escalated" });
      fetchTicketDetails(tktId);
      onSuccess?.();
    } catch {
      toast({ message: "Failed to escalate ticket", variant: "error" });
    }
  };

  const handleResolve = async (tktId, reason) => {
    try {
      await resolveTicket(tktId, reason);
      toast({ message: "Ticket marked resolved" });
      fetchTicketDetails(tktId);
      onSuccess?.();
    } catch {
      toast({ message: "Failed to resolve ticket", variant: "error" });
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      await closeTicket(activeTicket.id);
      toast({ message: "Ticket closed" });
      fetchTicketDetails(activeTicket.id);
      onSuccess?.();
    } catch {
      toast({ message: "Failed to close ticket", variant: "error" });
    }
  };

  const handleAssignSelf = async () => {
    if (!activeTicket) return;
    try {
      await assignTicket(activeTicket.id, 1);
      toast({ message: "Ticket claimed successfully" });
      fetchTicketDetails(activeTicket.id);
      onSuccess?.();
    } catch {
      toast({ message: "Failed to assign ticket", variant: "error" });
    }
  };

  const handleImpersonateClick = async () => {
    if (!activeTicket) return;
    try {
      await impersonateTenantFromTicket(activeTicket.id, "L2 War Room Operator impersonation session.");
      toast({ message: "Impersonation session started" });
      onClose();
    } catch {
      toast({ message: "Impersonation failed", variant: "error" });
    }
  };

  const handleCloseConfirm = () => {
    if (hasUnsavedChanges) setShowCloseConfirm(true);
    else onClose();
  };

  const getEstimatedSLA = () => {
    if (priority === 'critical') return "SLA: 30m response, 4h resolution";
    if (priority === 'high') return "SLA: 2h response, 12h resolution";
    if (priority === 'medium') return "SLA: 12h response, 48h resolution";
    return "SLA: 24h response, 5d resolution";
  };

  return {
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
  };
}
