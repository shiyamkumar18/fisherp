import React, { useEffect, useState } from "react";
import { 
  Package, Plus, Search, Tag, Settings, 
  Layers, Info, AlertTriangle, Trash2, CheckCircle, HelpCircle 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchFishTypes, createFishType, deleteProduct } from "@/services/productService";
import { useToast } from "@/components/shared/toast-provider";

export default function ProductsPage() {
  const [fishCatalog, setFishCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { push: toast } = useToast();

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("1"); // Category ID
  const [unitType, setUnitType] = useState("box");
  const [boxWeight, setBoxWeight] = useState(20);

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
    setCategory("1");
    setUnitType("box");
    setBoxWeight(20);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ message: "Product name is required.", variant: "error" });
      return;
    }
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
      toast({ message: "Error registering product.", variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this product from the catalog?")) return;
    try {
      await deleteProduct(id);
      toast({ message: "Product de-registered from catalog." });
      loadCatalog();
    } catch (e) {
      toast({ message: "Failed to delete product.", variant: "error" });
    }
  };

  const filteredCatalog = fishCatalog.filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Products Catalog</h2>
          <p className="text-xs text-textSecondary">Configure fish species taxonomy and unit weights for trading batches.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Register Species
        </Button>
      </div>

      {/* KPI summaries */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Catalog species</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">{fishCatalog.length} species</span>
            <Package className="h-5 w-5 text-primary opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Box Weight Units</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {fishCatalog.filter(f => f.unit_type === "box").length} items
            </span>
            <Layers className="h-5 w-5 text-cyan-500 opacity-65" />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">Average Pack Size</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-textPrimary">
              {(fishCatalog.reduce((sum, f) => sum + (f.box_weight_kg || 0), 0) / (fishCatalog.length || 1)).toFixed(1)} kg
            </span>
          </div>
        </Card>
      </div>

      <Card hoverEffect={false}>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-1.5 max-w-md">
          <Search size={16} className="text-textSecondary" />
          <input
            type="text"
            placeholder="Search catalog by species name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-textPrimary outline-none font-semibold"
          />
        </div>

        {error ? (
          <div className="flex items-center gap-2 text-danger bg-danger/5 border border-danger/10 p-4 rounded-xl mb-4">
            <AlertTriangle size={18} />
            <p className="font-bold">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="py-12 text-center text-textSecondary">Loading product types...</div>
        ) : filteredCatalog.length === 0 ? (
          <div className="py-12 text-center text-textSecondary">
            <Info className="mx-auto h-8 w-8 mb-2 text-textSecondary/40" />
            No species definitions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-textSecondary/70">
                  <th className="pb-3 pr-4">Species Name</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Trading Unit</th>
                  <th className="pb-3 pr-4 text-right">Standard Weight</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold text-textPrimary">
                {filteredCatalog.map((item) => (
                  <tr key={item.id} className="hover:bg-border/10 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-textPrimary">
                      {item.name}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-textSecondary font-semibold">{item.category_name || "General"}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-xs text-textSecondary capitalize">{item.unit_type_display || item.unit_type}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className="text-textPrimary">{item.box_weight_kg ? `${item.box_weight_kg} kg` : "—"}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success border border-success/20">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        title="Delete Species"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Product Species</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-textSecondary">Species / Fish Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pomfret" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  <option value="1">Sea Fish</option>
                  <option value="2">Premium Seafood</option>
                  <option value="3">Freshwater Fish</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Trading Unit</label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-textPrimary outline-none focus:border-primary"
                >
                  <option value="box">Box unit</option>
                  <option value="kg">Weight (kg)</option>
                </select>
              </div>
            </div>

            {unitType === "box" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-textSecondary">Weight per Box (kg) *</label>
                <Input type="number" step="0.1" value={boxWeight} onChange={(e) => setBoxWeight(Math.max(0, parseFloat(e.target.value) || 0))} required />
              </div>
            )}

            <DialogFooter className="mt-6 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Add Species</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
