// frontend/src/utils/platform-mocks.js

// Generates fallback data for enterprise platform metrics not yet available via API

export const generateMockSlaData = () => ({
  openUrgent: Math.floor(Math.random() * 5),
  breached: Math.floor(Math.random() * 3),
  avgResolutionHrs: (Math.random() * 4 + 1).toFixed(1),
  recentTickets: Array.from({ length: 5 }).map((_, i) => ({
    id: `TCK-${8000 + i}`,
    tenant: `Tenant ${String.fromCharCode(65 + i)}`,
    priority: i === 0 ? "Urgent" : i < 3 ? "High" : "Normal",
    agent: ["Sarah", "Mike", "John", "Unassigned"][Math.floor(Math.random() * 4)],
    timeRemaining: i === 0 ? "Breached" : `${Math.floor(Math.random() * 8 + 1)}h`,
  }))
});

export const generateMockBillingRisk = () => ({
  failedRenewals: Math.floor(Math.random() * 4),
  retryPending: Math.floor(Math.random() * 5),
  overdueAmount: Math.floor(Math.random() * 50000) + 5000,
  expiring7Days: Math.floor(Math.random() * 12) + 2,
  nextMonthProjected: Math.floor(Math.random() * 2000000) + 1000000,
});

export const generateMockSecurityAlerts = (auditLogs = []) => {
  // If we have real audit logs, we can parse them, but here we provide fallbacks
  const mockAlerts = [
    { type: "Suspicious Login", count: Math.floor(Math.random() * 3) },
    { type: "Permission Denied", count: Math.floor(Math.random() * 10) },
    { type: "Webhook Failure", count: Math.floor(Math.random() * 2) },
  ];
  const total = mockAlerts.reduce((sum, a) => sum + a.count, 0);
  return { alerts: mockAlerts, total };
};

export const generateMockFunnel = (totalTenants = 100) => ({
  signups: Math.floor(totalTenants * 1.5),
  trials: Math.floor(totalTenants * 1.2),
  activated: totalTenants,
  paid: Math.floor(totalTenants * 0.8),
  renewed: Math.floor(totalTenants * 0.6),
});

export const generateMockMrrTrend = (currentMrr = 1000000) => {
  return Array.from({ length: 6 }).map((_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const randomVariation = 1 + (Math.random() * 0.1 - 0.05);
    const mrrForMonth = currentMrr * Math.pow(0.95, 5 - i) * randomVariation;
    return {
      name: month.toLocaleString('default', { month: 'short' }),
      mrr: Math.round(mrrForMonth),
      churn: Math.round(mrrForMonth * 0.05),
    };
  });
};
