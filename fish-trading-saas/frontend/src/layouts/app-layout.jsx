// AppLayout renders nested /app routes via Outlet
import React from "react";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <div className="app-layout">
      <Outlet />
    </div>
  );
};

export default AppLayout;
