import React from "react";

export default function CTA() {
  return (
    <section className="py-12 px-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Start Managing Your Business Today</h2>
      <a
        href="/register"
        className="inline-block bg-primary text-white px-8 py-3 rounded-xl text-lg font-bold shadow hover:bg-primary/90 transition mt-2"
        aria-label="Start Free Trial"
      >
        Get Started
      </a>
      <span className="mx-2">or</span>
      <a
        href="/login"
        className="inline-block border border-primary text-primary px-8 py-3 rounded-xl text-lg font-bold shadow hover:bg-primary hover:text-white transition mt-2"
      >
        Login
      </a>
    </section>
  );
}
