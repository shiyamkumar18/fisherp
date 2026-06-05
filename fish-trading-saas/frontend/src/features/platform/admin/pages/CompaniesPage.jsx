import React, { useState } from "react";
import CompanyTable from "../components/CompanyTable";
import TenantIntelligenceDrawer from "../components/TenantIntelligenceDrawer";

export default function CompaniesPage() {
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tenant Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1">Live monitoring and diagnostic controls for all tenants.</p>
        </div>
      </div>

      {/* Grid wrapper */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <CompanyTable onSelectTenant={(id) => setSelectedTenantId(id)} />
      </div>

      <TenantIntelligenceDrawer 
        tenantId={selectedTenantId} 
        onClose={() => setSelectedTenantId(null)} 
      />
    </div>
  );
}
