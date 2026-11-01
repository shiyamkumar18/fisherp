import { apiClient } from "@/services/apiClient";
import { config } from "@/config";

const salesMockData = [
  {
    id: 1,
    invoice_number: "INV-2026-001",
    sale_type: "domestic",
    sale_type_display: "Domestic Sale",
    batch: 101,
    batch_number: "BAT-2026-081",
    buyer: 1,
    buyer_name: "Blue Harbor Retail",
    date: "2026-05-24",
    number_of_packages_sold: 10,
    selling_weight_per_package: 20.0,
    selling_price_per_kg: 220.0,
    total_revenue: 44000.0,
    total_cost: 39460.0,
    profit: 4540.0,
    profit_margin_percent: 10.3,
    amount_received: 44000.0,
    pending_amount: 0.0,
    payment_status: "paid",
    payment_status_display: "Paid",
    delivery_status: "delivered",
    delivery_status_display: "Delivered",
    discount_percent: 0,
    discount_amount: 0,
    tax_percent: 5.0,
    tax_amount: 2200.0,
    final_amount: 46200.0,
  },
  {
    id: 2,
    invoice_number: "INV-2026-002",
    sale_type: "export",
    sale_type_display: "International Export",
    batch: 102,
    batch_number: "BAT-2026-082",
    buyer: 2,
    buyer_name: "Oceanfront Market",
    date: "2026-05-25",
    number_of_packages_sold: 8,
    selling_weight_per_package: 40.0,
    selling_price_per_kg: 390.0,
    total_revenue: 124800.0,
    total_cost: 109440.0,
    profit: 15360.0,
    profit_margin_percent: 12.3,
    amount_received: 80000.0,
    pending_amount: 44800.0,
    payment_status: "partially_paid",
    payment_status_display: "Partially Paid",
    delivery_status: "shipped",
    delivery_status_display: "Shipped",
    discount_percent: 0,
    discount_amount: 0,
    tax_percent: 0.0,
    tax_amount: 0.0,
    final_amount: 124800.0,
  }
];

const NUMERIC_FIELDS = [
  "total_revenue", "total_cost", "profit", "profit_margin_percent",
  "amount_received", "pending_amount", "final_amount",
  "discount_amount", "discount_percent", "tax_percent", "tax_amount",
  "refund_amount", "selling_price_per_kg", "selling_weight_per_package",
  "number_of_packages_sold",
];

const parseSale = (s) => {
  const out = { ...s };
  for (const field of NUMERIC_FIELDS) {
    if (out[field] !== undefined && out[field] !== null) {
      out[field] = parseFloat(out[field]) || 0;
    }
  }
  return out;
};

export const fetchSales = async () => {
  if (config.useMocks) return salesMockData;
  const response = await apiClient.get("/sales/");
  const raw = response.data?.results || response.data || [];
  return raw.map(parseSale);
};

export const createSale = async (data) => {
  if (config.useMocks) {
    const newSale = {
      id: Date.now(),
      invoice_number: `INV-2026-0${Math.floor(Math.random() * 90) + 10}`,
      payment_status: data.amount_received >= data.final_amount ? "paid" : data.amount_received > 0 ? "partially_paid" : "pending",
      payment_status_display: data.amount_received >= data.final_amount ? "Paid" : data.amount_received > 0 ? "Partially Paid" : "Pending",
      delivery_status: "pending",
      delivery_status_display: "Pending",
      profit: data.final_amount * 0.12, // mock profit
      profit_margin_percent: 12.0,
      ...data
    };
    newSale.pending_amount = newSale.final_amount - (newSale.amount_received || 0);
    salesMockData.unshift(newSale);
    return newSale;
  }
  const response = await apiClient.post("/sales/", data);
  return response.data;
};

export const deleteSale = async (id) => {
  if (config.useMocks) {
    const idx = salesMockData.findIndex(s => s.id === id);
    if (idx !== -1) salesMockData.splice(idx, 1);
    return true;
  }
  await apiClient.delete(`/sales/${id}/`);
  return true;
};
