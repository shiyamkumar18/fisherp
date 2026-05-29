import { useState } from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { Building2, Shield, CreditCard, CheckCircle } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsPage() {
  const { user, entitlements } = useAuthStore();
  const { canManageCompanySettings, canManageSubscription, canManageSecurity } = usePermission();
  const [activeTab, setActiveTab] = useState("company");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Tenant Settings</h2>
        <p className="text-sm text-textSecondary">Manage your company workspace, subscriptions, and system preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 space-y-1">
          <button
            onClick={() => setActiveTab("company")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === "company" ? "bg-primary text-white" : "text-textSecondary hover:bg-border/30 hover:text-textPrimary"}`}
          >
            <Building2 size={16} /> Company Details
          </button>
          
          {canManageSubscription() && (
            <button
              onClick={() => setActiveTab("subscription")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === "subscription" ? "bg-primary text-white" : "text-textSecondary hover:bg-border/30 hover:text-textPrimary"}`}
            >
              <CreditCard size={16} /> Subscription & Billing
            </button>
          )}

          {canManageSecurity() && (
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === "security" ? "bg-primary text-white" : "text-textSecondary hover:bg-border/30 hover:text-textPrimary"}`}
            >
              <Shield size={16} /> Security Settings
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === "company" && (
            <Card className="space-y-6">
              <h3 className="text-lg font-bold border-b border-border pb-3">Company Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-textSecondary mb-1.5">Company Name</label>
                  <input type="text" disabled value={user?.company_name || "Unknown Company"} className="w-full px-3 py-2 border border-border rounded-lg bg-border/20 text-textPrimary" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-textSecondary mb-1.5">Tenant Slug (Workspace URL)</label>
                  <input type="text" disabled value={user?.tenant_slug || "N/A"} className="w-full px-3 py-2 border border-border rounded-lg bg-border/20 text-textPrimary font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-textSecondary mb-1.5">Your Role</label>
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full capitalize">{user?.role || "User"}</span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "subscription" && canManageSubscription() && (
            <Card className="space-y-6">
              <h3 className="text-lg font-bold border-b border-border pb-3">Active Subscriptions</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-primary flex items-center gap-2">
                      <CheckCircle size={16} /> Current Plan Active
                    </h4>
                    <p className="text-sm text-textSecondary mt-1">You are subscribed to the platform.</p>
                  </div>
                  <Button variant="outline">Upgrade Plan</Button>
                </div>
                
                <div>
                  <h4 className="font-bold text-sm mb-2 text-textSecondary uppercase tracking-wider">Your Enabled Features</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {entitlements?.length > 0 ? entitlements.map((ent, i) => (
                      <div key={i} className="px-3 py-2 border border-border rounded-lg bg-surface text-xs font-bold text-textPrimary flex items-center gap-2">
                        <CheckCircle size={14} className="text-success" />
                        <span className="capitalize">{ent.replace(/_/g, ' ')}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-textSecondary italic">No special entitlements active.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "security" && canManageSecurity() && (
            <Card className="space-y-6">
              <h3 className="text-lg font-bold border-b border-border pb-3">Security & Alerts</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="font-bold text-sm">Email Login Alerts</p>
                    <p className="text-xs text-textSecondary">Receive an email when a new device logs in.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="font-bold text-sm">Require 2FA for Managers</p>
                    <p className="text-xs text-textSecondary">Enforce 2FA for all staff with manager role.</p>
                  </div>
                  <input type="checkbox" className="h-4 w-4" />
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
