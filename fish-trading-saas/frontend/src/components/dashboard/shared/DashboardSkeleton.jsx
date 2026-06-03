import { useState, useMemo, memo } from "react";
import { ArrowDown, ArrowUp, Zap, Clock } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";

export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-border/40 rounded-lg"></div>
        <div className="h-5 w-48 bg-border/20 rounded-md"></div>
      </div>
      <div className="h-10 w-32 bg-border/30 rounded-xl"></div>
    </div>
    
    {/* Quick Actions Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[104px] bg-surface border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
          <div className="h-8 w-8 bg-border/40 rounded-full"></div>
          <div className="h-4 w-16 bg-border/30 rounded"></div>
          <div className="h-2 w-24 bg-border/20 rounded"></div>
        </div>
      ))}
    </div>
    
    {/* KPI Cards Skeleton */}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-36 bg-surface border border-border/50 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="h-3 w-20 bg-border/30 rounded"></div>
            <div className="h-10 w-10 bg-border/20 rounded-xl"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 w-24 bg-border/40 rounded"></div>
            <div className="h-3 w-32 bg-border/20 rounded"></div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Charts Skeleton */}
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="h-80 bg-surface border border-border/50 rounded-2xl lg:col-span-2"></div>
      <div className="h-80 bg-surface border border-border/50 rounded-2xl"></div>
    </div>
  </div>
);

// ---- Platform KPI Card Component ----