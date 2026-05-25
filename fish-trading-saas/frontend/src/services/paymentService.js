import { apiClient } from "@/services/apiClient";
import { config } from "@/config";

const paymentMockData = [
  {
    id: 1,
    payment_type: "inbound",
    payment_type_display: "Inbound Collection",
    payment_mode: "bank_transfer",
    payment_mode_display: "Bank Transfer",
    purchase_batch: null,
    sale: 1,
    supplier: null,
    buyer: 1,
    purchase_batch_number: null,
    sale_invoice_number: "INV-2026-001",
    supplier_name: null,
    buyer_name: "Blue Harbor Retail",
    amount: 44000.0,
    date: "2026-05-24",
    reference_number: "TXN123456789",
    bank_name: "HDFC Bank",
    account_number: "******9876",
    is_cleared: true,
    cleared_date: "2026-05-24",
    approval_status: "approved",
    approval_status_display: "Approved",
  },
  {
    id: 2,
    payment_type: "outbound",
    payment_type_display: "Outbound Payout",
    payment_mode: "bank_transfer",
    payment_mode_display: "Bank Transfer",
    purchase_batch: 101,
    sale: null,
    supplier: 1,
    buyer: null,
    purchase_batch_number: "BAT-2026-081",
    sale_invoice_number: null,
    supplier_name: "Mangalore Coastal Traders",
    buyer_name: null,
    amount: 150000.0,
    date: "2026-05-21",
    reference_number: "REF99887766",
    bank_name: "State Bank of India",
    account_number: "******4321",
    is_cleared: true,
    cleared_date: "2026-05-21",
    approval_status: "approved",
    approval_status_display: "Approved",
  }
];

export const fetchPayments = async () => {
  if (config.useMocks) return paymentMockData;
  try {
    const response = await apiClient.get("/payments/");
    return response.data?.results || response.data || [];
  } catch (error) {
    console.error("Failed to fetch payments, falling back to mock", error);
    return paymentMockData;
  }
};

export const createPayment = async (data) => {
  if (config.useMocks) {
    const newPay = {
      id: Date.now(),
      approval_status: "approved",
      approval_status_display: "Approved",
      is_cleared: true,
      cleared_date: data.date,
      payment_type_display: data.payment_type === "inbound" ? "Inbound Collection" : "Outbound Payout",
      payment_mode_display: data.payment_mode === "bank_transfer" ? "Bank Transfer" : data.payment_mode === "cash" ? "Cash" : "Cheque",
      ...data
    };
    paymentMockData.unshift(newPay);
    return newPay;
  }
  const response = await apiClient.post("/payments/", data);
  return response.data;
};

export const deletePayment = async (id) => {
  if (config.useMocks) {
    const idx = paymentMockData.findIndex(p => p.id === id);
    if (idx !== -1) paymentMockData.splice(idx, 1);
    return true;
  }
  await apiClient.delete(`/payments/${id}/`);
  return true;
};
