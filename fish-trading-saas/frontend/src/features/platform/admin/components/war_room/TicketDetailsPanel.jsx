import React from 'react';
import { Building, Globe, Layers, AlertCircle, HelpCircle, User, Zap, Info, ShieldAlert, Check } from 'lucide-react';
import clsx from 'clsx';

export function TicketDetailsPanel({
  tenantId,
  setTenantId,
  tenants,
  fetchingTenants,
  category,
  setCategory,
  issueType,
  setIssueType,
  affectedModule,
  setAffectedModule,
  environment,
  setEnvironment,
  priority,
  setPriority,
  severity,
  setSeverity,
  source,
  setSource,
  channel,
  setChannel,
  flags,
  toggleFlag,
  branch,
  setBranch,
  subscriptionId,
  setSubscriptionId,
  department,
  setDepartment,
  escalationLevel,
  setEscalationLevel,
  estimatedSLA,
  intelligence
}) {
  const isOverdue = intelligence?.subscription?.outstanding_dues > 0;

  return (
    <div className="col-span-12 lg:col-span-4 bg-[#0d0e12] border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar space-y-6 flex flex-col max-h-[calc(92vh-178px)]">
      <div>
        <h3 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
          <ShieldAlert size={16} className="text-indigo-400" /> Ticket Details
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">Classification, routing & issue metadata</p>
      </div>

      {/* GROUP 1: Tenant Context */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
          <Building size={12} className="text-slate-500" /> Group 1 — Tenant Context
        </h4>
        
        {/* Target Tenant */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            Target Tenant
            <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className={clsx(
                "w-full bg-white/[0.02] border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 h-11 transition-all appearance-none cursor-pointer pr-8",
                isOverdue ? "border-rose-500/50" : "border-white/10"
              )}
              disabled={fetchingTenants}
            >
              <option value="" className="bg-[#0b0c0e]">-- Internal Platform Ticket --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#0b0c0e]">{t.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-3.5 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
          </div>
          {isOverdue && (
            <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-1">
              <AlertCircle size={10} /> Tenant has outstanding payment ($ {intelligence.subscription.outstanding_dues})
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Branch */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g. BR-001"
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11 transition-all"
            />
          </div>

          {/* Subscription ID */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              Subscription ID
              <span className="group relative cursor-help text-slate-500 hover:text-slate-300">
                <HelpCircle size={11} />
                <span className="pointer-events-none absolute bottom-full right-0 mb-1 w-40 rounded bg-slate-900 border border-white/10 p-1.5 text-[9px] font-normal text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-20">
                  Subscription identifier synchronized from billing service metadata.
                </span>
              </span>
            </label>
            <input
              type="text"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              placeholder="e.g. SUB-9021"
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Environment */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Environment</label>
            <div className="relative">
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11 appearance-none cursor-pointer pr-8"
              >
                <option value="Production" className="bg-[#0b0c0e]">Production</option>
                <option value="Staging" className="bg-[#0b0c0e]">Staging</option>
                <option value="Testing" className="bg-[#0b0c0e]">Testing</option>
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
            </div>
          </div>

          {/* Affected Module */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Affected Module</label>
            <div className="relative">
              <select
                value={affectedModule}
                onChange={(e) => setAffectedModule(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11 appearance-none cursor-pointer pr-8"
              >
                <option value="" className="bg-[#0b0c0e]">-- Select --</option>
                <option value="Dashboard" className="bg-[#0b0c0e]">Dashboard</option>
                <option value="Payments" className="bg-[#0b0c0e]">Payments</option>
                <option value="Inventory" className="bg-[#0b0c0e]">Inventory</option>
                <option value="Cold Storage" className="bg-[#0b0c0e]">Cold Storage</option>
                <option value="API" className="bg-[#0b0c0e]">API</option>
                <option value="Permissions" className="bg-[#0b0c0e]">Permissions</option>
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
            </div>
          </div>
        </div>
      </div>

      {/* GROUP 2: Issue Classification */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
          <Globe size={12} className="text-slate-500" /> Group 2 — Classification
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11"
            >
              <option value="technical" className="bg-[#0b0c0e]">Technical Issue</option>
              <option value="billing" className="bg-[#0b0c0e]">Billing</option>
              <option value="trading" className="bg-[#0b0c0e]">Trading</option>
              <option value="voice" className="bg-[#0b0c0e]">Voice Assistant</option>
              <option value="staff" className="bg-[#0b0c0e]">Staff & Permissions</option>
              <option value="security" className="bg-[#0b0c0e]">Security</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Issue Type</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11"
            >
              <option value="bug" className="bg-[#0b0c0e]">Bug</option>
              <option value="incident" className="bg-[#0b0c0e]">Incident</option>
              <option value="billing" className="bg-[#0b0c0e]">Billing</option>
              <option value="feature_request" className="bg-[#0b0c0e]">Feature Request</option>
              <option value="performance" className="bg-[#0b0c0e]">Performance</option>
              <option value="access_problem" className="bg-[#0b0c0e]">Access Problem</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
              Priority
              {priority === 'critical' && <span className="text-rose-400 text-[9px] font-bold uppercase animate-pulse">Critical</span>}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11"
            >
              <option value="low" className="bg-[#0b0c0e]">Low</option>
              <option value="medium" className="bg-[#0b0c0e]">Medium</option>
              <option value="high" className="bg-[#0b0c0e]">High</option>
              <option value="critical" className="bg-[#0b0c0e]">Critical</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11"
            >
              <option value="low" className="bg-[#0b0c0e]">Low Impact</option>
              <option value="medium" className="bg-[#0b0c0e]">Medium Impact</option>
              <option value="high" className="bg-[#0b0c0e]">High Impact</option>
              <option value="critical" className="bg-[#0b0c0e]">Critical (Down)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11"
            >
              <option value="Web Portal" className="bg-[#0b0c0e]">Web Portal</option>
              <option value="Mobile App" className="bg-[#0b0c0e]">Mobile App</option>
              <option value="API" className="bg-[#0b0c0e]">API</option>
              <option value="System Alert" className="bg-[#0b0c0e]">System Alert</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11"
            >
              <option value="Support UI" className="bg-[#0b0c0e]">Support UI</option>
              <option value="Email" className="bg-[#0b0c0e]">Email</option>
              <option value="Phone" className="bg-[#0b0c0e]">Phone</option>
              <option value="Chat" className="bg-[#0b0c0e]">Chat</option>
            </select>
          </div>
        </div>
      </div>

      {/* GROUP 3: Routing */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
          <User size={12} className="text-slate-500" /> Group 3 — Routing
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              Auto Assignment
              <span className="group relative cursor-help text-indigo-400">
                <Info size={11} />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 rounded bg-slate-900 border border-white/10 p-1.5 text-[9px] font-normal text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-20 text-center">
                  Predictive support tier routing based on issue category.
                </span>
              </span>
            </label>
            <input
              type="text"
              readOnly
              value={
                category === 'billing' ? "Billing Admin" :
                category === 'technical' ? "Support L2" :
                priority === 'critical' ? "Support L3 Manager" : "Support L1"
              }
              className="w-full bg-indigo-500/5 border border-indigo-500/20 text-indigo-300 rounded-lg px-3 py-2 text-xs font-medium h-11"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Escalation Level</label>
            <select
              value={escalationLevel}
              onChange={(e) => setEscalationLevel(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 h-11"
            >
              <option value="L1" className="bg-[#0b0c0e]">L1 Support</option>
              <option value="L2" className="bg-[#0b0c0e]">L2 Operations</option>
              <option value="L3" className="bg-[#0b0c0e]">L3 Engineering</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Estimated SLA</label>
            <div className="w-full bg-white/[0.01] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-400 h-11 flex items-center font-mono">
              {estimatedSLA.replace('SLA: ', '')}
            </div>
          </div>
        </div>
      </div>

      {/* GROUP 4: Impact Analysis */}
      <div className="space-y-3 shrink-0">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1.5">
          <Zap size={12} className="text-slate-500" /> Group 4 — Impact Flags
        </h4>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {[
            { label: 'Production Impact', key: 'production_impact' },
            { label: 'Billing Impact', key: 'financial_impact' },
            { label: 'Inventory Impact', key: 'inventory_impact' },
            { label: 'Order Impact', key: 'order_impact' },
            { label: 'Voice Impact', key: 'voice_failure' },
            { label: 'Customer Impact', key: 'bug_reproducible' },
          ].map(({ label, key }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleFlag(key)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 border rounded-lg text-left transition-all h-9 select-none",
                flags[key] 
                  ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-200" 
                  : "bg-white/[0.01] border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-300"
              )}
            >
              <div className={clsx(
                "w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0",
                flags[key] ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-600 bg-black/20"
              )}>
                {flags[key] && <Check size={10} strokeWidth={3} />}
              </div>
              <span className="text-[10px] font-medium tracking-tight truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
