import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-border/20 text-xs font-bold uppercase tracking-wider text-textSecondary/80">
            <tr>
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
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-textSecondary"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border/40 transition-colors hover:bg-border/10"
                >
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
