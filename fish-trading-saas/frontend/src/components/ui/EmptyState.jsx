import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ title = "No Data", description = "", icon: Icon = Inbox, iconColor = "text-gray-300", className = "", children }) {
  return (
    <div className={`flex flex-col items-center justify-center p-10 text-gray-400 animate-fade-in ${className}`}>
      <Icon size={44} className={`mb-3 ${iconColor} animate-bounce`} />
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-gray-500 dark:text-gray-400 mb-2">{description}</p>}
      {children}
    </div>
  );
}
