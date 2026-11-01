import { useState, useEffect } from "react";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { fetchProfile, updateProfile } from "@/services/profileService";
import { apiClient } from "@/services/apiClient";
import { 
  User, Phone, Mail, Shield, CheckCircle, 
  MapPin, Briefcase, Key, History, Globe, 
  Lock, Settings, Bell, Monitor, Activity, UserCog
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

export default function ProfilePage() {
  const { session, login } = useAuthStore();
  const { push } = useToast();
  const { roleLevel } = usePermission();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data State
  const [profile, setProfile] = useState({});
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Form State
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    department: "", employee_id: "", timezone: "UTC", language: "en", theme: "system", address: "", emergency_contact: "",
    work_preferences: { default_view: "dashboard", start_page: "/dashboard" },
    notification_settings: { email_alerts: true, sms_alerts: false }
  });

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchProfile();
        setProfile(data);
        setForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone: data.phone || data.phone_number || "",
          department: data.department || "",
          employee_id: data.employee_id || "",
          timezone: data.timezone || "UTC",
          language: data.language || "en",
          theme: data.theme || "system",
          address: data.address || "",
          emergency_contact: data.emergency_contact || "",
          work_preferences: data.work_preferences || { default_view: "dashboard" },
          notification_settings: data.notification_settings || { email_alerts: true },
        });

        // Load sessions
        try {
            const sessRes = await apiClient.get('/auth/sessions/');
            if(sessRes.data) setSessions(sessRes.data);
        } catch(e) {}
        
        // Load audit logs (limit 5 for profile)
        try {
            const auditRes = await apiClient.get('/platform/audit/logs/?limit=5');
            if(auditRes.data && auditRes.data.results) setAuditLogs(auditRes.data.results);
        } catch(e) {}
        
      } catch (e) {
        push({ message: "Failed to load profile", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [push]);

  const handleSave = async (section = null) => {
    if (!session) return;
    setSaving(true);
    try {
      const payload = { ...form };
      const updated = await updateProfile(payload);
      setProfile(updated.user || updated);
      login({ ...session, user: { ...session.user, ...(updated.user || updated) } });
      push({ message: "Profile updated successfully.", type: "success" });
    } catch (e) {
      push({ message: "Error updating profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutDevice = async (sessionId) => {
    try {
        await apiClient.delete('/auth/sessions/', { data: { session_id: sessionId } });
        setSessions(sessions.filter(s => s.id !== sessionId));
        push({ message: "Device logged out successfully.", type: "success" });
    } catch(e) {
        push({ message: "Failed to logout device.", type: "error" });
    }
  };

  if (loading) return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">My Profile</h2>
        <p className="text-sm text-textSecondary">Manage your ERP profile, preferences, and security settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 space-y-1 flex-shrink-0">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "personal", label: "Personal Info", icon: Briefcase },
            { id: "security", label: "Security & Sessions", icon: Shield },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "preferences", label: "Work Preferences", icon: Settings },
            { id: "history", label: "Activity History", icon: History },
            { id: "permissions", label: "My Permissions", icon: UserCog },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                activeTab === tab.id 
                  ? "bg-primary text-white" 
                  : "text-textSecondary hover:bg-border/30 hover:text-textPrimary"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <Card className="flex flex-col md:flex-row items-center gap-6 p-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold uppercase overflow-hidden border-2 border-primary/20">
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile.first_name ? profile.first_name[0] : profile.username?.[0]
                  )}
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h3 className="text-2xl font-extrabold">{profile.first_name} {profile.last_name}</h3>
                  <p className="text-sm text-textSecondary font-medium">{profile.email}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full uppercase tracking-wider">
                      {profile.role_display || profile.role}
                    </span>
                    {profile.department && (
                      <span className="px-3 py-1 bg-secondary text-white font-bold text-xs rounded-full uppercase tracking-wider">
                        {profile.department}
                      </span>
                    )}
                    {profile.is_suspended && (
                      <span className="px-3 py-1 bg-danger/10 text-danger font-bold text-xs rounded-full uppercase tracking-wider">
                        Suspended
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4 space-y-1">
                  <p className="text-xs font-bold text-textSecondary uppercase">Tenant</p>
                  <p className="font-bold truncate">{profile.company_name || 'N/A'}</p>
                </Card>
                <Card className="p-4 space-y-1">
                  <p className="text-xs font-bold text-textSecondary uppercase">2FA Status</p>
                  <p className={`font-bold ${profile.two_factor_enabled ? 'text-success' : 'text-warning'}`}>
                    {profile.two_factor_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </Card>
                <Card className="p-4 space-y-1">
                  <p className="text-xs font-bold text-textSecondary uppercase">Last Active</p>
                  <p className="font-bold">{sessions.length > 0 ? new Date(sessions[0].last_activity).toLocaleDateString() : 'N/A'}</p>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: PERSONAL INFO */}
          {activeTab === "personal" && (
            <Card className="space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary" /> Personal & Work Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">First Name</label>
                  <Input value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Last Name</label>
                  <Input value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Employee ID</label>
                  <Input value={form.employee_id} onChange={(e) => setForm(p => ({ ...p, employee_id: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Department</label>
                  <Input value={form.department} onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Emergency Contact</label>
                  <Input value={form.emergency_contact} onChange={(e) => setForm(p => ({ ...p, emergency_contact: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Address</label>
                  <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              
              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={() => handleSave()} loading={saving}>Save Changes</Button>
              </div>
            </Card>
          )}

          {/* TAB: SECURITY & SESSIONS */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <Card className="space-y-4">
                <div className="border-b border-border pb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Lock size={18} className="text-primary" /> Password & 2FA</h3>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-border rounded-xl bg-surface gap-4">
                  <div>
                    <h4 className="font-bold text-sm">Two-Factor Authentication</h4>
                    <p className="text-xs text-textSecondary mt-1">Protect your account with an extra layer of security.</p>
                  </div>
                  {profile.two_factor_enabled ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 px-3 py-1.5 rounded-full">
                      <CheckCircle size={14} /> Enabled
                    </span>
                  ) : (
                    <Button variant="outline" size="sm">Enable 2FA</Button>
                  )}
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-border rounded-xl bg-surface gap-4">
                  <div>
                    <h4 className="font-bold text-sm">Change Password</h4>
                    <p className="text-xs text-textSecondary mt-1">Update your password regularly to keep your account secure.</p>
                  </div>
                  <Button variant="outline" size="sm">Update Password</Button>
                </div>
              </Card>

              <Card className="space-y-4">
                <div className="border-b border-border pb-4 flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Monitor size={18} className="text-primary" /> Active Sessions</h3>
                  {sessions.length > 1 && (
                    <Button variant="danger" size="sm" onClick={() => handleLogoutDevice('all')}>Logout All Other Devices</Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-textSecondary">No session data available.</p>
                  ) : (
                    sessions.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-4 border border-border rounded-xl bg-surface">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{s.device_type || 'Unknown Device'}</span>
                            {s.is_current && <span className="text-[10px] uppercase font-bold bg-success/20 text-success px-2 py-0.5 rounded-full">Current</span>}
                          </div>
                          <span className="text-xs text-textSecondary">{s.ip_address} • Last active: {new Date(s.last_activity).toLocaleString()}</span>
                        </div>
                        {!s.is_current && (
                          <Button variant="outline" size="sm" onClick={() => handleLogoutDevice(s.id)}>Logout</Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <Card className="space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><Bell size={18} className="text-primary" /> Notification Settings</h3>
              </div>
              
              <div className="space-y-4">
                {[
                  { id: 'email_alerts', title: "Email Alerts", desc: "Receive daily summaries and critical alerts via email." },
                  { id: 'sms_alerts', title: "SMS Alerts", desc: "Receive instant SMS for high-value orders and payment failures." },
                  { id: 'inventory_alerts', title: "Low Stock Warnings", desc: "Notify when fish stock falls below minimum threshold." },
                  { id: 'price_alerts', title: "Market Price Changes", desc: "Get notified when average market prices fluctuate significantly." }
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-surface hover:border-primary/50 transition-colors">
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-textSecondary mt-1">{item.desc}</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 accent-primary cursor-pointer"
                      checked={form.notification_settings?.[item.id] || false}
                      onChange={(e) => setForm({
                        ...form, 
                        notification_settings: { ...form.notification_settings, [item.id]: e.target.checked }
                      })}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={() => handleSave()} loading={saving}>Save Preferences</Button>
              </div>
            </Card>
          )}

          {/* TAB: WORK PREFERENCES */}
          {activeTab === "preferences" && (
            <Card className="space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><Globe size={18} className="text-primary" /> Regional & Work Preferences</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Language</label>
                  <select 
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                    value={form.language}
                    onChange={(e) => setForm(p => ({ ...p, language: e.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="ml">Malayalam (മലയാളം)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Timezone</label>
                  <select 
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                    value={form.timezone}
                    onChange={(e) => setForm(p => ({ ...p, timezone: e.target.value }))}
                  >
                    <option value="UTC">UTC (Default)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Theme</label>
                  <select 
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                    value={form.theme}
                    onChange={(e) => setForm(p => ({ ...p, theme: e.target.value }))}
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Default Startup Page</label>
                  <select 
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                    value={form.work_preferences?.start_page || "/dashboard"}
                    onChange={(e) => setForm(p => ({ ...p, work_preferences: { ...p.work_preferences, start_page: e.target.value } }))}
                  >
                    <option value="/dashboard">Dashboard</option>
                    <option value="/sales">Sales / POS</option>
                    <option value="/purchases">Purchases</option>
                    <option value="/inventory">Inventory</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={() => handleSave()} loading={saving}>Save Preferences</Button>
              </div>
            </Card>
          )}

          {/* TAB: PERMISSIONS */}
          {activeTab === "permissions" && (
            <Card className="space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><UserCog size={18} className="text-primary" /> My Capabilities</h3>
                <p className="text-xs text-textSecondary mt-1">This is a read-only view of what you can do based on your role ({profile.role_display}).</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Financials", allowed: profile.can_view_financials || roleLevel >= 3 },
                  { title: "Staff Management", allowed: profile.can_manage_users || roleLevel >= 4 },
                  { title: "Delete Records", allowed: profile.can_delete_records || roleLevel >= 4 },
                  { title: "Sales Operations", allowed: roleLevel >= 2 },
                  { title: "Inventory & Purchases", allowed: roleLevel >= 1 },
                ].map((perm, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-surface">
                    {perm.allowed ? (
                      <CheckCircle size={18} className="text-success" />
                    ) : (
                      <Lock size={18} className="text-textSecondary/50" />
                    )}
                    <span className={`text-sm font-bold ${perm.allowed ? 'text-textPrimary' : 'text-textSecondary/70'}`}>
                      {perm.title}
                    </span>
                  </div>
                ))}
              </div>
              
              {profile.granular_permissions && Object.keys(profile.granular_permissions).length > 0 && (
                <div className="mt-4 p-4 border border-warning/30 bg-warning/5 rounded-lg">
                  <h4 className="text-sm font-bold text-warning flex items-center gap-2 mb-2">
                    <Shield size={14} /> Custom Overrides Active
                  </h4>
                  <ul className="text-xs text-textSecondary list-disc pl-5 space-y-1">
                    {Object.entries(profile.granular_permissions).map(([key, val]) => (
                      <li key={key}><strong>{key}</strong>: {val ? 'Allowed' : 'Denied'}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {/* TAB: ACTIVITY HISTORY */}
          {activeTab === "history" && (
            <Card className="space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><Activity size={18} className="text-primary" /> Recent Activity</h3>
              </div>
              
              <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-textSecondary text-center py-4">No recent activity found.</p>
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 border border-border rounded-xl bg-surface">
                      <div className="mt-1">
                        <Activity size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold capitalize">{log.action} {log.model_name}</p>
                        <p className="text-xs text-textSecondary mt-1">{log.object_repr}</p>
                        <p className="text-[10px] text-textSecondary mt-2 uppercase tracking-wider font-bold">
                          {new Date(log.timestamp).toLocaleString()} • IP: {log.ip_address}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
