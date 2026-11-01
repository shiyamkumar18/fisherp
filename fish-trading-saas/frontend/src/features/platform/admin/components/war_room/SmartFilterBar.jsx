import React, { useState, useEffect } from 'react';
import { Search, Filter, Shield, Tag, Clock } from 'lucide-react';
import clsx from 'clsx';

export function SmartFilterBar({ filters, setFilters }) {
  const [localSearch, setLocalSearch] = useState(filters?.search || "");

  // Debounce search typing
  useEffect(() => {
    const delay = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: localSearch }));
    }, 500);
    return () => clearTimeout(delay);
  }, [localSearch, setFilters]);

  const handleSelectChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-[#121215] border-b border-white/5 py-2 px-6 flex items-center gap-3 overflow-x-auto custom-scrollbar shadow-sm">
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-md px-3 py-1.5 shrink-0 min-w-[300px]">
        <Search size={14} className="text-slate-500" />
        <input 
          type="text" 
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search tickets, tenants, or context (CTRL+K)..." 
          className="bg-transparent border-none focus:outline-none text-sm text-slate-200 placeholder:text-slate-500 w-full"
        />
      </div>
      
      <div className="w-px h-4 bg-white/10 mx-2 shrink-0"></div>

      <div className="flex items-center gap-2 shrink-0">
        <FilterButton 
          label="All Active" 
          active={!filters?.is_escalated} 
          onClick={() => handleSelectChange('is_escalated', '')}
        />
        <FilterButton 
          label="Escalated" 
          icon={<Shield size={12} className="text-rose-500" />} 
          active={filters?.is_escalated === 'true'}
          onClick={() => handleSelectChange('is_escalated', 'true')}
        />
      </div>

      <div className="w-px h-4 bg-white/10 mx-2 shrink-0"></div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center bg-black/40 border border-white/5 rounded-md px-2 py-1 text-xs text-slate-300">
          <span className="text-slate-500 mr-2">Priority:</span>
          <select 
            value={filters?.priority || ""}
            onChange={(e) => handleSelectChange('priority', e.target.value)}
            className="bg-transparent border-none focus:outline-none w-24 text-slate-200"
          >
            <option value="" className="bg-[#121215]">All</option>
            <option value="critical" className="bg-[#121215]">Critical</option>
            <option value="high" className="bg-[#121215]">High</option>
            <option value="medium" className="bg-[#121215]">Medium</option>
            <option value="low" className="bg-[#121215]">Low</option>
          </select>
        </div>
        
        <div className="flex items-center bg-black/40 border border-white/5 rounded-md px-2 py-1 text-xs text-slate-300">
          <span className="text-slate-500 mr-2"><Tag size={12} className="inline mr-1" />Category:</span>
          <select 
            value={filters?.category || ""}
            onChange={(e) => handleSelectChange('category', e.target.value)}
            className="bg-transparent border-none focus:outline-none w-28 text-slate-200"
          >
            <option value="" className="bg-[#121215]">All</option>
            <option value="technical" className="bg-[#121215]">Technical</option>
            <option value="billing" className="bg-[#121215]">Billing</option>
            <option value="trading" className="bg-[#121215]">Trading</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ label, active, icon, className, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer",
        active ? "bg-white/10 text-slate-200 border-white/20" : "bg-transparent text-slate-400 border-white/5 hover:bg-white/5",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
