import React, { useState, useMemo } from "react";
import Input from "./Input";

export default function SearchFilterBar({ onSearch, onFilter, filterOptions = [], placeholder = "Search..." }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  // Debounce search
  useMemo(() => {
    const handler = setTimeout(() => {
      onSearch?.(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search, onSearch]);

  return (
    <div className="flex gap-2 mb-4">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-xs"
      />
      {filterOptions.length > 0 && (
        <select
          className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
          value={filter}
          onChange={e => {
            setFilter(e.target.value);
            onFilter?.(e.target.value);
          }}
        >
          <option value="">All</option>
          {filterOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
