import React, { useState, useMemo } from "react";
import Input from "./Input";

/**
 * AdvancedFilterBar — Enterprise-level filter bar for tables/dashboards
 * Supports: search, status, date range, custom fields
 * Usage: <AdvancedFilterBar filters={[...]} onChange={fn} />
 */
export default function AdvancedFilterBar({
  filters = [], // [{ type, key, label, options }]
  onChange,
  initialValues = {},
  className = "",
}) {
  const [values, setValues] = useState(initialValues);

  // Debounce for search fields
  useMemo(() => {
    const handler = setTimeout(() => {
      onChange?.(values);
    }, 400);
    return () => clearTimeout(handler);
  }, [values, onChange]);

  function handleChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={`flex flex-wrap gap-2 mb-4 ${className}`}>
      {filters.map((filter) => {
        if (filter.type === "search") {
          return (
            <Input
              key={filter.key}
              placeholder={filter.label || "Search..."}
              value={values[filter.key] || ""}
              onChange={e => handleChange(filter.key, e.target.value)}
              className="max-w-xs"
            />
          );
        }
        if (filter.type === "select") {
          return (
            <select
              key={filter.key}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={values[filter.key] || ""}
              onChange={e => handleChange(filter.key, e.target.value)}
            >
              <option value="">All</option>
              {filter.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          );
        }
        if (filter.type === "date") {
          return (
            <input
              key={filter.key}
              type="date"
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={values[filter.key] || ""}
              onChange={e => handleChange(filter.key, e.target.value)}
            />
          );
        }
        if (filter.type === "daterange") {
          return (
            <div key={filter.key} className="flex items-center gap-1">
              <input
                type="date"
                className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={values[filter.key + "_start"] || ""}
                onChange={e => handleChange(filter.key + "_start", e.target.value)}
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={values[filter.key + "_end"] || ""}
                onChange={e => handleChange(filter.key + "_end", e.target.value)}
              />
            </div>
          );
        }
        // Add more filter types as needed
        return null;
      })}
    </div>
  );
}
