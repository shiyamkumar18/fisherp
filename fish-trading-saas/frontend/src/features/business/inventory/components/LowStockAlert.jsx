import React from "react";

export default function LowStockAlert({ items }) {
  if (!items || items.length === 0) return null;

    return (
      <Card className="mb-4 flex items-center gap-3 bg-red-50 border-red-200">
        <Badge status="danger" className="mr-2">Low Stock</Badge>
        <span className="text-red-700 font-medium">
          {items.length} item{items.length > 1 ? "s" : ""} are low in stock!
          {items.length <= 5 && (
            <>: {items.map(i => i.name || i.fish).join(", ")}</>
          )}
        </span>
      </Card>
    );
}
