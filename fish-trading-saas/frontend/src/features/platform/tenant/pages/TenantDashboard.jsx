// TenantDashboard.jsx
import React from 'react';

const TenantDashboard = () => (
  <div className="tenant-dashboard">
    {/* Topbar */}
    <header className="topbar">
      <div className="company-name">Company Name</div>
      <div className="topbar-actions">
        <span className="notifications">🔔</span>
        <span className="profile">👤</span>
      </div>
    </header>
    {/* Sidebar */}
    <aside className="sidebar">
      <ul>
        <li>Dashboard</li>
        <li>Purchase</li>
        <li>Sales</li>
        <li>Suppliers</li>
        <li>Products</li>
      </ul>
    </aside>
    {/* Main Content */}
    <main className="main-content">
      <h2>Orders</h2>
      {/* Orders content here */}
      <h2>Sales</h2>
      {/* Sales content here */}
      <h2>Purchases</h2>
      {/* Purchases content here */}
      <h2>Inventory</h2>
      {/* Inventory content here */}
    </main>
  </div>
);

export default TenantDashboard;
