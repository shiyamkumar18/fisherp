import { apiClient } from "@/services/apiClient";
import { config } from "@/config";

// Mock data for fallback or offline state
const purchaseMockData = [
  {
    id: 101,
    batch_number: "BAT-2026-081",
    purchase_type: "consignment",
    purchase_type_display: "Consignment",
    supplier: 1,
    supplier_name: "Mangalore Coastal Traders",
    fisherman_name: "Ramesh Naik",
    place_of_buying: "Mangalore Jetty",
    fish: 1,
    fish_name: "Mackerel (Indian)",
    date: "2026-05-20",
    number_of_packages: 50,
    package_weight: 20.0,
    total_weight: 1000.0,
    price_per_kg: 180.0,
    fish_cost: 180000.0,
    labour_cost: 4500.0,
    ice_cost: 2500.0,
    transport_cost: 8000.0,
    commission_cost: 1800.0,
    other_cost: 500.0,
    total_expense: 17300.0,
    actual_cost_per_kg: 197.3,
    cost_per_package: 3946.0,
    amount_paid: 150000.0,
    pending_amount: 47300.0,
    status: "active",
    status_display: "Active",
    quality_grade: "A",
    remaining_packages: 32,
    sold_packages: 18,
    estimated_expiry_date: "2026-05-28"
  },
  {
    id: 102,
    batch_number: "BAT-2026-082",
    purchase_type: "outright",
    purchase_type_display: "Outright Purchase",
    supplier: 2,
    supplier_name: "Kochi Marine Exporters",
    fisherman_name: "Joseph Xavier",
    place_of_buying: "Kochi Harbor",
    fish: 2,
    fish_name: "Tuna (Yellowfin)",
    date: "2026-05-22",
    number_of_packages: 25,
    package_weight: 40.0,
    total_weight: 1000.0,
    price_per_kg: 320.0,
    fish_cost: 320000.0,
    labour_cost: 6000.0,
    ice_cost: 3000.0,
    transport_cost: 12000.0,
    commission_cost: 0.0,
    other_cost: 1000.0,
    total_expense: 22000.0,
    actual_cost_per_kg: 342.0,
    cost_per_package: 13680.0,
    amount_paid: 342000.0,
    pending_amount: 0.0,
    status: "active",
    status_display: "Active",
    quality_grade: "A+",
    remaining_packages: 12,
    sold_packages: 13,
    estimated_expiry_date: "2026-05-30"
  }
];

const PURCHASE_NUMERIC_FIELDS = [
  "total_weight", "price_per_kg", "fish_cost", "labour_cost", "ice_cost",
  "transport_cost", "commission_cost", "other_cost", "total_expense",
  "actual_cost_per_kg", "cost_per_package", "amount_paid", "pending_amount",
  "number_of_packages", "package_weight", "remaining_packages", "sold_packages",
];

const parseBatch = (b) => {
  const out = { ...b };
  for (const field of PURCHASE_NUMERIC_FIELDS) {
    if (out[field] !== undefined && out[field] !== null) {
      out[field] = parseFloat(out[field]) || 0;
    }
  }
  return out;
};

export const fetchPurchaseBatches = async () => {
  if (config.useMocks) return purchaseMockData;
  const response = await apiClient.get("/purchase-batches/");
  const raw = response.data?.results || response.data || [];
  return raw.map(parseBatch);
};

export const createPurchaseBatch = async (data) => {
  if (config.useMocks) {
    const newBatch = {
      id: Date.now(),
      batch_number: `BAT-2026-${Math.floor(Math.random() * 900) + 100}`,
      status: "active",
      status_display: "Active",
      remaining_packages: data.number_of_packages,
      sold_packages: 0,
      total_weight: data.number_of_packages * data.package_weight,
      fish_cost: data.number_of_packages * data.package_weight * data.price_per_kg,
      total_expense: (Number(data.labour_cost) || 0) + (Number(data.ice_cost) || 0) + (Number(data.transport_cost) || 0) + (Number(data.commission_cost) || 0) + (Number(data.other_cost) || 0),
      ...data
    };
    newBatch.pending_amount = (newBatch.fish_cost + newBatch.total_expense) - (Number(newBatch.amount_paid) || 0);
    purchaseMockData.unshift(newBatch);
    return newBatch;
  }
  const response = await apiClient.post("/purchase-batches/", data);
  return response.data;
};

export const updatePurchaseBatch = async (id, data) => {
  if (config.useMocks) {
    const idx = purchaseMockData.findIndex(b => b.id === id);
    if (idx !== -1) {
      purchaseMockData[idx] = { ...purchaseMockData[idx], ...data };
      return purchaseMockData[idx];
    }
    return null;
  }
  const response = await apiClient.patch(`/purchase-batches/${id}/`, data);
  return response.data;
};

export const deletePurchaseBatch = async (id) => {
  if (config.useMocks) {
    const idx = purchaseMockData.findIndex(b => b.id === id);
    if (idx !== -1) purchaseMockData.splice(idx, 1);
    return true;
  }
  await apiClient.delete(`/purchase-batches/${id}/`);
  return true;
};

export const getPurchaseBatch = async (id) => {
  if (config.useMocks) {
    const batch = purchaseMockData.find(b => b.id === parseInt(id));
    return batch ? parseBatch(batch) : null;
  }
  const response = await apiClient.get(`/purchase-batches/${id}/`);
  return parseBatch(response.data);
};

export const changePurchaseState = async (id, state, notes = "") => {
  if (config.useMocks) return null;
  const response = await apiClient.post(`/purchase-batches/${id}/change_state/`, { state, notes });
  return parseBatch(response.data);
};

