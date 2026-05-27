import React from "react";

const plans = [
  { name: "Free Trial", price: 0, description: "14 days. All features, no credit card needed" },
  { name: "Starter", price: 499, description: "Up to 3 users, basic reports" },
  { name: "Pro", price: 999, description: "Unlimited users, advanced analytics" },
];

export default function Pricing() {
  return (
    <section className="py-20 px-4 max-w-4xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-10">Pricing</h2>
      <div className="flex flex-col md:flex-row gap-8 justify-center">
        {plans.map((p, i) => (
          <div
            key={p.name}
            className={
              [
                "bg-white rounded-2xl p-8 flex-1 min-w-[220px] border shadow transition-all",
                i === 1
                  ? "border-2 border-blue-600 scale-105 z-10 shadow-xl"
                  : "border border-gray-200 opacity-90 hover:scale-105 hover:shadow-lg",
              ].join(" ")
            }
            style={{ position: i === 1 ? "relative" : undefined }}
          >
            <h3 className="text-xl font-bold mb-2 text-blue-700">{p.name}</h3>
            <div className="text-3xl font-extrabold mb-2">
              {p.price === 0 ? "Free" : `₹${p.price}/mo`}
            </div>
            <p className="text-gray-600 mb-6">{p.description}</p>
            <button
              className={
                i === 1
                  ? "bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold shadow hover:bg-blue-700 transition"
                  : "bg-gray-100 text-blue-700 px-6 py-2 rounded-xl font-semibold shadow hover:bg-blue-50 transition"
              }
            >
              {p.price === 0 ? "Start Free" : "Choose Plan"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
