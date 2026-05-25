import { apiClient } from "@/services/apiClient";
import { config } from "@/config";

const customerMockData = [
  {
    id: 1,
    name: "Blue Harbor Retail",
    phone: "9876500111",
    email: "billing@blueharbor.com",
    address: "Market Road, Bangalore, Karnataka",
    buyer_type: "retail",
    buyer_type_display: "Retailer",
    business_name: "Blue Harbor Seafoods Ltd.",
    gst_number: "29AAAAA0000A1Z1",
    credit_limit: 150000.0,
    current_credit_balance: 85000.0,
    total_purchases: 450000.0,
    total_orders: 14,
    is_active: true,
    is_preferred: true,
    is_verified: true,
    total_pending: 85000.0
  },
  {
    id: 2,
    name: "Oceanfront Market",
    phone: "9123400222",
    email: "procurement@oceanfront.com",
    address: "Wholesale Jetty, Kochi, Kerala",
    buyer_type: "wholesale",
    buyer_type_display: "Wholesaler",
    business_name: "Oceanfront Wholesale Market LLC",
    gst_number: "32BBBBB1111B2Z2",
    credit_limit: 500000.0,
    current_credit_balance: 44800.0,
    total_purchases: 1250000.0,
    total_orders: 38,
    is_active: true,
    is_preferred: true,
    is_verified: true,
    total_pending: 44800.0
  }
];

export const fetchCustomers = async () => {
  if (config.useMocks) return customerMockData;
  try {
    const response = await apiClient.get("/buyers/");
    return response.data?.results || response.data || [];
  } catch (error) {
    console.error("Failed to fetch buyers, falling back to mock", error);
    return customerMockData;
  }
};

export const createCustomer = async (data) => {
  if (config.useMocks) {
    const newCust = {
      id: Date.now(),
      total_purchases: 0,
      total_orders: 0,
      is_active: true,
      is_verified: true,
      current_credit_balance: 0,
      total_pending: 0,
      ...data
    };
    customerMockData.unshift(newCust);
    return newCust;
  }
  const response = await apiClient.post("/buyers/", data);
  return response.data;
};

export const updateCustomer = async (id, data) => {
  if (config.useMocks) {
    const idx = customerMockData.findIndex(c => c.id === id);
    if (idx !== -1) {
      customerMockData[idx] = { ...customerMockData[idx], ...data };
      return customerMockData[idx];
    }
    return null;
  }
  const response = await apiClient.patch(`/buyers/${id}/`, data);
  return response.data;
};

export const deleteCustomer = async (id) => {
  if (config.useMocks) {
    const idx = customerMockData.findIndex(c => c.id === id);
    if (idx !== -1) customerMockData.splice(idx, 1);
    return true;
  }
  await apiClient.delete(`/buyers/${id}/`);
  return true;
};
