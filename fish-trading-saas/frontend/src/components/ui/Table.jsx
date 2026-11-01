import React from "react";
import clsx from "clsx";

export default function Table({ 
  columns, 
  data, 
  className = "", 
  emptyText = "No data available", 
  onRowClick, 
  actions,
  stickyHeader = false
}) {
  return (
    <div className={clsx("bg-surface border border-border rounded-xl shadow-sm overflow-hidden", className)}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className={clsx(
            "bg-surfaceHover/50 text-xs text-textSecondary uppercase tracking-wider border-b border-border/50",
            stickyHeader && "sticky top-0 z-10 backdrop-blur-sm bg-surfaceHover/90"
          )}>
            <tr>
              {columns.map((col) => (
                <th 
                  key={typeof col === 'string' ? col : col.key} 
                  className={clsx(
                    "px-6 py-4 font-bold",
                    typeof col !== 'string' && col.align === 'right' && "text-right",
                    typeof col !== 'string' && col.align === 'center' && "text-center",
                  )}
                >
                  {typeof col === 'string' ? col : col.label}
                </th>
              ))}
              {actions && <th className="px-6 py-4 font-bold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-textSecondary">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className={clsx(
                    "hover:bg-surfaceHover/30 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                >
                  {columns.map((col, j) => {
                    const key = typeof col === 'string' ? col : col.key;
                    const render = typeof col !== 'string' && col.render ? col.render : null;
                    return (
                      <td 
                        key={j} 
                        className={clsx(
                          "px-6 py-4 font-medium text-textPrimary",
                          typeof col !== 'string' && col.align === 'right' && "text-right",
                          typeof col !== 'string' && col.align === 'center' && "text-center",
                          typeof col !== 'string' && col.truncate && "truncate max-w-[200px]"
                        )}
                      >
                        {render ? render(row[key], row, i) : row[key]}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {actions(row, i)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
