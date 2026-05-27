import React from 'react';


const statusColors = {
  Paid: 'bg-green-100 text-green-700',
  Completed: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-800',
  Delivered: 'bg-yellow-100 text-yellow-800',
  Failed: 'bg-red-100 text-red-700',
  Cancelled: 'bg-red-100 text-red-700',
  Created: 'bg-blue-100 text-blue-800',
};

export default function OrderStatusBadge({ status }) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold transition-all duration-200 ${color}`}>
      {status}
    </span>
  );
}
