import { apiClient } from "@/services/apiClient";
import { config } from "@/config";

const supplierMockData = [
  {
    id: 1,
    name: "Mangalore Coastal Traders",
    phone: "9876543210",
    email: "info@mangalorecoastal.com",
    address: "Jetty Road, Mangalore, Karnataka",
    place_of_origin: "Mangalore",
    supplier_type: "distributor",
    supplier_type_display: "Distributor",
    bank_name: "State Bank of India",
    bank_account: "SBI123456789",
    bank_ifsc: "SBIN0001234",
    commission_rate: 2.5,
    rating: 4.8,
    total_deliveries: 124,
    on_time_deliveries: 118,
    on_time_percentage: 95.1,
    is_active: true,
    is_verified: true,
    total_purchases: 850000.0,
    total_paid: 802700.0,
    outstanding_amount: 47300.0,
    payment_status: "Overdue"
  },
  {
    id: 2,
    name: "Kochi Marine Exporters",
    phone: "9123456789",
    email: "sales@kochimarine.com",
    address: "Harbor Road, Kochi, Kerala",
    place_of_origin: "Kochi",
    supplier_type: "boat_owner",
    supplier_type_display: "Boat Owner",
    bank_name: "Federal Bank",
    bank_account: "FED987654321",
    bank_ifsc: "FDRL0009876",
    commission_rate: 0.0,
    rating: 4.5,
    total_deliveries: 62,
    on_time_deliveries: 58,
    on_time_percentage: 93.5,
    is_active: true,
    is_verified: true,
    total_purchases: 540000.0,
    total_paid: 540000.0,
    outstanding_amount: 0.0,
    payment_status: "Paid"
  }
];

export const fetchSuppliers = async () => {
  if (config.useMocks) return supplierMockData;
  const response = await apiClient.get("/suppliers/");
    return response.data?.results || response.data || [];
};

export const createSupplier = async (data) => {
  if (config.useMocks) {
    const newSupplier = {
      id: Date.now(),
      rating: 5.0,
      total_deliveries: 0,
      on_time_deliveries: 0,
      on_time_percentage: 100,
      is_active: true,
      is_verified: true,
      total_purchases: 0,
      total_paid: 0,
      outstanding_amount: 0,
      payment_status: "Paid",
      ...data
    };
    supplierMockData.unshift(newSupplier);
    return newSupplier;
  }
  const response = await apiClient.post("/suppliers/", data);
  return response.data;
};

export const updateSupplier = async (id, data) => {
  if (config.useMocks) {
    const idx = supplierMockData.findIndex(s => s.id === id);
    if (idx !== -1) {
      supplierMockData[idx] = { ...supplierMockData[idx], ...data };
      return supplierMockData[idx];
    }
    return null;
  }
  const response = await apiClient.patch(`/suppliers/${id}/`, data);
  return response.data;
};

export const deleteSupplier = async (id) => {
  if (config.useMocks) {
    const idx = supplierMockData.findIndex(s => s.id === id);
    if (idx !== -1) supplierMockData.splice(idx, 1);
    return true;
  }
  await apiClient.delete(`/suppliers/${id}/`);
  return true;
};
