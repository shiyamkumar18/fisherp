import React, { useEffect, useState, useMemo } from "react";
import { 
  Package, Plus, Search, Tag, Settings, 
  Layers, Info, AlertTriangle, Trash2, CheckCircle, HelpCircle,
  TrendingUp, Download, X, SlidersHorizontal, Image as ImageIcon,
  Archive, Copy, MoreHorizontal, Activity, ArrowRight, Eye
} from "lucide-react";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchFishTypes, createFishType, deleteProduct } from "@/services/productService";
import { useToast } from "@/components/shared/toast-provider";
import { usePermission } from "@/hooks/usePermission";
import { DataTable } from "@/components/shared/data-table";

export default function ProductsPage() {
  const [fishCatalog, setFishCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { push: toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canEditForm, canDelete } = usePermission();
  const isEditable = canEditForm("catalog");

  // Form states
  const [name, setName] = useState("");
  const [tamilName, setTamilName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [aliasNames, setAliasNames] = useState("");
  const [category, setCategory] = useState("1"); // Category ID
  const [status, setStatus] = useState("active");
  const [unitType, setUnitType] = useState("box");
  const [boxWeight, setBoxWeight] = useState(20);
  const [minPurchase, setMinPurchase] = useState(1);
  const [spoilage, setSpoilage] = useState(5);
  const [expiryDays, setExpiryDays] = useState(3);
  const [coldStorage, setColdStorage] = useState(true);
  
  // Market states
  const [marketTracking, setMarketTracking] = useState(true);
  const [trackedCities, setTrackedCities] = useState("Chennai, Kochi");
  const [margin, setMargin] = useState(15);
  const [lowPriceAlert, setLowPriceAlert] = useState(200);
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    unit: "all",
    weight: "all"
  });
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchFishTypes();
      setFishCatalog(data);
    } catch (e) {
      setError(e.message);
      toast({ message: "Failed to load product catalog.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleOpenAdd = () => {
    setName("");
    setTamilName("");
    setScientificName("");
    setAliasNames("");
    setCategory("1");
    setStatus("active");
    setUnitType("box");
    setBoxWeight(20);
    setMinPurchase(1);
    setSpoilage(5);
    setExpiryDays(3);
    setColdStorage(true);
    setMarketTracking(true);
    setTrackedCities("Chennai, Kochi");
    setMargin(15);
    setLowPriceAlert(200);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ message: "Product name is required.", variant: "error" });
      return;
    }
    setIsSubmitting(true);
    if (unitType === "box" && boxWeight <= 0) {
      toast({ message: "Box weight must be greater than zero.", variant: "error" });
      return;
    }

    const payload = {
      name,
      category: Number(category),
      unit_type: unitType,
      box_weight_kg: unitType === "box" ? Number(boxWeight) : 1.0,
      is_active: true
    };

    try {
      await createFishType(payload);
      toast({ message: "Product registered in catalog successfully!" });
      setModalOpen(false);
      loadCatalog();
    } catch (err) {
      toast({ message: err?.message || "Error registering product.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this product from the catalog?")) return;
    setIsDeleting(true);
    try {
      await deleteProduct(id);
      toast({ message: "Product de-registered from catalog." });
      loadCatalog();
    } catch (e) {
      toast({ message: e?.message || "Failed to delete product.", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    let result = fishCatalog.filter(item => {
      const matchSearch = item.name?.toLowerCase().includes(search.toLowerCase()) ||
                          item.category_name?.toLowerCase().includes(search.toLowerCase()) ||
                          item.unit_type?.toLowerCase().includes(search.toLowerCase());
      
      const matchCat = filters.category === 'all' || item.category_name?.toLowerCase() === filters.category.toLowerCase();
      const matchUnit = filters.unit === 'all' || item.unit_type?.toLowerCase() === filters.unit.toLowerCase();
      
      let matchWeight = true;
      if (filters.weight !== 'all' && item.box_weight_kg) {
        if (filters.weight === '0-10') matchWeight = item.box_weight_kg <= 10;
        else if (filters.weight === '10-20') matchWeight = item.box_weight_kg > 10 && item.box_weight_kg <= 20;
        else if (filters.weight === '20+') matchWeight = item.box_weight_kg > 20;
      }

      return matchSearch && matchCat && matchUnit && matchWeight;
    });

    return result.sort((a, b) => {
      let valA = a[sort.key] || '';
      let valB = b[sort.key] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [fishCatalog, search, filters, sort]);

  const pagedCatalog = useMemo(() => {
    return filteredCatalog.slice((page - 1) * 25, page * 25);
  }, [filteredCatalog, page]);

  // Derived KPIs
  const totalSpecies = fishCatalog.length;
  const boxUnitsCount = fishCatalog.filter(f => f.unit_type === "box").length;
  const avgPackSize = totalSpecies > 0 ? (fishCatalog.reduce((sum, f) => sum + (f.box_weight_kg || 0), 0) / totalSpecies).toFixed(1) : 0;
  
  // Data Table Columns
  const columns = [
    {
      key: "name",
      title: "Species Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hover flex items-center justify-center shrink-0 border border-border">
            <ImageIcon size={18} className="text-textSecondary/70" />
          </div>
          <div className="flex flex-col">
            <button onClick={() => setSelectedProduct(row)} className="font-black text-primary hover:text-indigo-800 transition-colors text-left text-[13px]">
              {row.name}
            </button>
            <span className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider">{row.tamil_name || "Tamil Name N/A"}</span>
          </div>
        </div>
      )
    },
    {
      key: "category_name",
      title: "Category",
      sortable: true,
      render: (row) => {
        const cat = (row.category_name || "General").toLowerCase();
        let color = "bg-hover text-textPrimary border-border";
        if (cat.includes("sea")) color = "bg-blue-100 text-blue-700 border-blue-200";
        if (cat.includes("fresh")) color = "bg-cyan-100 text-cyan-700 border-cyan-200";
        if (cat.includes("shell") || cat.includes("premium")) color = "bg-purple-100 text-purple-700 border-purple-200";
        
        return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${color}`}>{row.category_name || "General"}</span>;
      }
    },
    {
      key: "unit_type",
      title: "Trading Unit",
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center rounded px-2 py-1 bg-hover border border-border text-xs font-bold text-textSecondary capitalize">
          {row.unit_type_display || row.unit_type}
        </span>
      )
    },
    {
      key: "box_weight_kg",
      title: "Standard Weight",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-textPrimary">{row.box_weight_kg ? `${row.box_weight_kg} KG` : "—"}</span>
          {row.unit_type === "box" && <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">Editable</span>}
        </div>
      )
    },
    {
      key: "status",
      title: "Status",
      sortable: false,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-success/10 text-success border border-emerald-200">
          <div className="w-1.5 h-1.5 rounded-full bg-success"></div> Active
        </span>
      )
    },
    {
      key: "actions",
      title: "",
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-1 transition-opacity">
          <Button variant="ghost" size="iconSm" className="text-textSecondary/70 hover:text-primary hover:bg-primary/10" onClick={() => setSelectedProduct(row)} title="View Details">
            <Eye size={16} />
          </Button>
          {isEditable && (
            <Button variant="ghost" size="iconSm" className="text-textSecondary/70 hover:text-success hover:bg-success/10" title="Edit">
              <Settings size={16} />
            </Button>
          )}
          {canDelete("catalog") && (
            <Button variant="ghost" size="iconSm" className="text-textSecondary/70 hover:text-danger hover:bg-danger/10" onClick={() => handleDelete(row.id)} title="Archive">
              <Archive size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Products Catalog</h2>
          <p className="text-xs text-textSecondary">Configure fish species taxonomy and unit weights for trading batches.</p>
        </div>
        {isEditable && (
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Register Species
        </Button>
        )}
      </div>

      {/* KPI summaries */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-black uppercase tracking-widest text-textSecondary/70 mb-1">Catalog Species</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-textPrimary tracking-tight">{totalSpecies}</span>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Package size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <span className="text-success flex items-center"><TrendingUp size={14} className="mr-0.5"/> 2</span>
              <span>added this month</span>
            </div>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-black uppercase tracking-widest text-textSecondary/70 mb-1">Box Weight Units</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-textPrimary tracking-tight">{boxUnitsCount}</span>
              <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Layers size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <span>Most used:</span>
              <span className="text-cyan-600">20KG Box</span>
            </div>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-black uppercase tracking-widest text-textSecondary/70 mb-1">Average Pack Size</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-textPrimary tracking-tight">{avgPackSize} KG</span>
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Activity size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-textSecondary">
              <span>Most traded:</span>
              <span className="text-purple-600">Vanjaram</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced Search & Filters */}
      <div className="bg-card rounded-2xl shadow-sm border border-border p-4 flex flex-col md:flex-row gap-4 items-center justify-between relative z-20">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary/70 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search fish name, category, trading unit..." 
            className="w-full h-12 pl-12 pr-10 bg-card border border-border rounded-xl font-medium text-sm text-textPrimary focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-textSecondary/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-textSecondary/70 hover:text-textSecondary">
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 font-bold whitespace-nowrap border-border h-12 rounded-xl transition-colors ${showFilters ? 'bg-primary/10 text-primaryHover border-indigo-200' : 'text-textSecondary hover:bg-card'}`}
          >
            <SlidersHorizontal size={16} /> Filters
          </Button>
        </div>
      </div>
      
      {/* Expanded Filter Bar */}
      {showFilters && (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 animate-in fade-in slide-in-from-top-2 duration-200 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Category</label>
            <select 
              value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}
              className="w-full h-10 px-3 bg-card border border-border rounded-lg text-sm font-semibold text-textPrimary outline-none focus:border-primary"
            >
              <option value="all">All Categories</option>
              <option value="sea fish">Sea Fish</option>
              <option value="freshwater fish">Freshwater</option>
              <option value="shellfish">Shellfish</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Status</label>
            <select 
              value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
              className="w-full h-10 px-3 bg-card border border-border rounded-lg text-sm font-semibold text-textPrimary outline-none focus:border-primary"
            >
              <option value="all">Any Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Trading Unit</label>
            <select 
              value={filters.unit} onChange={e => setFilters({...filters, unit: e.target.value})}
              className="w-full h-10 px-3 bg-card border border-border rounded-lg text-sm font-semibold text-textPrimary outline-none focus:border-primary"
            >
              <option value="all">All Units</option>
              <option value="box">Box</option>
              <option value="kg">KG</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">Weight Range</label>
            <select 
              value={filters.weight} onChange={e => setFilters({...filters, weight: e.target.value})}
              className="w-full h-10 px-3 bg-card border border-border rounded-lg text-sm font-semibold text-textPrimary outline-none focus:border-primary"
            >
              <option value="all">Any Weight</option>
              <option value="0-10">0–10 KG</option>
              <option value="10-20">10–20 KG</option>
              <option value="20+">20+ KG</option>
            </select>
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
          data={pagedCatalog}
          sort={sort}
          onSort={(key) => setSort(s => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))}
          page={page}
          total={filteredCatalog.length}
          pageSize={25}
          onPageChange={setPage}
          loading={loading}
          renderMobileCard={(row) => (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-hover flex items-center justify-center shrink-0 border border-border">
                <ImageIcon size={24} className="text-textSecondary/70" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-textPrimary text-lg leading-tight mb-1">{row.name}</h3>
                <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3">{row.category_name || "General"} · {row.box_weight_kg ? `${row.box_weight_kg} KG` : "—"}</p>
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-success/10 text-success border border-emerald-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div> Active
                  </span>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => setSelectedProduct(row)}>Details</Button>
                </div>
              </div>
            </div>
          )}
        />
      </Card>
      
      {/* Product Details Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-card/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedProduct(null)}
          ></div>
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/50 bg-card">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center shrink-0 border border-border shadow-sm">
                  <ImageIcon size={28} className="text-textSecondary/70" />
                </div>
                <div>
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">{selectedProduct.category_name || "General"}</p>
                  <h2 className="text-2xl font-black text-textPrimary leading-tight mb-1">{selectedProduct.name}</h2>
                  <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">{selectedProduct.tamil_name || "Tamil Name N/A"}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-textSecondary hover:bg-hover hover:text-textPrimary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Settings Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider mb-1">Trading Unit</p>
                  <p className="font-bold text-textPrimary text-sm capitalize">{selectedProduct.unit_type_display || selectedProduct.unit_type}</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider mb-1">Standard Box Weight</p>
                  <p className="font-bold text-textPrimary text-sm flex items-center gap-1.5">
                    {selectedProduct.box_weight_kg ? `${selectedProduct.box_weight_kg} KG` : "—"}
                  </p>
                </div>
              </div>

              {/* Market Intelligence */}
              <div>
                <h3 className="text-xs font-black text-textPrimary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-primary" /> Market Intelligence
                </h3>
                <div className="bg-card rounded-2xl p-5 text-white">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-widest mb-1">Recent Market Price</p>
                      <p className="text-2xl font-black">₹ 350 / kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-widest mb-1">Trend</p>
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-success/20 text-success">
                        +5.2%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-textSecondary/50">Active Suppliers</span>
                      <span className="font-bold">12 Vendors</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-textSecondary/50">Inventory Status</span>
                      <span className="font-bold text-success">In Stock</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            
            {/* Actions */}
            <div className="p-6 border-t border-border/50 bg-card grid grid-cols-2 gap-3">
              <Button className="w-full font-bold h-12 rounded-xl bg-primary hover:bg-primaryHover text-white shadow-lg shadow-indigo-200 gap-2">
                <Settings size={18} /> Configure
              </Button>
              <Button variant="outline" className="w-full font-bold h-12 rounded-xl border-border text-textPrimary hover:bg-card gap-2">
                <Copy size={18} /> Duplicate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      
      {/* Add Modal - Enterprise UI */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[1200px] w-full h-full sm:w-[95vw] sm:max-h-[90vh] sm:rounded-xl overflow-hidden flex flex-col p-0 bg-card">
          <DialogHeader className="px-6 py-4 border-b border-border bg-card z-10 shadow-sm">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-textPrimary">
              <Package size={20} className="text-primary" />
              Register Product Species
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Column 1: Classification */}
              <div className="space-y-6">
                <Card className="p-5 shadow-sm border-border bg-card">
                  <h3 className="text-sm font-black text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-5">
                    <Tag size={16} className="text-primary" /> Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center text-textSecondary/70 hover:bg-hover hover:border-border transition-colors cursor-pointer shrink-0">
                        <ImageIcon size={24} className="mb-1" />
                        <span className="text-[9px] font-bold uppercase">Upload</span>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Fish Name (English) *</label>
                        <Input disabled={!isEditable} className="h-10 bg-card border-border focus:border-primary" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Seer Fish" required />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Tamil Name</label>
                        <Input disabled={!isEditable} className="h-10 bg-card border-border focus:border-primary" value={tamilName} onChange={(e) => setTamilName(e.target.value)} placeholder="e.g. Vanjaram" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Scientific Name</label>
                        <Input disabled={!isEditable} className="h-10 bg-card border-border focus:border-primary" value={scientificName} onChange={(e) => setScientificName(e.target.value)} placeholder="e.g. Scomberomorus" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Alias Names (Comma separated)</label>
                      <Input disabled={!isEditable} className="h-10 bg-card border-border focus:border-primary" value={aliasNames} onChange={(e) => setAliasNames(e.target.value)} placeholder="e.g. King Mackerel, Surmai" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Category</label>
                        <select disabled={!isEditable} 
                          value={category} onChange={(e) => setCategory(e.target.value)}
                          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-textPrimary outline-none focus:border-primary transition-all font-semibold"
                        >
                          <option value="1">Sea Fish</option>
                          <option value="2">Freshwater</option>
                          <option value="3">Shellfish</option>
                          <option value="4">Frozen</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Status</label>
                        <select disabled={!isEditable} 
                          value={status} onChange={(e) => setStatus(e.target.value)}
                          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-textPrimary outline-none focus:border-primary transition-all font-semibold"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="draft">Draft</option>
                        </select>
                      </div>
                    </div>
                    
                    {fishCatalog.some(f => f.name.toLowerCase() === name.trim().toLowerCase()) && name.trim() !== "" && (
                      <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-xs font-bold">
                        <AlertTriangle size={14} /> Warning: Species name already exists.
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Column 2: Trade & Market */}
              <div className="space-y-6">
                <Card className="p-5 shadow-sm border-border bg-card">
                  <h3 className="text-sm font-black text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-5">
                    <Layers size={16} className="text-primary" /> Trade Configuration
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Trading Unit</label>
                        <select disabled={!isEditable} 
                          value={unitType} onChange={(e) => setUnitType(e.target.value)}
                          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-textPrimary outline-none focus:border-primary transition-all font-semibold"
                        >
                          <option value="kg">Weight (KG)</option>
                          <option value="box">Box</option>
                          <option value="piece">Piece</option>
                          <option value="tray">Tray</option>
                          <option value="packet">Packet</option>
                        </select>
                      </div>
                      
                      {unitType === "box" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Default Box Weight (KG) *</label>
                          <Input disabled={!isEditable} type="number" step="0.1" className="h-10 bg-primary/10/50 border-indigo-200 focus:border-primary text-indigo-900 font-bold" value={boxWeight} onChange={(e) => setBoxWeight(Math.max(0, parseFloat(e.target.value) || 0))} required />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Min. Purchase Qty</label>
                        <Input disabled={!isEditable} type="number" className="h-10 bg-card border-border focus:border-primary" value={minPurchase} onChange={(e) => setMinPurchase(parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Spoilage Threshold (%)</label>
                        <Input disabled={!isEditable} type="number" className="h-10 bg-card border-border focus:border-primary" value={spoilage} onChange={(e) => setSpoilage(parseInt(e.target.value))} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/50">
                      <div>
                        <p className="text-xs font-bold text-textPrimary">Requires Cold Storage</p>
                        <p className="text-[10px] font-semibold text-textSecondary">Must be kept below 4°C</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={coldStorage} onChange={(e) => setColdStorage(e.target.checked)} disabled={!isEditable} />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 shadow-sm border-border bg-card">
                  <h3 className="text-sm font-black text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-5">
                    <Activity size={16} className="text-primary" /> Market Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/50 mb-2">
                      <div>
                        <p className="text-xs font-bold text-textPrimary">Market Price Tracking</p>
                        <p className="text-[10px] font-semibold text-textSecondary">Auto-update from mandis</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={marketTracking} onChange={(e) => setMarketTracking(e.target.checked)} disabled={!isEditable} />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    {marketTracking && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Tracked Cities</label>
                          <Input disabled={!isEditable} className="h-10 bg-card border-border focus:border-primary" value={trackedCities} onChange={(e) => setTrackedCities(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Selling Margin (%)</label>
                            <Input disabled={!isEditable} type="number" className="h-10 bg-card border-border focus:border-primary" value={margin} onChange={(e) => setMargin(parseInt(e.target.value))} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Low Price Alert (₹)</label>
                            <Input disabled={!isEditable} type="number" className="h-10 bg-card border-border focus:border-primary" value={lowPriceAlert} onChange={(e) => setLowPriceAlert(parseInt(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Column 3: Live Preview Panel */}
              <div className="space-y-6">
                <div className="sticky top-0 bg-card rounded-2xl p-6 text-white shadow-xl">
                  <h3 className="text-xs font-black text-textSecondary/70 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Eye size={14} className="text-primary" /> Live Preview
                  </h3>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-elevated flex items-center justify-center shrink-0 border border-border">
                      <ImageIcon size={24} className="text-textSecondary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white leading-tight">{name || "Fish Name"}</h2>
                      <p className="text-xs font-bold text-textSecondary/70 uppercase tracking-wider">{tamilName || "Tamil Name"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-elevated/50 rounded-xl p-4 border border-border/50">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider">Category</span>
                        <span className="text-xs font-black text-primary uppercase">{category === "1" ? "Sea Fish" : category === "2" ? "Freshwater" : category === "3" ? "Shellfish" : "Frozen"}</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider">Status</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${status === 'active' ? 'text-success' : 'text-warning'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-success' : 'bg-warning'}`}></div> {status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider">Trading Unit</span>
                        <span className="text-xs font-black text-white capitalize">{unitType} {unitType === 'box' && `(${boxWeight} KG)`}</span>
                      </div>
                    </div>
                    
                    <div className="bg-elevated/50 rounded-xl p-4 border border-border/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider">Cold Storage</span>
                        <span className={`text-xs font-black uppercase ${coldStorage ? 'text-blue-400' : 'text-textSecondary'}`}>{coldStorage ? 'Required' : 'No'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-textSecondary/70 uppercase tracking-wider">Market Tracking</span>
                        <span className={`text-xs font-black uppercase ${marketTracking ? 'text-success' : 'text-textSecondary'}`}>{marketTracking ? 'Active' : 'Off'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-card">
            <div className="flex w-full justify-between items-center">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-textSecondary hover:text-textPrimary font-bold">
                {isEditable ? "Cancel" : "Close"}
              </Button>
              {isEditable && (
                <div className="flex gap-3">
                  <Button variant="outline" className="font-bold border-border text-textPrimary hover:bg-card">
                    Save Draft
                  </Button>
                  <Button onClick={handleSubmit} loading={isSubmitting} className="font-bold bg-primary hover:bg-primaryHover text-white shadow-lg shadow-indigo-200 px-8">
                    Register Species
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
