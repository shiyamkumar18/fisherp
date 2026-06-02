import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { fetchOrders } from "@/services/orderService";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { 
  FileText, TrendingUp, AlertTriangle, Truck, DollarSign, 
  Calendar, CheckCircle, Search, HelpCircle, X, SlidersHorizontal,
  Download, Filter, ChevronDown, Check, Phone, MessageCircle, MoreHorizontal,
  Eye, CreditCard, Navigation, User, ChevronRight, MapPin, Trash2, Mail
} from "lucide-react";

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const DELIVERY_CLS = {
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  shipped: "bg-blue-100 text-blue-700 border border-blue-200",
  in_transit: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  delivered: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  delayed: "bg-rose-100 text-rose-700 border border-rose-200",
  cancelled: "bg-slate-100 text-slate-700 border border-slate-200",
};

const PAYMENT_CLS = {
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  paid: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  partially_paid: "bg-blue-100 text-blue-700 border border-blue-200",
  overdue: "bg-rose-100 text-rose-700 border border-rose-200",
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
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: "all",
    deliveryStatus: "all",
    paymentStatus: "all",
    amountRange: "all"
  });
  
  const [selectedKeys, setSelectedKeys] = useState([]);
  const { canViewForm, canDelete } = usePermission();
  const canView = canViewForm("orders");
  const hasDeletePermission = canDelete("orders");

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

  const [selectedOrder, setSelectedOrder] = useState(null);

  const columns = [
    { 
      key: "invoice", 
      title: "Invoice", 
      sortable: true,
      render: (row) => (
        <button 
          onClick={() => setSelectedOrder(row)}
          className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5"
        >
          {row.invoice} <ChevronRight size={14} className="opacity-50" />
        </button>
      )
    },
    { 
      key: "createdAt", 
      title: "Date", 
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700">{new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    { 
      key: "buyer", 
      title: "Customer", 
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-slate-200">
            {row.buyer ? row.buyer.charAt(0) : "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800">{row.buyer}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {row.phone && (
                <button className="text-slate-400 hover:text-indigo-500 transition-colors" title="Call">
                  <Phone size={12} />
                </button>
              )}
              {row.phone && (
                <button className="text-slate-400 hover:text-emerald-500 transition-colors" title="WhatsApp">
                  <MessageCircle size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: "status",
      title: "Logistics",
      sortable: true,
      render: (row) => {
        const statusKey = (row.status || "pending").toLowerCase();
        const cls = DELIVERY_CLS[statusKey] || DELIVERY_CLS.pending;
        return (
          <div className="flex flex-col items-start gap-1">
            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${cls}`}>
              {row.status}
            </span>
            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
              <MapPin size={10} /> {row.destination || 'Pending Route'}
            </span>
          </div>
        );
      },
    },
    { 
      key: "paymentStatus", 
      title: "Payment", 
      sortable: true, 
      render: (row) => {
        const pKey = (row.paymentStatus || "pending").toLowerCase();
        const cls = PAYMENT_CLS[pKey] || PAYMENT_CLS.pending;
        const progress = pKey === 'paid' ? 100 : (pKey === 'partially_paid' ? 50 : 0);
        return (
          <div className="w-24">
            <div className="flex justify-between items-center mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${cls.split(' ')[1]}`}>
                {row.paymentStatus}
              </span>
              <span className="text-[10px] font-bold text-slate-400">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${cls.split(' ')[0]}`} style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        );
      }
    },
    {
      key: "amount",
      title: "Financials",
      sortable: true,
      render: (row) => {
        const pKey = (row.paymentStatus || "pending").toLowerCase();
        const outstanding = pKey === 'paid' ? 0 : (pKey === 'partially_paid' ? row.amount / 2 : row.amount);
        return (
          <div className="flex flex-col text-right">
            <span className="font-black text-slate-800">
              {formatINR(row.amount)}
            </span>
            {outstanding > 0 && (
              <span className="text-[10px] font-bold text-amber-600 mt-0.5">
                Due: {formatINR(outstanding)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      title: "",
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setSelectedOrder(row)} title="View Details">
            <Eye size={16} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Collect Payment">
            <CreditCard size={16} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" title="More">
            <MoreHorizontal size={16} />
          </Button>
        </div>
      )
    }
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 hidden md:grid">
        <Card className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Total Orders</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-800 tracking-tight">{total}</span>
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FileText size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
              <span className="text-emerald-600 flex items-center"><TrendingUp size={14} className="mr-0.5"/> 12%</span>
              <span className="text-slate-400">vs last month</span>
            </div>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Delivered</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">
                {rows.filter(r => r.status?.toLowerCase() === "delivered").length}
              </span>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-400">
              <span>Today: <span className="text-slate-700">2</span></span>
              <span>Success: <span className="text-emerald-600">92%</span></span>
            </div>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">In Transit</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-cyan-600 tracking-tight">
                {rows.filter(r => r.status?.toLowerCase() === "shipped" || r.status?.toLowerCase() === "in_transit").length}
              </span>
              <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Truck size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-400">
              <span>ETA: <span className="text-slate-700">Today</span></span>
              <span>Delayed: <span className="text-rose-500">1</span></span>
            </div>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Page Value</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-800 tracking-tight">{formatINR(grossSalesVal)}</span>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-400">
              <span>Collected: <span className="text-emerald-600">{formatINR(grossSalesVal * 0.7)}</span></span>
              <span>Pending: <span className="text-amber-600">{formatINR(grossSalesVal * 0.3)}</span></span>
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced Search & Filters Row */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between relative z-20">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by invoice, customer, phone, status, or ₹ amount..." 
            className="w-full h-12 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 font-bold whitespace-nowrap border-slate-200 h-12 rounded-xl transition-colors ${showFilters ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal size={16} /> Filters
          </Button>
          <Button variant="outline" className="gap-2 font-bold whitespace-nowrap text-slate-600 border-slate-200 hover:bg-slate-50 h-12 rounded-xl">
            <Download size={16} /> Export
          </Button>
        </div>
      </div>
      
      {/* Expanded Filter Bar */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 animate-in fade-in slide-in-from-top-2 duration-200 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
            <select 
              value={filters.dateRange} onChange={e => setFilters({...filters, dateRange: e.target.value})}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Status</label>
            <select 
              value={filters.deliveryStatus} onChange={e => setFilters({...filters, deliveryStatus: e.target.value})}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">Any Status</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="shipped">In Transit</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Status</label>
            <select 
              value={filters.paymentStatus} onChange={e => setFilters({...filters, paymentStatus: e.target.value})}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">Any Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Range</label>
            <select 
              value={filters.amountRange} onChange={e => setFilters({...filters, amountRange: e.target.value})}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">Any Amount</option>
              <option value="0-10000">₹0 – ₹10k</option>
              <option value="10000-50000">₹10k – ₹50k</option>
              <option value="50000+">₹50k+</option>
            </select>
          </div>
        </div>
      )}
      
      {/* Bulk Actions Toolbar */}
      {selectedKeys.length > 0 && (
        <div className="bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 p-4 flex items-center justify-between text-white animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">{selectedKeys.length}</span>
            <span className="font-bold">orders selected</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white whitespace-nowrap h-9 px-3 gap-2 text-xs">
              <CheckCircle size={14} /> Mark Delivered
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white whitespace-nowrap h-9 px-3 gap-2 text-xs">
              <Mail size={14} /> Send Invoice
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white whitespace-nowrap h-9 px-3 gap-2 text-xs hidden sm:flex">
              <CreditCard size={14} /> Reminder
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white whitespace-nowrap h-9 px-3 gap-2 text-xs hidden sm:flex">
              <Download size={14} /> Export
            </Button>
            {hasDeletePermission && (
              <Button variant="ghost" className="text-rose-200 hover:bg-rose-500 hover:text-white whitespace-nowrap h-9 px-3 gap-2 text-xs ml-2">
                <Trash2 size={14} /> Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <Card hoverEffect={false} className="overflow-hidden">
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
          selectable={true}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          renderMobileCard={(row) => {
            const statusKey = (row.status || "pending").toLowerCase();
            const dcls = DELIVERY_CLS[statusKey] || DELIVERY_CLS.pending;
            const pKey = (row.paymentStatus || "pending").toLowerCase();
            const pcls = PAYMENT_CLS[pKey] || PAYMENT_CLS.pending;
            
            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <button onClick={() => setSelectedOrder(row)} className="font-black text-indigo-600 text-lg flex items-center gap-1 hover:underline">
                      {row.invoice}
                    </button>
                    <p className="text-sm font-bold text-slate-700">{row.buyer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800 text-lg">{formatINR(row.amount)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(row.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${dcls}`}>
                    {row.status}
                  </span>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${pcls}`}>
                    {row.paymentStatus}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" className="w-full text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100 font-bold h-10 text-xs" onClick={() => setSelectedOrder(row)}>
                    View Details
                  </Button>
                  <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold h-10 text-xs">
                    Collect
                  </Button>
                </div>
              </div>
            );
          }}
        />
      </Card>
      
      {/* Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedOrder(null)}
          ></div>
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Order Details</p>
                <h2 className="text-2xl font-black text-slate-800">{selectedOrder.invoice}</h2>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Summary Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Created At</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Staff</p>
                  <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <User size={14} className="text-indigo-500" /> {selectedOrder.staff || 'System'}
                  </p>
                </div>
              </div>

              {/* Delivery Timeline */}
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Truck size={14} className="text-indigo-500" /> Delivery Lifecycle
                </h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-3.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                  
                  <div className="relative flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 border-4 border-white text-white flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">Order Created</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm ${['shipped', 'in_transit', 'delivered'].includes(selectedOrder.status?.toLowerCase()) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {['shipped', 'in_transit', 'delivered'].includes(selectedOrder.status?.toLowerCase()) ? <Check size={12} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${['shipped', 'in_transit', 'delivered'].includes(selectedOrder.status?.toLowerCase()) ? 'text-slate-800' : 'text-slate-400'}`}>Dispatched / In Transit</p>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm ${selectedOrder.status?.toLowerCase() === 'delivered' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {selectedOrder.status?.toLowerCase() === 'delivered' ? <Check size={12} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${selectedOrder.status?.toLowerCase() === 'delivered' ? 'text-indigo-600' : 'text-slate-400'}`}>Delivered Successfully</p>
                    </div>
                  </div>
                  
                </div>
              </div>
              
              {/* Invoice Preview */}
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-indigo-500" /> Payment & Items
                </h3>
                <div className="bg-slate-900 rounded-2xl p-5 text-white">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                      <p className="text-2xl font-black">{formatINR(selectedOrder.amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${selectedOrder.paymentStatus?.toLowerCase() === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-700/50">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-300">Fish Items (placeholder)</span>
                      <span className="font-bold">{formatINR(selectedOrder.amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            
            {/* Actions */}
            <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
              <Button className="w-full font-bold h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                Collect Payment
              </Button>
              <Button variant="outline" className="w-full font-bold h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2">
                <Download size={18} /> Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
