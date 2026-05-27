import React from "react";
import CompanySettings from "./CompanySettings";
import UserProfile from "./UserProfile";

const SettingsPage = () => {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <CompanySettings />
      <UserProfile />
      {/* Theme/branding can be extended here */}
    </div>
  );
};

export default SettingsPage;
