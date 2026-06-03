export const STATUS_CLS = {
  in_stock:           "bg-success/10 text-success border-success/20",
  low_stock:          "bg-warning/10 text-warning border-warning/20",
  reserved:           "bg-primary/10 text-primary border-primary/20",
  out_of_stock:       "bg-danger/10 text-danger border-danger/20",
  expired:            "bg-border/60 text-textSecondary border-border",
  inspection_needed:  "bg-warning/15 text-warning border-warning/30",
  temperature_warning:"bg-warning/15 text-warning border-warning/30",
  spoilage_risk:      "bg-danger/20 text-danger border-danger/40",
};

export const TEMP_LOGIC = {
  getTempState: (temp) => {
    if (temp <= 2 && temp >= -2) return "optimal";
    if (temp >= 3 && temp <= 6)  return "warning";
    return "critical";
  },
  getColor: (state) => {
    if (state === "optimal") return "text-success";
    if (state === "warning")  return "text-warning";
    return "text-danger";
  },
  getBorderColor: (state) => {
    if (state === "optimal") return "border-success/30";
    if (state === "warning")  return "border-warning/30";
    return "border-danger/30";
  },
  getGlowClass: (state) => {
    if (state === "optimal") return "bg-success";
    if (state === "warning")  return "bg-warning";
    return "bg-danger";
  },
  getBg: (state) => {
    if (state === "optimal") return "bg-success/10";
    if (state === "warning")  return "bg-warning/10";
    return "bg-danger/10";
  },
  getLabel: (state) => {
    if (state === "optimal") return "Optimal Cooling";
    if (state === "warning")  return "Warm Risk";
    return "Critical Risk";
  },
  getStatusBadge: (temp) => {
    const state = TEMP_LOGIC.getTempState(temp);
    if (state === "optimal") return { icon: "🟢", label: "Optimal" };
    if (state === "warning")  return { icon: "🟡", label: "Warning" };
    return { icon: "🔴", label: "Critical" };
  }
};

export const EXPIRY_LOGIC = {
  getDaysLeft: (expiryStr) => {
    if (!expiryStr) return null;
    const diff = new Date(expiryStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },
  getState: (days) => {
    if (days === null) return "unknown";
    if (days < 0)     return "expired";
    if (days <= 1)    return "critical";
    if (days <= 3)    return "warning";
    return "healthy";
  },
  getColor: (state) => {
    if (state === "healthy")  return "text-success";
    if (state === "warning")  return "text-warning";
    if (state === "critical") return "text-danger";
    if (state === "expired")  return "text-danger";
    return "text-textSecondary";
  },
  getBg: (state) => {
    if (state === "healthy")  return "bg-success/10";
    if (state === "warning")  return "bg-warning/10";
    if (state === "critical") return "bg-danger/10";
    if (state === "expired")  return "bg-danger/15";
    return "bg-border/40";
  },
  getLabel: (days, state) => {
    if (state === "unknown")  return "No Expiry Set";
    if (state === "expired")  return `Expired ${Math.abs(days)}d Ago`;
    if (days === 0)           return "Expires Today";
    if (days === 1)           return "Expires Tomorrow";
    return `${days} Days Left`;
  }
};

