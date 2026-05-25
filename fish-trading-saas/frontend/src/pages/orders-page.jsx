import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchOrders } from "@/services/orderService";
import { useDebounce } from "@/hooks/useDebounce";
import { 
  FileText, TrendingUp, AlertTriangle, Truck, DollarSign, 
  Calendar, CheckCircle, Search, HelpCircle 
} from "lucide-react";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const DELIVERY_CLS = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50",
  shipped: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50",
  delivered: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50 dark:border-green-900/50",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/50",
};

const PAYMENT_CLS = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50",
  paid: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50 dark:border-green-900/50",
  partially_paid: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50",
  overdue: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/50",
};

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
    { 
      key: "invoice", 
      title: "Invoice Number", 
      sortable: true,
      render: (row) => <span className="font-bold text-textPrimary">{row.invoice}</span>
    },
    { 
      key: "buyer", 
      title: "Buyer Name", 
      sortable: true,
      render: (row) => <span className="text-textSecondary">{row.buyer}</span>
    },
    {
      key: "status",
      title: "Delivery Status",
      sortable: true,
      render: (row) => {
        const statusKey = (row.status || "pending").toLowerCase();
        const cls = DELIVERY_CLS[statusKey] || DELIVERY_CLS.pending;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}>
            {row.status}
          </span>
        );
      },
    },
    { 
      key: "paymentStatus", 
      title: "Payment Status", 
      sortable: true, 
      render: (row) => {
        const pKey = (row.paymentStatus || "pending").toLowerCase();
        const cls = PAYMENT_CLS[pKey] || PAYMENT_CLS.pending;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}>
            {row.paymentStatus}
          </span>
        );
      }
    },
    {
      key: "amount",
      title: "Gross Value",
      sortable: true,
      render: (row) => (
        <span className="font-bold text-textPrimary">
          {formatINR(row.amount)}
        </span>
      ),
    },
  ];

  const onSort = (key) => {
    setSort((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  // KPI Calculations
  const grossSalesVal = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Orders Log</h2>
        <p className="text-xs text-textSecondary">View historical sales entries and track cold-chain delivery status.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Total Orders</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{total}</span>
            <FileText className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Delivered Orders</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-success">
              {rows.filter(r => r.status?.toLowerCase() === "delivered").length}
            </span>
            <CheckCircle className="h-5 w-5 text-success opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">In-Transit</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-cyan-500">
              {rows.filter(r => r.status?.toLowerCase() === "shipped").length}
            </span>
            <Truck className="h-5 w-5 text-cyan-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Page Value</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{formatINR(grossSalesVal)}</span>
            <DollarSign className="h-5 w-5 text-emerald-500 opacity-65" />
          </div>
        </Card>
      </div>

      <Card hoverEffect={false}>
        {error ? (
          <div className="flex items-center gap-2 text-danger bg-danger/5 border border-danger/10 p-4 rounded-xl mb-4">
            <AlertTriangle size={18} />
            <p className="font-bold">{error}</p>
          </div>
        ) : null}

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
          loading={loading}
        />
      </Card>
    </div>
  );
}
