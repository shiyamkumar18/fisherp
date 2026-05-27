import React from "react";
import { Download } from "lucide-react";
import Button from "./Button";
import toast from "react-hot-toast";

/**
 * ExportButton — Download Excel/PDF with loading, error, and a11y
 * Usage: <ExportButton url="/api/orders/export/" label="Export Orders" />
 */
export default function ExportButton({ url, label = "Export", fileName, variant = "outline", className = "" }) {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      // Try to get filename from header, fallback to prop
      let name = fileName;
      const disp = res.headers.get("Content-Disposition");
      if (!name && disp && disp.includes("filename=")) {
        name = disp.split("filename=")[1].replace(/\"/g, "").trim();
      }
      if (!name) name = "export.xlsx";
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlObj);
      toast.success("Exported successfully");
    } catch (e) {
      toast.error(e.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant={variant}
      className={`flex items-center gap-2 ${className}`}
      aria-busy={loading}
      aria-label={label}
    >
      <Download className="w-4 h-4" />
      {loading ? "Exporting..." : label}
    </Button>
  );
}
