import React from "react";
import Skeleton from "./Skeleton";

export default function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-6 mb-3" />
      ))}
    </div>
  );
}
