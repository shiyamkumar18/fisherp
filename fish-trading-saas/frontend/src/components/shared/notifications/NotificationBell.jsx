import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, MessageSquare, AlertTriangle, AlertCircle, ShoppingCart, DollarSign, Package } from "lucide-react";
import { api } from "@/services/core/apiClient";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { safeObjectAccess } from "@/utils/security/safeAccess";
import { sanitizeNavigationUrl } from "@/utils/security/safeNavigation";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Polling for unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch full list when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get("/api/notifications/inbox/unread_count/");
      setUnreadCount(data.unread_count || 0);
    } catch (e) {
      console.error("Failed to fetch unread count", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/api/notifications/inbox/");
      setNotifications(data || []);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  const markAsRead = async (id, action_url) => {
    try {
      await api.post(`/api/notifications/inbox/${id}/mark_read/`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setIsOpen(false);
      if (action_url) {
        navigate(sanitizeNavigationUrl(action_url));
      }
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/api/notifications/inbox/mark_all_read/");
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  const getIcon = (iconName, priority) => {
    const props = { size: 16 };
    let colorClass = "text-textSecondary";
    if (priority === 'critical') colorClass = "text-red-500";
    else if (priority === 'high') colorClass = "text-orange-500";
    else if (priority === 'medium') colorClass = "text-yellow-500";

    switch (iconName) {
      case 'MessageSquare': return <MessageSquare className={colorClass} {...props} />;
      case 'AlertTriangle': return <AlertTriangle className={colorClass} {...props} />;
      case 'AlertCircle': return <AlertCircle className={colorClass} {...props} />;
      case 'ShoppingCart': return <ShoppingCart className={colorClass} {...props} />;
      case 'DollarSign': return <DollarSign className={colorClass} {...props} />;
      case 'Package': return <Package className={colorClass} {...props} />;
      default: return <Bell className={colorClass} {...props} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-surfaceHover transition-colors focus:outline-none"
      >
        <Bell size={20} className="text-textSecondary" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-surface shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border shadow-xl rounded-xl overflow-hidden z-50 flex flex-col max-h-[85vh]">
          <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
            <h3 className="font-bold text-textPrimary">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-bold hover:underline">
                Mark all read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <CheckCircle2 size={32} className="text-border mb-3" />
                <p className="text-sm font-bold text-textPrimary">All caught up!</p>
                <p className="text-xs text-textSecondary mt-1">Check back later for updates.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => markAsRead(notif.id, notif.action_url)}
                    className={clsx(
                      "p-4 cursor-pointer transition-colors flex gap-3 items-start group",
                      notif.is_read ? "bg-surface hover:bg-surfaceHover" : "bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    <div className="mt-1 shrink-0 bg-surface border border-border p-1.5 rounded-md shadow-sm">
                      {getIcon(notif.icon, notif.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={clsx("text-sm mb-0.5 font-bold truncate group-hover:text-primary transition-colors", notif.is_read ? "text-textSecondary" : "text-textPrimary")}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-textSecondary line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-textSecondary/70 font-medium mt-1 block">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-border bg-surfaceHover text-center">
            <button className="text-xs font-bold text-textSecondary hover:text-primary w-full py-2">
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
