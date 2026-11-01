import { apiClient } from "@/services/apiClient";
import { config } from "@/config";

const inventoryMockData = [
  {
    id: 1,
    fish: 1,
    fish_name: "Mackerel (Indian)",
    purchase_batch: 101,
    batch_number: "BAT-2026-081",
    initial_packages: 50,
    remaining_packages: 32,
    sold_packages: 18,
    initial_weight_kg: 1000.0,
    remaining_weight_kg: 640.0,
    status: "in_stock",
    status_display: "In Stock",
    storage_location: "Cold Room A",
    bin_number: "Bin-04",
    rack_number: "Rack-B2",
    expiry_date: "2026-05-28",
    current_temperature: -18.5,
    temperature_last_checked: "2026-05-25T16:00:00Z",
    needs_reorder: false,
    expiry_alert: false,
  },
  {
    id: 2,
    fish: 2,
    fish_name: "Tuna (Yellowfin)",
    purchase_batch: 102,
    batch_number: "BAT-2026-082",
    initial_packages: 25,
    remaining_packages: 12,
    sold_packages: 13,
    initial_weight_kg: 1000.0,
    remaining_weight_kg: 480.0,
    status: "low_stock",
    status_display: "Low Stock",
    storage_location: "Cold Room B",
    bin_number: "Bin-12",
    rack_number: "Rack-A3",
    expiry_date: "2026-05-30",
    current_temperature: -22.0,
    temperature_last_checked: "2026-05-25T15:30:00Z",
    needs_reorder: true,
    expiry_alert: false,
  },
  {
    id: 3,
    fish: 4,
    fish_name: "Sardine",
    purchase_batch: 103,
    batch_number: "BAT-2026-079",
    initial_packages: 40,
    remaining_packages: 0,
    sold_packages: 40,
    initial_weight_kg: 400.0,
    remaining_weight_kg: 0.0,
    status: "out_of_stock",
    status_display: "Out of Stock",
    storage_location: "Cold Room A",
    bin_number: "Bin-01",
    rack_number: "Rack-C1",
    expiry_date: "2026-05-20",
    current_temperature: -1.2, // Warning temperature!
    temperature_last_checked: "2026-05-25T17:15:00Z",
    needs_reorder: true,
    expiry_alert: true,
  }
];

export const fetchInventory = async () => {
  if (config.useMocks) return inventoryMockData;
  const response = await apiClient.get("/inventory/");
    return response.data?.results || response.data || [];
};

export const updateInventoryItem = async (id, data) => {
  if (config.useMocks) {
    const idx = inventoryMockData.findIndex(item => item.id === id);
    if (idx !== -1) {
      inventoryMockData[idx] = { 
        ...inventoryMockData[idx], 
        ...data,
        temperature_last_checked: new Date().toISOString()
      };
      return inventoryMockData[idx];
    }
    return null;
  }
  const response = await apiClient.patch(`/inventory/${id}/`, data);
  return response.data;
};
