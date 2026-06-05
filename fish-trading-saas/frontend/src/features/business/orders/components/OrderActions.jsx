import React from 'react';

export default function OrderActions({ order, markDelivered, recordPayment, loading }) {
  return (
    <div className="flex gap-2">
      {order.status === 'Created' && (
        <button
          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-60"
          onClick={() => markDelivered(order.id)}
          disabled={loading === 'delivered'}
        >
          {loading === 'delivered' ? 'Marking...' : 'Mark Delivered'}
        </button>
      )}
      {order.status === 'Delivered' && (
        <button
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
          onClick={() => recordPayment(order.id)}
          disabled={loading === 'payment'}
        >
          {loading === 'payment' ? 'Recording...' : 'Record Payment'}
        </button>
      )}
    </div>
  );
}
