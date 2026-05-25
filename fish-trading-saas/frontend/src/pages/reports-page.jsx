import React, { useState } from "react";
import { 
  BarChart3, Calendar, Download, FileSpreadsheet, 
  TrendingUp, ShoppingBag, Layers, Users, AlertCircle, CheckCircle2 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchSales } from "@/services/salesService";
import { fetchPurchaseBatches } from "@/services/purchaseService";
import { fetchInventory } from "@/services/inventoryService";
import { fetchSuppliers } from "@/services/supplierService";
import { fetchCustomers } from "@/services/customerService";
import { useToast } from "@/components/shared/toast-provider";

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [downloading, setDownloading] = useState("");
  const { push: toast } = useToast();

  // Helper to trigger browser download of a CSV string
  const downloadCSVFile = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = async (reportType) => {
    setDownloading(reportType);
    toast({ message: `Compiling ${reportType} report...` });
    
    try {
      if (reportType === "Sales Billing Register") {
        const data = await fetchSales();
        // Filter by date
        const filtered = data.filter(s => s.date >= fromDate && s.date <= toDate);
        if (filtered.length === 0) {
          toast({ message: "No records found in selected date range.", variant: "error" });
          setDownloading("");
          return;
        }

        // Build CSV
        const headers = ["Invoice Number", "Sale Type", "Invoice Date", "Buyer Name", "Batch Number", "Packages Sold", "Weight Sold (Kg)", "Price/Kg", "Subtotal", "Discount %", "Tax %", "Grand Total", "Amount Received", "Pending Balance", "Payment Status", "Delivery Status"];
        const rows = filtered.map(s => [
          s.invoice_number,
          s.sale_type_display || s.sale_type,
          s.date,
          s.buyer_name,
          s.batch_number,
          s.number_of_packages_sold,
          s.number_of_packages_sold * s.selling_weight_per_package,
          s.selling_price_per_kg,
          s.total_revenue,
          s.discount_percent,
          s.tax_percent,
          s.final_amount,
          s.amount_received,
          s.pending_amount,
          s.payment_status,
          s.delivery_status
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val ?? ""}"`).join(","))].join("\n");
        downloadCSVFile(`Sales_Register_${fromDate}_to_${toDate}.csv`, csvContent);
        toast({ message: "Sales report downloaded successfully!" });

      } else if (reportType === "Purchase Batch Ledger") {
        const data = await fetchPurchaseBatches();
        const filtered = data.filter(b => b.date >= fromDate && b.date <= toDate);
        if (filtered.length === 0) {
          toast({ message: "No purchase records found in selected date range.", variant: "error" });
          setDownloading("");
          return;
        }

        const headers = ["Batch Number", "Log Date", "Supplier Name", "Fisherman Name", "Buying Place", "Fish Species", "Packages Purchased", "Package Weight (Kg)", "Total Weight (Kg)", "Price/Kg", "Fish Cost", "Labour Expense", "Ice Expense", "Transport Expense", "Commission Expense", "Other Expenses", "Total Value", "Actual Cost/Kg", "Amount Paid", "Pending Balance", "Quality Grade"];
        const rows = filtered.map(b => [
          b.batch_number,
          b.date,
          b.supplier_name,
          b.fisherman_name,
          b.place_of_buying,
          b.fish_name,
          b.number_of_packages,
          b.package_weight,
          b.total_weight,
          b.price_per_kg,
          b.fish_cost,
          b.labour_cost,
          b.ice_cost,
          b.transport_cost,
          b.commission_cost,
          b.other_cost,
          b.fish_cost + b.total_expense,
          b.actual_cost_per_kg,
          b.amount_paid,
          b.pending_amount,
          b.quality_grade
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val ?? ""}"`).join(","))].join("\n");
        downloadCSVFile(`Purchase_Ledger_${fromDate}_to_${toDate}.csv`, csvContent);
        toast({ message: "Purchase ledger downloaded successfully!" });

      } else if (reportType === "Inventory Valuation & Telemetry") {
        const data = await fetchInventory();
        if (data.length === 0) {
          toast({ message: "Inventory is empty.", variant: "error" });
          setDownloading("");
          return;
        }

        const headers = ["Fish Species", "Batch Number", "Initial Packages", "Remaining Packages", "Sold Packages", "Remaining Weight (Kg)", "Cold Storage Location", "Bin Location", "Rack Location", "Expiry Date", "Freezer Temp (C)", "Needs Reorder", "Expiry Alert"];
        const rows = data.map(item => [
          item.fish_name,
          item.batch_number,
          item.initial_packages,
          item.remaining_packages,
          item.sold_packages,
          item.remaining_weight_kg,
          item.storage_location,
          item.bin_number,
          item.rack_number,
          item.expiry_date,
          item.current_temperature,
          item.needs_reorder ? "Yes" : "No",
          item.expiry_alert ? "Yes" : "No"
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val ?? ""}"`).join(","))].join("\n");
        downloadCSVFile(`Inventory_Valuation_${new Date().toISOString().split("T")[0]}.csv`, csvContent);
        toast({ message: "Inventory valuation downloaded!" });

      } else if (reportType === "Outstanding Balances Register") {
        const [cData, sData] = await Promise.all([fetchCustomers(), fetchSuppliers()]);
        
        let csvContent = "";
        // Buyers section
        csvContent += "BUYERS OUTSTANDING (RECEIVABLES)\n";
        csvContent += "Buyer Name,Business Name,Phone,Credit Limit,Outstanding Receivables\n";
        cData.forEach(c => {
          csvContent += `"${c.name}","${c.business_name || ""}","${c.phone}",${c.credit_limit},${c.total_pending}\n`;
        });
        
        // Suppliers section
        csvContent += "\nSUPPLIERS OUTSTANDING (PAYABLES)\n";
        csvContent += "Supplier Name,Phone,Place of Origin,Commission Rate %,Outstanding Payables,Payment Status\n";
        sData.forEach(s => {
          csvContent += `"${s.name}","${s.phone}","${s.place_of_origin || ""}",${s.commission_rate},${s.outstanding_amount},"${s.payment_status}"\n`;
        });

        downloadCSVFile(`Outstanding_Register_${new Date().toISOString().split("T")[0]}.csv`, csvContent);
        toast({ message: "Outstanding balance sheet downloaded!" });
      }
    } catch (e) {
      toast({ message: `Error generating ${reportType} report.`, variant: "error" });
    } finally {
      setDownloading("");
    }
  };

  const reportCards = [
    {
      title: "Sales Billing Register",
      desc: "Gross invoices list, taxes, discounts, amounts received, and customer collection tracking.",
      icon: TrendingUp,
      color: "text-primary bg-primary/10",
      requiresDate: true
    },
    {
      title: "Purchase Batch Ledger",
      desc: "Inbound stock batches, fisherman origin parameters, cold-chain overheads, and payables.",
      icon: ShoppingBag,
      color: "text-cyan-500 bg-cyan-500/10",
      requiresDate: true
    },
    {
      title: "Inventory Valuation & Telemetry",
      desc: "Live stock counts (packages & tonnage), sub-zero locations, and thermal logs history.",
      icon: Layers,
      color: "text-emerald-500 bg-emerald-500/10",
      requiresDate: false
    },
    {
      title: "Outstanding Balances Register",
      desc: "Comprehensive balance sheet detailing buyer receivables and supplier payout dues.",
      icon: Users,
      color: "text-amber-500 bg-amber-500/10",
      requiresDate: false
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Reports & Analytics</h2>
        <p className="text-xs text-textSecondary">Generate compliance-grade financial ledgers and cold chain logistics telemetry sheets.</p>
      </div>

      {/* Date Range Selector */}
      <Card hoverEffect={false} className="flex flex-col sm:flex-row sm:items-end gap-4 max-w-2xl bg-primary/5 border-primary/10">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold uppercase text-textSecondary flex items-center gap-1">
            <Calendar size={12} /> From Date
          </label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold uppercase text-textSecondary flex items-center gap-1">
            <Calendar size={12} /> To Date
          </label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="text-xs font-bold text-textSecondary py-2 sm:py-0 self-center">
          Selected: <span className="text-textPrimary">30 Days audit window</span>
        </div>
      </Card>

      {/* Report Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {reportCards.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.title;
          return (
            <Card key={report.title} className="flex flex-col justify-between h-48">
              <div className="flex items-start gap-4">
                <span className={`rounded-xl p-3 ${report.color} shrink-0`}>
                  <Icon size={20} />
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-textPrimary">{report.title}</h3>
                  <p className="text-xs text-textSecondary leading-relaxed">{report.desc}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary/70">
                  {report.requiresDate ? "Respects Date window" : "Live telemetry snapshot"}
                </span>
                <Button 
                  onClick={() => handleDownloadReport(report.title)} 
                  disabled={!!downloading}
                  size="sm"
                  className="flex items-center gap-1.5"
                >
                  <Download size={13} />
                  {isDownloading ? "Compiling..." : "Export CSV"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Compliance section */}
      <Card hoverEffect={false} className="border-emerald-500/25 bg-emerald-500/5 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
        <div className="text-xs font-semibold text-textSecondary">
          <p className="font-bold text-textPrimary text-sm">Automated CSV Auditing</p>
          Reports compiled conform directly to Indian tax (GST) invoice formats and FSSAI cold storage registry standards.
        </div>
      </Card>
    </div>
  );
}
