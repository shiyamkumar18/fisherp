import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Skeleton from "@/components/ui/skeleton";

export function DataTable({
  columns,
  data,
  sort,
  onSort,
  page,
  total,
  pageSize,
  onPageChange,
  search,
  onSearch,
  actions,
  loading = false,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  renderMobileCard,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(data.map(r => r.id || r.invoice));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      onSelectionChange([...selectedKeys, id]);
    } else {
      onSelectionChange(selectedKeys.filter(k => k !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar + action slot */}
      {(onSearch !== undefined || actions) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {onSearch !== undefined && (
            <Input
              value={search || ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search..."
              className="md:max-w-xs"
            />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table (hidden on mobile if cards are provided) */}
      <div className={`overflow-x-auto rounded-xl border border-border bg-card shadow-sm ${renderMobileCard ? 'hidden md:block' : 'block'}`}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-tableHeader text-xs font-bold uppercase tracking-wider text-textSecondary/80 border-b border-border">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4" 
                    onChange={handleSelectAll}
                    checked={data.length > 0 && selectedKeys.length === data.length}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-textPrimary cursor-pointer"
                      onClick={() => onSort && onSort(column.key)}
                      type="button"
                    >
                      {column.title}
                      {sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )
                      ) : (
                        <ChevronsUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-semibold text-textPrimary">
            {loading ? (
              // Skeleton placeholder rows while fetching
              [...Array(5)].map((_, idx) => (
                <tr key={idx} className="border-t border-border/40">
                  {selectable && <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-sm text-textSecondary"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id || row.invoice || Math.random()}
                  className={`border-b border-border/40 transition-all duration-200 group hover:bg-hover ${selectedKeys.includes(row.id || row.invoice) ? 'bg-primary/5' : ''}`}
                >
                  {selectable && (
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        checked={selectedKeys.includes(row.id || row.invoice)}
                        onChange={(e) => handleSelectRow(row.id || row.invoice, e.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-textPrimary">
                      {column.render ? column.render(row) : (row[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Card View */}
      {renderMobileCard && (
        <div className="md:hidden space-y-4">
          {loading ? (
             [...Array(3)].map((_, idx) => (
               <div key={idx} className="rounded-xl border border-border bg-surface p-4">
                 <Skeleton className="h-6 w-1/2 mb-4" />
                 <Skeleton className="h-4 w-full mb-2" />
                 <Skeleton className="h-4 w-3/4" />
               </div>
             ))
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-sm text-textSecondary bg-card rounded-xl border border-border">
              No records found.
            </div>
          ) : (
            data.map((row) => (
              <div key={row.id || row.invoice || Math.random()}>
                {renderMobileCard(row)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-textSecondary">
          {loading
            ? "Loading..."
            : total > 0
            ? `${total} record${total !== 1 ? "s" : ""} · Page ${page} of ${totalPages}`
            : "No records"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
