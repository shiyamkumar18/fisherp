// PlatformDashboard.jsx
import React from 'react';

const PlatformDashboard = () => (
  <div className="platform-dashboard">
    {/* Topbar */}
    <header className="topbar">
      <div className="platform-title">FisherP Platform Admin</div>
      <div className="topbar-actions">
        <span className="notifications">🔔</span>
        <span className="profile">👤</span>
      </div>
    </header>
    {/* Sidebar */}
    <aside className="sidebar">
      <ul>
        <li>Dashboard</li>
        <li>Companies</li>
        <li>Revenue</li>
        <li>Users</li>
        <li>Subscriptions</li>
      </ul>
    </aside>
    {/* Main Content */}
    <main className="main-content">
      <h2>Total Companies</h2>
      {/* Companies content here */}
      <h2>Revenue</h2>
      {/* Revenue content here */}
      <h2>Active Users</h2>
      {/* Users content here */}
      <h2>Subscriptions</h2>
      {/* Subscriptions content here */}
    </main>
  </div>
);

export default PlatformDashboard;
