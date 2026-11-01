import React from 'react';
import { Calendar, Filter, Download, Mail, ChevronDown } from 'lucide-react';

export function RevenueFilters({
  dateRange, setDateRange,
  planTier, setPlanTier,
  paymentStatus, setPaymentStatus,
  tenantStatus, setTenantStatus,
  revenueRange, setRevenueRange,
  region, setRegion,
  subscriptionType, setSubscriptionType,
  onExport,
  onEmailReport
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 py-4 border-b border-white/5 bg-[#0a0a0c]/90 sticky top-0 z-20 backdrop-blur-md">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          Finance Command Center
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase tracking-wider border border-indigo-500/20">
            Real-time Metrics
          </span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">Platform financial telemetry, ledger audits, and subscription health monitoring.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Picker */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white/5 text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer appearance-none pr-8 h-9"
          >
            <option value="30d" className="bg-[#0b0c0e]">Last 30 Days</option>
            <option value="7d" className="bg-[#0b0c0e]">Last 7 Days</option>
            <option value="90d" className="bg-[#0b0c0e]">Last 90 Days</option>
            <option value="1y" className="bg-[#0b0c0e]">Year to Date</option>
          </select>
          <Calendar className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Plan Tier Filter */}
        <div className="relative">
          <select
            value={planTier}
            onChange={(e) => setPlanTier(e.target.value)}
            className="bg-white/5 text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer appearance-none pr-8 h-9"
          >
            <option value="" className="bg-[#0b0c0e]">All Plan Tiers</option>
            <option value="free" className="bg-[#0b0c0e]">Free</option>
            <option value="starter" className="bg-[#0b0c0e]">Starter</option>
            <option value="growth" className="bg-[#0b0c0e]">Growth</option>
            <option value="pro" className="bg-[#0b0c0e]">Pro</option>
            <option value="enterprise" className="bg-[#0b0c0e]">Enterprise</option>
          </select>
          <Filter className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Payment Status Filter */}
        <div className="relative">
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="bg-white/5 text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer appearance-none pr-8 h-9"
          >
            <option value="" className="bg-[#0b0c0e]">All Billing Statuses</option>
            <option value="successful" className="bg-[#0b0c0e]">Successful</option>
            <option value="failed" className="bg-[#0b0c0e]">Failed</option>
            <option value="overdue" className="bg-[#0b0c0e]">Overdue</option>
            <option value="grace" className="bg-[#0b0c0e]">Grace Period</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Tenant Status Filter */}
        <div className="relative">
          <select
            value={tenantStatus}
            onChange={(e) => setTenantStatus(e.target.value)}
            className="bg-white/5 text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer appearance-none pr-8 h-9"
          >
            <option value="" className="bg-[#0b0c0e]">All Tenant States</option>
            <option value="active" className="bg-[#0b0c0e]">Active</option>
            <option value="trial" className="bg-[#0b0c0e]">Trial</option>
            <option value="cancelled" className="bg-[#0b0c0e]">Cancelled</option>
            <option value="suspended" className="bg-[#0b0c0e]">Suspended</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Revenue Range Filter */}
        <div className="relative">
          <select
            value={revenueRange}
            onChange={(e) => setRevenueRange(e.target.value)}
            className="bg-white/5 text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer appearance-none pr-8 h-9"
          >
            <option value="" className="bg-[#0b0c0e]">All Revenue Ranges</option>
            <option value="under_25" className="bg-[#0b0c0e]">&lt; ₹25,000</option>
            <option value="25_50" className="bg-[#0b0c0e]">₹25,000 - ₹50,000</option>
            <option value="over_50" className="bg-[#0b0c0e]">&gt; ₹50,000</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Region Filter */}
        <div className="relative">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-white/5 text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer appearance-none pr-8 h-9"
          >
            <option value="" className="bg-[#0b0c0e]">All Regions</option>
            <option value="tamil_nadu" className="bg-[#0b0c0e]">Tamil Nadu</option>
            <option value="kerala" className="bg-[#0b0c0e]">Kerala</option>
            <option value="karnataka" className="bg-[#0b0c0e]">Karnataka</option>
            <option value="andhra_pradesh" className="bg-[#0b0c0e]">Andhra Pradesh</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Subscription Type Filter */}
        <div className="relative">
          <select
            value={subscriptionType}
            onChange={(e) => setSubscriptionType(e.target.value)}
            className="bg-white/5 text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer appearance-none pr-8 h-9"
          >
            <option value="" className="bg-[#0b0c0e]">All Subscription Types</option>
            <option value="monthly" className="bg-[#0b0c0e]">Monthly Billing</option>
            <option value="annual" className="bg-[#0b0c0e]">Annual Billing</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Export Dropdown options */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          <button
            type="button"
            onClick={() => onExport('csv')}
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-bold hover:bg-white/10 transition-colors h-9"
            title="Export CSV Ledger"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => onExport('excel')}
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-bold hover:bg-white/10 transition-colors h-9"
            title="Export Excel Ledger"
          >
            XLSX
          </button>
          <button
            type="button"
            onClick={() => onExport('pdf')}
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-bold hover:bg-white/10 transition-colors h-9"
            title="Export PDF Report"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={onEmailReport}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-md shadow-indigo-500/10 h-9 flex items-center justify-center"
            title="Email Executive Financial Report"
          >
            <Mail size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
