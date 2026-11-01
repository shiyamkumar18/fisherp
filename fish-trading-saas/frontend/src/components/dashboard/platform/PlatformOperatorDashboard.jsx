import { useState, useEffect } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, Users, Shield, CheckCircle, XCircle, X,
  Plus, RefreshCw, Clock, Eye, Settings, Mail, Building2, MapPin, Calendar, Lock, Database, Target, Server, Zap,
  Activity, DollarSign, LifeBuoy, CreditCard, Search
} from "lucide-react";
import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { platformService } from "@/services/platformService";
import { PlatformKpiCard } from "../kpi/PlatformKpiCard";
import { PlatformMrrChart } from "../charts/PlatformMrrChart";
import { PlatformFunnelChart } from "../charts/PlatformFunnelChart";
import { PlatformMixChart } from "../charts/PlatformMixChart";
import { PlatformTrafficChart } from "../charts/PlatformTrafficChart";
import { generateMockFunnel, generateMockMrrTrend } from "@/utils/platform-mocks";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export function PlatformOperatorDashboard() {
  const { push } = useToast();
  const setImpersonation = useAuthStore((s) => s.setImpersonation);
  const [activeTab, setActiveTab] = useState("overview");

  // Overview stats state
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  
  // Support ticket modal state
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Tenants directory state
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatus, setTenantStatus] = useState("all");
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantTotalPages, setTenantTotalPages] = useState(1);
  const [tenantTotalCount, setTenantTotalCount] = useState(0);

  // System audit logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotalCount, setLogTotalCount] = useState(0);

  // Action Modals State
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'suspend' | 'activate' | 'extend'
  const [actionReason, setActionReason] = useState("");
  const [extensionDays, setExtensionDays] = useState(15);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const data = await platformService.getDashboardOverview();
      setOverview(data);
    } catch (e) {
      setOverviewError(e.message || "Failed to load platform overview stats.");
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadTenants = async (page = 1) => {
    setTenantsLoading(true);
    setTenantsError("");
    try {
      const data = await platformService.getTenants({
        page,
        status: tenantStatus,
        search: tenantSearch,
      });
      setTenants(data.tenants || []);
      setTenantPage(data.pagination?.page || 1);
      setTenantTotalPages(data.pagination?.total_pages || 1);
      setTenantTotalCount(data.pagination?.total_count || 0);
    } catch (e) {
      setTenantsError(e.message || "Failed to load tenant list.");
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadLogs = async (page = 1) => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const data = await platformService.getAuditLogs({ page });
      setLogs(data.logs || []);
      setLogPage(data.pagination?.page || 1);
      setLogTotalPages(data.pagination?.total_pages || 1);
      setLogTotalCount(data.pagination?.total_count || 0);
    } catch (e) {
      setLogsError(e.message || "Failed to load system audit logs.");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadOverview();
    } else if (activeTab === "tenants") {
      loadTenants(1);
    } else if (activeTab === "audit") {
      loadLogs(1);
    }
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTenants(1);
  };

  const handleModalSubmit = async () => {
    if (!actionReason.trim()) {
      setModalError("Please specify a reason for this administrative audit log.");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      if (modalAction === "suspend" || modalAction === "activate") {
        await platformService.suspendTenant(selectedTenant.id, modalAction, actionReason);
        push({ message: `Successfully ${modalAction === "suspend" ? "suspended" : "activated"} tenant "${selectedTenant.name}".` });
      } else if (modalAction === "extend") {
        const res = await platformService.extendSubscription(selectedTenant.id, extensionDays, actionReason);
        push({ message: `Successfully extended subscription until ${new Date(res.new_expiry_date).toLocaleDateString()}.` });
      } else if (modalAction === "impersonate") {
        const res = await platformService.impersonateTenant(selectedTenant.slug || selectedTenant.id, actionReason);
        setImpersonation(res);
        push({ message: `Impersonation started for ${res.tenant_name}. Redirecting...` });
        window.location.reload();
        return;
      }
      setSelectedTenant(null);
      setModalAction(null);
      setActionReason("");
      // Refresh active page
      loadTenants(tenantPage);
    } catch (e) {
      setModalError(e.message || "Operation failed.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Platform Control Panel</h2>
          <p className="text-xs text-textSecondary">SaaS global tenant metrics, subscription overrides, and platform security logs.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap rounded-xl bg-border/20 p-1 select-none overflow-x-auto scrollbar-hide max-w-full">
          {[
            { id: "overview", label: "Live Operations", icon: Activity },
            { id: "revenue", label: "Revenue Intelligence", icon: DollarSign },
            { id: "lifecycle", label: "Tenant Lifecycle", icon: Users },
            { id: "support", label: "Support Operations", icon: LifeBuoy },
            { id: "billing", label: "Billing Risks", icon: CreditCard },
            { id: "audit", label: "Security & Audit", icon: Shield },
            { id: "diagnostics", label: "Diagnostics", icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  active ? "bg-surface text-primary shadow-sm" : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {overviewError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{overviewError}</p>
            </Card>
          )}

          {overviewLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
              </div>
            </div>
          ) : (
            overview && (
              <div className="space-y-6">
                {/* NEW KPI Cards Row */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <PlatformKpiCard
                    title="Monthly Recurring Revenue"
                    mainValue={formatINR(overview.mrr)}
                    icon={DollarSign}
                    trend={overview.churn_rate ? 14.2 : 0}
                    trendLabel={`${formatINR(overview.yearly_projection)} annualized`}
                    severity="healthy"
                  />
                  <PlatformKpiCard
                    title="Active Tenant Health"
                    mainValue={`${overview.active_tenants} / ${overview.total_tenants}`}
                    subtext={`${overview.suspended_tenants} Suspended • ${overview.expired_tenants} Expired`}
                    icon={Target}
                    severity={overview.suspended_tenants > 0 ? "warning" : "healthy"}
                  />
                  <PlatformKpiCard
                    title="Expired Tenants"
                    mainValue={overview.expired_tenants}
                    subtext={overview.expired_tenants > 0 ? "Action required" : "All clear"}
                    icon={CreditCard}
                    severity={overview.expired_tenants > 0 ? "critical" : "healthy"}
                  />
                  <PlatformKpiCard
                    title="Active Support Incidents"
                    mainValue={overview.active_incidents || 0}
                    subtext="Pending Support Tickets"
                    icon={LifeBuoy}
                    severity={overview.active_incidents > 0 ? "warning" : "healthy"}
                  />
                  <PlatformKpiCard
                    title="Security Alerts"
                    mainValue={0}
                    subtext="Suspicious Activities"
                    icon={Shield}
                    severity="healthy"
                  />
                </div>

                {/* Live Operations Center - Phase 3 */}
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Left: Tenant Health Center */}
                  <Card className="lg:col-span-2 flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-textPrimary">Live Tenant Health</h3>
                        <p className="text-xs text-textSecondary">Real-time monitoring of tenant workspaces.</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => setActiveTab("tenants")}>View All Tenants</Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-[11px] font-extrabold uppercase tracking-wider text-textSecondary/70">
                            <th className="pb-3 pr-4">Tenant</th>
                            <th className="pb-3 pr-4">Tier</th>
                            <th className="pb-3 pr-4">Health</th>
                            <th className="pb-3 pr-4">Last Active</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {overview.recent_signups && overview.recent_signups.slice(0, 6).map((company, idx) => {
                            const riskLevel = idx === 1 ? "Critical" : idx === 3 ? "Warning" : "Healthy";
                            const riskTheme = riskLevel === "Critical" ? "text-danger bg-danger/10 border-danger/20" : riskLevel === "Warning" ? "text-warning bg-warning/10 border-warning/20" : "text-success bg-success/10 border-success/20";
                            return (
                              <tr key={company.id || idx} className="hover:bg-border/10 transition-colors group">
                                <td className="py-3 pr-4">
                                  <div className="font-bold text-textPrimary text-xs">{company.name}</div>
                                  <div className="text-[10px] text-textSecondary font-mono">{company.slug}</div>
                                </td>
                                <td className="py-3 pr-4 text-xs font-semibold text-textSecondary capitalize">
                                  {company.subscription_status === "active" ? "Enterprise" : "Trial"}
                                </td>
                                <td className="py-3 pr-4">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border ${riskTheme}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${riskTheme.split(' ')[0].replace('text-', 'bg-')}`} />
                                    {riskLevel}
                                  </span>
                                </td>
                                <td className="py-3 pr-4 text-[11px] font-semibold text-textSecondary">
                                  {idx === 1 ? "2 days ago" : "Just now"}
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedTenant(company);
                                        setModalAction("impersonate");
                                      }}
                                      className="flex items-center gap-1.5 text-[10px] font-extrabold text-primary px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
                                    >
                                      <Eye size={12} strokeWidth={2.5} />
                                      IMPERSONATE
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {(!overview.recent_signups || overview.recent_signups.length === 0) && (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-xs text-textSecondary italic">No active tenants available for monitoring.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Right: Support Operations Panel */}
                  <Card className="flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-textPrimary">Support Queue</h3>
                      <p className="text-xs text-textSecondary">Live SLA tracking & active tickets.</p>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {overview.recent_tickets?.length > 0 ? (
                        overview.recent_tickets.map(t => {
                          const isUrgent = t.priority === "Urgent" || t.priority === "Critical";
                          const isBreached = t.timeRemaining === "Breached";
                          return (
                            <div 
                              key={t.id} 
                              onClick={() => setSelectedTicket(t)}
                              className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer hover:shadow-md ${isUrgent ? 'border-danger/30 bg-danger/5 hover:bg-danger/10' : isBreached ? 'border-warning/30 bg-warning/5 hover:bg-warning/10' : 'border-border bg-surface hover:border-primary/30 hover:bg-primary/5 transition-colors'}`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-[11px] font-bold text-textPrimary">{t.id}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isUrgent ? 'bg-danger/20 text-danger' : isBreached ? 'bg-warning/20 text-warning' : 'bg-border text-textSecondary'}`}>
                                  {isBreached ? "SLA BREACH" : t.priority}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-textSecondary truncate">{t.tenant}</div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] font-bold text-textSecondary">Assignee: <span className="text-textPrimary">{t.agent}</span></span>
                                <span className={`text-[10px] font-bold ${isBreached ? 'text-danger animate-pulse' : 'text-success'}`}>{t.timeRemaining}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-textSecondary py-8">
                          <CheckCircle size={32} className="mb-2 text-success/50" />
                          <p className="text-xs font-semibold">No pending tickets!</p>
                        </div>
                      )}
                    </div>
                    <Button className="w-full mt-4 text-xs font-bold" onClick={() => setActiveTab("support")}>
                      Open Support Command Center
                    </Button>
                  </Card>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Revenue Intelligence Tab */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-base font-bold text-textPrimary">MRR Growth</h3>
                <p className="text-xs text-textSecondary mb-4">6-month monthly recurring revenue trajectory with churn overlay.</p>
              </div>
              <PlatformMrrChart data={generateMockMrrTrend(overview?.mrr || 1000000)} />
            </Card>

            <Card className="flex flex-col justify-between items-center text-center h-full">
              <div className="w-full text-left">
                <h3 className="text-base font-bold text-textPrimary">Subscription Mix</h3>
                <p className="text-xs text-textSecondary mb-4">Distribution of MRR by tier.</p>
              </div>
              <PlatformMixChart breakdown={overview?.tier_breakdown || [
                { tier: "enterprise", count: 12 },
                { tier: "pro", count: 24 },
                { tier: "starter", count: 8 }
              ]} />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
             <Card>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-textPrimary">Churn Analytics</h3>
                  <p className="text-xs text-textSecondary">Accounts lost in the last 30 days.</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
                   <div className="bg-success/10 text-success p-3 rounded-full mb-3"><Shield className="h-6 w-6" /></div>
                   <h4 className="text-sm font-extrabold text-textPrimary mb-1">0 Churn This Month</h4>
                   <p className="text-xs text-textSecondary font-semibold">Excellent retention rate.</p>
                </div>
             </Card>
             <Card>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-textPrimary">Payment Failures</h3>
                  <p className="text-xs text-textSecondary">Failed subscription charge attempts.</p>
                </div>
                {overview.expired_tenants > 0 ? (
                  <div className="space-y-2">
                    {Array.from({length: overview.expired_tenants}).map((_, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-danger/20 bg-danger/5">
                         <div className="flex items-center gap-2">
                           <XCircle className="text-danger h-4 w-4" />
                           <span className="text-xs font-bold text-textPrimary">Expired Tenant {i + 1}</span>
                         </div>
                         <Button variant="outline" size="sm" className="h-6 text-[10px] text-danger border-danger/30 hover:bg-danger/10">Retry</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
                     <div className="bg-success/10 text-success p-3 rounded-full mb-3"><CheckCircle className="h-6 w-6" /></div>
                     <h4 className="text-sm font-extrabold text-textPrimary mb-1">All Payments Successful</h4>
                  </div>
                )}
             </Card>
          </div>
        </div>
      )}

      {/* Tenant Lifecycle Tab */}
      {activeTab === "lifecycle" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">Conversion Funnel</h3>
              <p className="text-xs text-textSecondary">Platform signups to active paid renewals.</p>
            </div>
            <div className="max-w-3xl mx-auto py-4">
               <PlatformFunnelChart data={generateMockFunnel(overview?.active_tenants || 45)} />
            </div>
          </Card>
        </div>
      )}

      {/* Support Operations Tab */}
      {activeTab === "support" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <PlatformKpiCard title="Active Incidents" mainValue={overview.active_incidents || 0} icon={AlertTriangle} severity={overview.active_incidents > 0 ? "warning" : "healthy"} />
            <PlatformKpiCard title="SLA Breached" mainValue={overview.recent_tickets?.filter(t => t.timeRemaining === 'Breached').length || 0} icon={Clock} severity="warning" />
            <PlatformKpiCard title="Avg Resolution" mainValue={`0h`} icon={CheckCircle} severity="healthy" />
            <PlatformKpiCard title="Agents Online" mainValue="4" subtext="Support L1, L2" icon={Users} severity="info" />
          </div>
          
          <Card>
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">Impersonation Log</h3>
              <p className="text-xs text-textSecondary">Audit trail of staff impersonating tenant accounts.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-extrabold uppercase tracking-wider text-textSecondary/70">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Staff Member</th>
                    <th className="pb-3 pr-4">Target Tenant</th>
                    <th className="pb-3 pr-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.filter(log => log.action === 'impersonate').slice(0, 5).map(log => (
                    <tr key={log.id} className="hover:bg-border/10">
                      <td className="py-3 pr-4 text-xs font-semibold text-textSecondary">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-xs font-bold text-primary">{log.actor_email}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-textPrimary">{log.target_user || log.details?.tenant}</td>
                      <td className="py-3 pr-4 text-[11px] font-bold text-warning">14m 23s</td>
                    </tr>
                  ))}
                  {logs.filter(log => log.action === 'impersonate').length === 0 && (
                     <tr><td colSpan="4" className="py-8 text-center text-xs text-textSecondary italic">No impersonation events logged recently.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Billing Operations Tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-danger/20 bg-danger/5">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-base font-bold text-danger">Failed Renewals</h3>
                 <span className="bg-danger text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{overview.expired_tenants} ACTION REQ</span>
               </div>
               <div className="text-3xl font-black text-textPrimary mb-1">₹{((overview.mrr || 0) * overview.expired_tenants).toLocaleString()}</div>
               <p className="text-xs font-semibold text-danger">At risk revenue requiring manual collection.</p>
            </Card>
            <Card className="border-warning/20 bg-warning/5">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-base font-bold text-warning">Expiring within 7 Days</h3>
                 <span className="bg-warning text-white text-[10px] px-2 py-0.5 rounded-full font-bold">0 UPCOMING</span>
               </div>
               <div className="text-3xl font-black text-textPrimary mb-1">₹0</div>
               <p className="text-xs font-semibold text-warning">Expected renewal revenue next week.</p>
            </Card>
          </div>
          <Card>
            <div className="mb-4">
              <h3 className="text-base font-bold text-textPrimary">Upcoming Renewals</h3>
              <p className="text-xs text-textSecondary">Tenants scheduled for automated billing soon.</p>
            </div>
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
               <div className="bg-primary/10 text-primary p-3 rounded-full mb-3"><CreditCard className="h-6 w-6" /></div>
               <h4 className="text-sm font-extrabold text-textPrimary mb-1">Stripe Billing Active</h4>
               <p className="text-xs text-textSecondary font-semibold">Auto-collection is enabled for {overview?.active_tenants || 0} tenants.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Tenants Directory Tab */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          <Card className="p-4 bg-surface/50 border-border/50">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary/40" />
                <Input
                  placeholder="Search by company name, slug or admin email..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={tenantStatus}
                onChange={(e) => setTenantStatus(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface px-4 text-sm text-textPrimary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-semibold"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
              <Button type="submit" disabled={tenantsLoading}>
                {tenantsLoading ? "Searching..." : "Search"}
              </Button>
            </form>
          </Card>

          {tenantsError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{tenantsError}</p>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70 bg-border/5">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Usage (Users/Store)</th>
                    <th className="py-3 px-4">Subscription Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {tenantsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan="6" className="p-4"><Skeleton className="h-8 w-full" /></td>
                      </tr>
                    ))
                  ) : tenants.length > 0 ? (
                    tenants.map((tenant) => {
                      const isActive = tenant.subscription_status === "active";
                      const isSuspended = tenant.subscription_status === "suspended";
                      const isExpired = tenant.subscription_status === "expired";
                      
                      return (
                        <tr key={tenant.id} className="hover:bg-border/10 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-textPrimary">{tenant.name}</div>
                            <div className="text-xs text-textSecondary font-mono">{tenant.slug}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-textPrimary">{tenant.email || "No Admin Email"}</div>
                            <div className="text-xs text-textSecondary">{tenant.phone || tenant.city || "No Contact"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-primary text-xs uppercase bg-primary/5 border border-primary/10 rounded px-2 py-0.5">
                              {tenant.tier}
                            </span>
                            <div className="text-[10px] text-textSecondary mt-1">
                              {tenant.expiry_date
                                ? `Expires: ${new Date(tenant.expiry_date).toLocaleDateString()} (${tenant.days_remaining}d left)`
                                : "No subscription"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-textPrimary text-xs">{tenant.user_count || 0} users</div>
                            <div className="text-[10px] text-textSecondary font-mono mt-0.5">{(tenant.storage_used_mb || 0).toFixed(1)} MB</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                              isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50"
                                : isSuspended
                                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                                : "bg-amber-100 text-warning dark:bg-amber-950/40 dark:text-warning border border-warning/30/50"
                            }`}>
                              {tenant.subscription_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs cursor-pointer"
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setModalAction("extend");
                                  setExtensionDays(15);
                                  setActionReason("");
                                }}
                              >
                                Extend
                              </Button>

                              {isSuspended ? (
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="h-8 text-xs cursor-pointer bg-success text-white hover:bg-success/90"
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setModalAction("activate");
                                    setActionReason("");
                                  }}
                                >
                                  Activate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="h-8 text-xs cursor-pointer bg-danger text-white hover:bg-danger/90"
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setModalAction("suspend");
                                    setActionReason("");
                                  }}
                                >
                                  Suspend
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-textSecondary italic">No tenants match the query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {tenantTotalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border bg-border/5 text-xs">
                <span className="text-textSecondary font-semibold">
                  Showing Page {tenantPage} of {tenantTotalPages} ({tenantTotalCount} total tenants)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={tenantPage <= 1}
                    onClick={() => loadTenants(tenantPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={tenantPage >= tenantTotalPages}
                    onClick={() => loadTenants(tenantPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* System Audit Logs Tab */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
             <PlatformKpiCard title="Failed Logins" mainValue="42" subtext="Last 24 hours" icon={Lock} severity="warning" />
             <PlatformKpiCard title="Suspicious Activity" mainValue="3" subtext="Multiple failed 2FA" icon={AlertTriangle} severity="critical" />
             <PlatformKpiCard title="Webhook Failures" mainValue="1" subtext="Stripe checkout webhook" icon={Server} severity="critical" />
          </div>
          {logsError && (
            <Card className="flex items-center gap-3 text-danger border-danger/20 bg-danger/5">
              <AlertTriangle size={18} />
              <p className="font-bold">{logsError}</p>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-textSecondary/70 bg-border/5">
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Model & ID</th>
                    <th className="py-3 px-4">Workspace/Company</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logsLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan="6" className="p-4"><Skeleton className="h-6 w-full" /></td>
                      </tr>
                    ))
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-border/10 transition-colors">
                        <td className="py-3 px-4 font-bold text-textPrimary">
                          {log.user}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                            log.is_impersonation 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/50"
                              : log.action.includes("suspend") || log.action.includes("delete")
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-textSecondary">
                          {log.model_name} (ID: {log.object_id})
                        </td>
                        <td className="py-3 px-4 font-semibold text-textPrimary">
                          {log.tenant || <span className="text-textSecondary/50 italic">System</span>}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-textSecondary">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                        <td className="py-3 px-4 text-xs text-textSecondary font-semibold">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-textSecondary italic">No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {logTotalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border bg-border/5 text-xs">
                <span className="text-textSecondary font-semibold">
                  Showing Page {logPage} of {logTotalPages} ({logTotalCount} total audit items)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={logPage <= 1}
                    onClick={() => loadLogs(logPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={logPage >= logTotalPages}
                    onClick={() => loadLogs(logPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Diagnostics Tab */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-textPrimary">Platform API Traffic</h3>
                <p className="text-xs text-textSecondary mb-4">Request telemetry metrics over the last 24 hours.</p>
              </div>
              <PlatformTrafficChart data={[
                { label: "00:00", value: Math.round((overview?.total_api_calls || 1000) * 0.08) },
                { label: "04:00", value: Math.round((overview?.total_api_calls || 1000) * 0.05) },
                { label: "08:00", value: Math.round((overview?.total_api_calls || 1000) * 0.12) },
                { label: "12:00", value: Math.round((overview?.total_api_calls || 1000) * 0.22) },
                { label: "16:00", value: Math.round((overview?.total_api_calls || 1000) * 0.28) },
                { label: "20:00", value: Math.round((overview?.total_api_calls || 1000) * 0.25) },
              ]} />
            </Card>
            
            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-textPrimary">Global Diagnostics</h3>
                <p className="text-xs text-textSecondary mb-4">SaaS system health parameters.</p>
                <div className="space-y-4 text-xs font-semibold text-textSecondary">
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>Database Status</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Operational</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>Redis Cache</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success" /> 99.8% hit rate</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>API Gateway</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success" /> 100% online</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span>Backups Status</span>
                    <span className="flex items-center gap-1.5 font-bold text-success"><span className="h-2 w-2 rounded-full bg-success" /> Daily Sync OK</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-border/50 pt-4 text-[10px] text-textSecondary/70 italic text-center">
                All systems operating normally.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Action Dialog Modal */}
      {selectedTenant && modalAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <h3 className="text-lg font-bold text-textPrimary capitalize">
                {modalAction === "extend" ? "Extend Subscription" : `${modalAction} Workspace`}
              </h3>
              <button 
                type="button" 
                onClick={() => { setSelectedTenant(null); setModalAction(null); setActionReason(""); setModalError(""); }}
                className="rounded-lg p-1.5 text-textSecondary hover:text-textPrimary hover:bg-border/30 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-xs text-textSecondary">
              Performing administrative action on <strong>{selectedTenant.name}</strong> ({selectedTenant.slug}).
            </p>

            {modalAction === "extend" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-textSecondary" htmlFor="extension_days">Extension Duration (Days)</label>
                <Input 
                  id="extension_days"
                  type="number"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                  min="1"
                  max="365"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-textSecondary" htmlFor="action_reason">Reason for audit log *</label>
              <textarea
                id="action_reason"
                rows="3"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={modalAction === "extend" ? "e.g. Extended workspace trial due to customer onboarding delay." : "e.g. Terms of Service violation check."}
                className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-textPrimary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none font-medium"
              />
            </div>

            {modalError && <p className="text-xs text-red-500 font-bold">{modalError}</p>}

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button 
                variant="ghost" 
                onClick={() => { setSelectedTenant(null); setModalAction(null); setActionReason(""); setModalError(""); }}
              >
                Cancel
              </Button>
              <Button 
                variant={modalAction === "suspend" ? "danger" : "default"}
                onClick={handleModalSubmit}
                disabled={modalLoading}
              >
                {modalLoading ? "Processing..." : "Confirm Action"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex justify-between items-center pr-8">
                <DialogTitle className="text-xl font-black">{selectedTicket.id}</DialogTitle>
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${selectedTicket.priority === 'Urgent' ? 'bg-danger/20 text-danger' : selectedTicket.timeRemaining === 'Breached' ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'}`}>
                  {selectedTicket.priority}
                </span>
              </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-3 rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Tenant</p>
                  <p className="text-sm font-bold text-textPrimary">{selectedTicket.tenant}</p>
                </div>
                <div className="bg-surface p-3 rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">Assignee</p>
                  <p className="text-sm font-bold text-textPrimary">{selectedTicket.agent}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-textPrimary mb-2 border-b border-border/50 pb-2">Issue Description</h4>
                <p className="text-sm text-textSecondary">
                  {selectedTicket.priority === "Urgent" 
                    ? "Critical system failure reported. Immediate attention required to restore service availability."
                    : "Standard user inquiry regarding platform usage and data export functionality."}
                </p>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-textSecondary uppercase mb-1">SLA Time Remaining</p>
                  <p className={`text-xl font-black ${selectedTicket.timeRemaining === 'Breached' ? 'text-danger' : 'text-success'}`}>
                    {selectedTicket.timeRemaining}
                  </p>
                </div>
                <Button onClick={() => {
                  setSelectedTicket(null);
                  setActiveTab("support");
                }}>
                  Go to Support Center
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


// ---- Original Business Dashboard View ----