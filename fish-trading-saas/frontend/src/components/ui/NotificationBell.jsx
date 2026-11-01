import React, { useState, useRef, useEffect } from "react";

// Dummy notifications for UI demo
const demoNotifications = [
  { id: 1, type: "low_stock", message: "Low stock: Prawn", read: false },
  { id: 2, type: "payment_received", message: "Payment received: ₹10,000", read: false },
  { id: 3, type: "order_created", message: "Order created: #1234", read: true },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(demoNotifications);
  const bellRef = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={bellRef}>
      <button
        className="relative text-2xl focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <span role="img" aria-label="bell">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white shadow-lg rounded p-3 z-50">
          <h4 className="font-bold mb-2">Notifications</h4>
          {notifications.length === 0 ? (
            <div className="text-gray-500">No notifications</div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className={`p-2 rounded ${n.read ? "bg-gray-100" : "bg-blue-50"}`}>
                  <span className="block text-sm">{n.message}</span>
                  <span className="block text-xs text-gray-400 mt-1">{n.type.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
