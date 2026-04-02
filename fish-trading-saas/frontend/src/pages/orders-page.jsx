import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchOrders } from "@/services/orderService";
import { useDebounce } from "@/hooks/useDebounce";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);
  const [sort, setSort] = useState({ key: "createdAt", direction: "desc" });

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetchOrders({ page, search: debouncedQuery })
      .then((payload) => {
        setRows(payload.results);
        setTotal(payload.count);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, debouncedQuery]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue = a[sort.key];
      const bValue = b[sort.key];
      if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sort]);

  const columns = [
    { key: "invoice", title: "Invoice", sortable: true },
    { key: "buyer", title: "Buyer", sortable: true },
    {
      key: "status",
      title: "Delivery",
      sortable: true,
      render: (row) => <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{row.status}</span>,
    },
    { key: "paymentStatus", title: "Payment", sortable: true },
    {
      key: "amount",
      title: "Amount",
      sortable: true,
      render: (row) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(row.amount),
    },
  ];

  const onSort = (key) => {
    setSort((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl">Orders</h2>
      <Card>
        {error ? <p className="text-red-600">{error}</p> : null}
        {loading ? <p className="text-slate-500">Loading orders...</p> : null}
        {!loading && !error ? (
          <DataTable
            columns={columns}
            data={sortedRows}
            sort={sort}
            onSort={onSort}
            page={page}
            total={total}
            pageSize={25}
            onPageChange={setPage}
            search={query}
            onSearch={setQuery}
            actions={<Button variant="secondary">New Order</Button>}
          />
        ) : null}
      </Card>
    </div>
  );
}
