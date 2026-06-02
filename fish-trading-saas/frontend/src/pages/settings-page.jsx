import { useState, useEffect } from "react";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { apiClient } from "@/services/apiClient";
import { 
  Building2, Users, User, UserCog, Network, CreditCard, 
  Package, ShoppingCart, ShoppingBag, Banknote, Briefcase,
  MessageCircle, Mic, LineChart, Shield, History,
  Save, CheckCircle, Search, Plus, Settings, AlertCircle, Edit2
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { canManageCompanySettings, canManageStaff } = usePermission();
  const { push } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  
  const [company, setCompany] = useState({});
  const [settings, setSettings] = useState({});
  const [staff, setStaff] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchAudit, setSearchAudit] = useState("");

  // Staff Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: '', email: '', phone: '', role: 'staff',
    granular_permissions: {}
  });
  const [editingStaffId, setEditingStaffId] = useState(null);

  // Maps frontend role value → DB Role.name
  const ROLE_DB_NAME_MAP = {
    'tenant_admin':      'Tenant Admin',
    'branch_manager':    'Branch Manager',
    'finance_manager':   'Finance Manager',
    'accountant':        'Accountant',
    'purchase_manager':  'Purchase Manager',
    'auction_manager':   'Auction Manager',
    'inventory_manager': 'Inventory Manager',
    'supervisor':        'Supervisor',
    'sales_staff':       'Sales Staff',
    'trader':            'Trader',
    'store':             'Store / Inventory Staff',
    'staff':             'Staff',
    'viewer':            'Viewer',
  };

  const ROLES = [
    { value: 'tenant_admin',      label: 'Tenant Admin' },
    { value: 'branch_manager',    label: 'Branch Manager' },
    { value: 'finance_manager',   label: 'Finance Manager' },
    { value: 'accountant',        label: 'Accountant' },
    { value: 'purchase_manager',  label: 'Purchase Manager' },
    { value: 'auction_manager',   label: 'Auction Manager' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'supervisor',        label: 'Supervisor' },
    { value: 'sales_staff',       label: 'Sales Staff' },
    { value: 'trader',            label: 'Trader' },
    { value: 'store',             label: 'Store / Inventory' },
    { value: 'staff',             label: 'Staff' },
    { value: 'viewer',            label: 'Viewer' }
  ];

  const MODULES = [
    'dashboard', 'sales', 'purchases', 'inventory', 'accounting',
    'catalog', 'orders', 'reports', 'users', 'settings', 'customers',
    'suppliers', 'payments', 'financials', 'auctions', 'fish_trading',
    'crm', 'branches', 'warehouse', 'notifications', 'audit_logs'
  ];

  // Columns shown in the permission table
  const PERM_COLUMNS = [
    { key: 'view',             label: 'View' },
    { key: 'create',           label: 'Create' },
    { key: 'edit',             label: 'Edit' },
    { key: 'delete',           label: 'Delete' },
    { key: 'approve',          label: 'Approve' },
    { key: 'export',           label: 'Export' },
    { key: 'financial_access', label: 'Finance' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [compRes, staffRes, auditRes] = await Promise.all([
          apiClient.get('/companies/details/'),
          apiClient.get('/auth/tenant-users/'),
          apiClient.get('/platform/audit/logs/?limit=50')
      ].map(p => p.catch(() => ({ data: [] }))));

      if (compRes.data) {
          setCompany(compRes.data);
          setSettings(compRes.data.settings || {});
      }
      if (staffRes.data) setStaff(staffRes.data);
      if (auditRes.data && auditRes.data.results) setAuditLogs(auditRes.data.results);
    } catch (e) {
      console.error(e);
      push({ message: "Failed to load settings data.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetch default permissions for a role from the backend and return them
   * as a granular_permissions object: { module: { action: bool } }
   */
  async function fetchRoleDefaults(roleValue) {
    const dbRoleName = ROLE_DB_NAME_MAP[roleValue];
    if (!dbRoleName) return {};
    try {
      setLoadingRolePerms(true);
      const res = await apiClient.get(`/permissions/roles/${encodeURIComponent(dbRoleName)}/`);
      // res.data.permissions: { module: { action: bool } }
      const perms = res.data.permissions || {};
      const filtered = {};
      for (const mod of MODULES) {
        const modPerms = perms[mod] || {};
        filtered[mod] = {};
        for (const col of PERM_COLUMNS) {
          filtered[mod][col.key] = modPerms[col.key] || false;
        }
      }
      return filtered;
    } catch (err) {
      console.warn('Could not fetch role defaults:', err);
      return {};
    } finally {
      setLoadingRolePerms(false);
    }
  }

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      const payload = {
        ...company,
        settings: settings
      };
      await apiClient.put('/companies/details/', payload);
      push({ message: "Settings saved successfully.", type: "success" });
    } catch(e) {
      push({ message: "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (module, key, val) => {
    setSettings(prev => ({
        ...prev,
        [module]: {
            ...prev[module],
            [key]: val
        }
    }));
  };

  const handleOpenCreateStaff = async () => {
    setEditingStaffId(null);
    const defaultPerms = await fetchRoleDefaults('staff');
    setStaffForm({ username: '', email: '', phone: '', role: 'staff', granular_permissions: defaultPerms });
    setStaffModalOpen(true);
  };

  const handleOpenEditStaff = async (s) => {
    setEditingStaffId(s.id);
    const hasPerms = s.granular_permissions && Object.keys(s.granular_permissions).length > 0;
    // Open the modal immediately with whatever we have (no frozen wait)
    setStaffForm({
      username: s.username, email: s.email, phone: s.phone, role: s.role,
      granular_permissions: s.granular_permissions || {}
    });
    setStaffModalOpen(true);
    // If this user has no saved permissions, load defaults in the background
    // The spinner will show inside the already-open modal
    if (!hasPerms) {
      const perms = await fetchRoleDefaults(s.role);
      setStaffForm(prev => ({ ...prev, granular_permissions: perms }));
    }
  };

  /**
   * When the role dropdown changes:
   * 1. Update the role value immediately
   * 2. Fetch & pre-fill the default permission matrix for that role
   */
  const handleRoleChange = async (newRole) => {
    setStaffForm(prev => ({ ...prev, role: newRole }));
    const defaults = await fetchRoleDefaults(newRole);
    setStaffForm(prev => ({ ...prev, role: newRole, granular_permissions: defaults }));
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.username?.trim() || !staffForm.email?.trim()) {
      push({ message: "Username and email are required.", type: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingStaffId) {
        await apiClient.put('/auth/tenant-users/', { ...staffForm, user_id: editingStaffId });
        push({ message: "Staff member updated successfully.", type: "success" });
      } else {
        await apiClient.post('/auth/tenant-users/', staffForm);
        push({ message: "Staff member created successfully.", type: "success" });
      }
      setStaffModalOpen(false);
      loadData();
    } catch(err) {
      push({ message: err?.response?.data?.error || err?.message || "Failed to save staff member.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePerm = (module, action) => {
    setStaffForm(prev => {
      const currentMod = prev.granular_permissions[module] || {};
      const nextMod = { ...currentMod, [action]: !currentMod[action] };
      return {
        ...prev,
        granular_permissions: { ...prev.granular_permissions, [module]: nextMod }
      };
    });
  };

  const filteredAuditLogs = auditLogs.filter(log => 
    log.action?.toLowerCase().includes(searchAudit.toLowerCase()) || 
    log.model_name?.toLowerCase().includes(searchAudit.toLowerCase()) ||
    log.user__username?.toLowerCase().includes(searchAudit.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center text-textSecondary font-bold animate-pulse">Loading Workspace Settings...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary tracking-tight">System Settings</h1>
          <p className="text-sm text-textSecondary">Manage your ERP workspace, organizational profile, users, and module policies.</p>
        </div>
        {canManageCompanySettings() && (
          <Button onClick={handleSaveCompany} loading={saving} className="flex items-center gap-2 px-6 h-11">
            <Save size={16}/> Save Global Settings
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SIDEBAR NAVIGATION */}
        <div className="lg:col-span-3 sticky top-6">
          <Card className="p-3 space-y-1 bg-surface border-border shadow-sm">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">General</div>
            <button 
              onClick={() => setActiveTab("company")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'company' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-surfaceHover hover:text-textPrimary'}`}
            >
              <Building2 size={16} /> Workspace Profile
            </button>
            
            {canManageStaff() && (
              <button 
                onClick={() => setActiveTab("staff")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'staff' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-surfaceHover hover:text-textPrimary'}`}
              >
                <Users size={16} /> Staff & Roles
              </button>
            )}

            <div className="px-3 py-2 mt-4 text-[10px] font-black uppercase tracking-wider text-textSecondary">Module Policies</div>
            {[
              { id: "sales", icon: ShoppingCart, label: "Sales Rules" },
              { id: "purchase", icon: ShoppingBag, label: "Purchase Rules" },
              { id: "inventory", icon: Package, label: "Inventory Rules" },
              { id: "payment", icon: Banknote, label: "Financial Rules" }
            ].map(m => (
              <button 
                key={m.id}
                onClick={() => setActiveTab(m.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === m.id ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-surfaceHover hover:text-textPrimary'}`}
              >
                <m.icon size={16} /> {m.label}
              </button>
            ))}
            
            <div className="px-3 py-2 mt-4 text-[10px] font-black uppercase tracking-wider text-textSecondary">Security & Logs</div>
            <button 
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'audit' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-surfaceHover hover:text-textPrimary'}`}
            >
              <History size={16} /> Audit Trail
            </button>
          </Card>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="lg:col-span-9 min-w-0 space-y-6">
          
          {/* TAB: COMPANY SETTINGS */}
          {activeTab === "company" && (
            <Card className="p-0 overflow-hidden shadow-sm">
              <div className="bg-surface border-b border-border p-5">
                <h3 className="text-base font-bold flex items-center gap-2"><Building2 size={18} className="text-primary"/> Organization Profile</h3>
                <p className="text-xs text-textSecondary mt-1">Configure your company identity and contact information.</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Company / Organization Name</label>
                    <Input className="h-12 bg-surface" value={company.name || ''} onChange={e => setCompany({...company, name: e.target.value})} disabled={!canManageCompanySettings()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary flex justify-between">
                      <span>Tenant Subdomain ID</span>
                      <span className="text-primary">Read-Only</span>
                    </label>
                    <Input value={company.slug || ''} disabled className="h-12 bg-surface/50 font-mono opacity-80" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Official Phone Number</label>
                    <Input className="h-12 bg-surface" value={company.phone || ''} onChange={e => setCompany({...company, phone: e.target.value})} disabled={!canManageCompanySettings()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Billing Email Address</label>
                    <Input className="h-12 bg-surface" value={company.email || ''} onChange={e => setCompany({...company, email: e.target.value})} disabled={!canManageCompanySettings()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Tax ID / GST Number</label>
                    <Input className="h-12 bg-surface" value={company.gst || ''} onChange={e => setCompany({...company, gst: e.target.value})} disabled={!canManageCompanySettings()} />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Registered Address</label>
                    <Input className="h-12 bg-surface" value={company.address || ''} onChange={e => setCompany({...company, address: e.target.value})} disabled={!canManageCompanySettings()} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB: STAFF MANAGEMENT */}
          {activeTab === "staff" && canManageStaff() && (
            <Card className="p-0 overflow-hidden shadow-sm">
              <div className="bg-surface border-b border-border p-5 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2"><Users size={18} className="text-primary"/> Team Members & Access</h3>
                  <p className="text-xs text-textSecondary mt-1">Manage user accounts and their granular permissions.</p>
                </div>
                <Button onClick={handleOpenCreateStaff} className="flex items-center gap-2 h-10 bg-primary hover:bg-primaryHover text-white">
                  <Plus size={16}/> Add Staff
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-surface/50">
                    <tr>
                      <th className="p-4 border-b border-border text-[10px] uppercase tracking-wider text-textSecondary font-extrabold">User Profile</th>
                      <th className="p-4 border-b border-border text-[10px] uppercase tracking-wider text-textSecondary font-extrabold">Contact Info</th>
                      <th className="p-4 border-b border-border text-[10px] uppercase tracking-wider text-textSecondary font-extrabold">System Role</th>
                      <th className="p-4 border-b border-border text-[10px] uppercase tracking-wider text-textSecondary font-extrabold text-center">Status</th>
                      <th className="p-4 border-b border-border text-[10px] uppercase tracking-wider text-textSecondary font-extrabold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-border/20 transition-colors">
                        <td className="p-4 border-b border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase shadow-inner">
                                {s.username[0]}
                            </div>
                            <span className="font-bold text-sm text-textPrimary">{s.username}</span>
                          </div>
                        </td>
                        <td className="p-4 border-b border-border text-sm text-textSecondary">
                          <div className="flex flex-col">
                            <span className="font-medium text-textPrimary">{s.email}</span>
                            <span className="text-xs">{s.phone || "No phone"}</span>
                          </div>
                        </td>
                        <td className="p-4 border-b border-border">
                          <span className="inline-block px-2.5 py-1 bg-surface border border-border rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                            {s.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 border-b border-border text-center">
                          {s.is_active ? 
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-success/10 text-success border border-success/20 rounded-full text-[10px] font-extrabold uppercase tracking-wider"><CheckCircle size={10}/> Active</span> : 
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-danger/10 text-danger border border-danger/20 rounded-full text-[10px] font-extrabold uppercase tracking-wider"><AlertCircle size={10}/> Suspended</span>
                          }
                        </td>
                        <td className="p-4 border-b border-border text-right">
                          <button onClick={() => handleOpenEditStaff(s)} className="p-2 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center" title="Edit Permissions">
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* DYNAMIC SETTINGS TABS (Sales, Purchase, etc) */}
          {["inventory", "sales", "purchase", "payment"].includes(activeTab) && (
            <Card className="p-0 overflow-hidden shadow-sm">
              <div className="bg-surface border-b border-border p-5">
                <h3 className="text-base font-bold capitalize flex items-center gap-2"><Settings size={18} className="text-primary"/> {activeTab} Policy Rules</h3>
                <p className="text-xs text-textSecondary mt-1">Configure workflow policies, approval chains, and automated rules for {activeTab}.</p>
              </div>
              <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-5 border border-border rounded-xl bg-surface/30 hover:bg-surface/60 transition-colors">
                      <div className="flex-1 pr-4">
                          <p className="font-bold text-sm text-textPrimary flex items-center gap-2">
                            Require Manager Approval
                          </p>
                          <p className="text-xs text-textSecondary mt-1">
                            When enabled, high-value transactions or sensitive operations within the <strong>{activeTab}</strong> module will be flagged and require a manager to review and approve them before they can be fully processed.
                          </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3 border-l border-border pl-6">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-textSecondary">
                            {settings[activeTab]?.require_approval ? "Enabled" : "Disabled"}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={settings[activeTab]?.require_approval || false} 
                              onChange={e => updateSetting(activeTab, 'require_approval', e.target.checked)}
                              disabled={!canManageCompanySettings()}
                            />
                            <div className="w-11 h-6 bg-border/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                          </label>
                      </div>
                  </div>

                  <div className="flex items-center p-4 bg-primary/5 text-primary text-xs font-bold rounded-xl gap-2 border border-primary/10">
                    <AlertCircle size={16} /> 
                    Remember to click "Save Global Settings" at the top right to apply your policy changes!
                  </div>
              </div>
            </Card>
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === "audit" && (
            <Card className="p-0 overflow-hidden shadow-sm">
              <div className="bg-surface border-b border-border p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2"><History size={18} className="text-primary"/> System Audit Trail</h3>
                  <p className="text-xs text-textSecondary mt-1">Immutable ledger of all user actions and data modifications.</p>
                </div>
                <div className="flex items-center gap-2 border border-border px-3 py-2 rounded-xl bg-background shadow-inner w-full md:w-64">
                    <Search size={16} className="text-textSecondary" />
                    <input 
                      type="text" 
                      placeholder="Search audit logs..." 
                      value={searchAudit}
                      onChange={(e) => setSearchAudit(e.target.value)}
                      className="bg-transparent text-sm outline-none w-full text-textPrimary" 
                    />
                </div>
              </div>
              
              <div className="p-0 max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-surface/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-5 py-3 border-b border-border text-[10px] uppercase font-extrabold text-textSecondary tracking-wider">Timestamp</th>
                      <th className="px-5 py-3 border-b border-border text-[10px] uppercase font-extrabold text-textSecondary tracking-wider">User</th>
                      <th className="px-5 py-3 border-b border-border text-[10px] uppercase font-extrabold text-textSecondary tracking-wider">Action</th>
                      <th className="px-5 py-3 border-b border-border text-[10px] uppercase font-extrabold text-textSecondary tracking-wider">Module / Record</th>
                      <th className="px-5 py-3 border-b border-border text-[10px] uppercase font-extrabold text-textSecondary tracking-wider text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-textSecondary">
                          No audit logs found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-surface/50 transition-colors">
                          <td className="px-5 py-3 text-xs text-textSecondary">
                            {new Date(log.timestamp).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-bold text-textPrimary">{log.user__username}</div>
                            <div className="text-[10px] text-textSecondary uppercase tracking-wider">{log.user__role}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                              log.action === 'delete' ? 'bg-danger/10 text-danger' : 
                              log.action === 'create' ? 'bg-success/10 text-success' : 
                              'bg-primary/10 text-primary'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium text-textPrimary capitalize">
                            {log.model_name}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-textSecondary font-mono">
                            {log.ip_address || "Unknown"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* STAFF MANAGEMENT MODAL */}
      <Dialog open={staffModalOpen} onOpenChange={setStaffModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 border-b border-border bg-surface sticky top-0 z-10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <UserCog size={20} className="text-primary"/>
              {editingStaffId ? 'Modify Staff Access Rights' : 'Provision New Staff Member'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStaff} className="p-6 space-y-8">
            
            <section className="space-y-5">
              <h4 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2"><Building2 size={16} className="text-textSecondary"/> Account Credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">System Username *</label>
                  <Input required value={staffForm.username} onChange={e => setStaffForm({...staffForm, username: e.target.value})} disabled={!!editingStaffId} className="h-11 bg-surface" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Email Address *</label>
                  <Input required type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} disabled={!!editingStaffId} className="h-11 bg-surface" />
                </div>
                <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Contact Phone</label>
                  <Input value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="h-11 bg-surface" />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <h4 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2"><Shield size={16} className="text-textSecondary"/> Enterprise Role Assignment</h4>
              <div className="space-y-1.5 md:w-1/2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-textSecondary">Primary Access Tier *</label>
                <div className="relative">
                  <select 
                    required
                    value={staffForm.role}
                    onChange={e => handleRoleChange(e.target.value)}
                    disabled={loadingRolePerms}
                    className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm font-bold text-textPrimary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {loadingRolePerms && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-textSecondary mt-2">
                  Selecting a role auto-fills the default permission matrix below. You can fine-tune individual module access afterward.
                </p>
              </div>
            </section>

            <section className="space-y-5">
              <h4 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2">
                <Settings size={16} className="text-textSecondary"/> 
                Permission Matrix
                {loadingRolePerms && (
                  <span className="text-xs font-normal text-primary animate-pulse ml-2">Loading defaults…</span>
                )}
              </h4>
              <p className="text-xs text-textSecondary bg-surface p-3 rounded-lg border border-border">
                Default permissions are pre-filled from the selected role. Toggle individual cells to override. Changes are saved per-user.
              </p>
              
              <div className="overflow-x-auto border border-border rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface">
                    <tr>
                      <th className="p-3 border-b border-border text-[10px] font-extrabold uppercase tracking-wider text-textSecondary min-w-[130px]">Module</th>
                      {PERM_COLUMNS.map(col => (
                        <th key={col.key} className="p-3 border-b border-border text-[10px] font-extrabold uppercase tracking-wider text-textSecondary text-center">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {MODULES.map(mod => {
                      const perms = staffForm.granular_permissions[mod] || {};
                      const hasAny = PERM_COLUMNS.some(col => perms[col.key]);
                      return (
                        <tr key={mod} className={`transition-colors ${hasAny ? 'hover:bg-primary/5' : 'hover:bg-surface/50'}`}>
                          <td className="p-3 text-xs font-bold uppercase tracking-wider">
                            <span className={`inline-flex items-center gap-1.5 ${hasAny ? 'text-primary' : 'text-textSecondary'}`}>
                              {hasAny && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block flex-shrink-0"/>}
                              {mod.replace(/_/g, ' ')}
                            </span>
                          </td>
                          {PERM_COLUMNS.map(col => (
                            <td key={col.key} className="p-3 text-center">
                              <input
                                type="checkbox"
                                className="accent-primary w-4 h-4 cursor-pointer rounded border-border"
                                checked={perms[col.key] || false}
                                onChange={() => handleTogglePerm(mod, col.key)}
                                disabled={loadingRolePerms}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <DialogFooter className="pt-6 border-t border-border mt-8 flex justify-end gap-3">
              <Button type="button" variant="outline" className="h-11 px-6" onClick={() => setStaffModalOpen(false)}>Discard</Button>
              <Button type="submit" loading={isSubmitting} className="h-11 px-6 shadow-sm">Provision Access</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
