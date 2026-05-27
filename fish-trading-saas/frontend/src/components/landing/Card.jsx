import React from "react";

export default function Card({ title, children }) {
  return (
    <div className="relative rounded-2xl p-6 flex flex-col items-center text-center border border-transparent bg-white/70 backdrop-blur-md shadow-lg hover:shadow-2xl transition duration-300 animate-fade-in"
      style={{
        borderImage: 'linear-gradient(135deg, #2563eb 0%, #a5b4fc 100%) 1',
      }}
    >
      <div className="text-xl font-bold mb-2 text-blue-700">{title}</div>
      {children && <div className="text-gray-600 text-base">{children}</div>}
    </div>
  );
}
/* Add fade-in animation to globals.css if not present */
