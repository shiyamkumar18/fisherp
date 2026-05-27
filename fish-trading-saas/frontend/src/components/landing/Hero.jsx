

import { motion } from "framer-motion";
import Container from "../ui/Container";

export default function Hero() {

  return (
    <motion.section
      className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-24"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <Container className="text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-12 leading-tight">
          Manage Your Fish Trading Business Effortlessly
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto mb-12">
          Inventory, orders, payments — all in one modern SaaS platform.
        </p>
        <div className="flex justify-center gap-6 mb-12">
          <a
            href="/register"
            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold shadow-md hover:scale-105 transition"
            aria-label="Start Free Trial"
          >
            Start Free Trial
          </a>
          <a
            href="#demo"
            className="border border-white px-6 py-3 rounded-xl font-semibold text-white hover:bg-white/10 transition"
            aria-label="View Demo"
          >
            View Demo
          </a>
        </div>
        {/* Visual: Product screenshot or illustration */}
        <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 bg-white/10 backdrop-blur-sm">
          <img
            src="/demo-screenshot.png"
            alt="FisherP Product Preview"
            className="w-full h-auto object-cover"
            style={{ minHeight: 220 }}
          />
        </div>
      </Container>
    </motion.section>
  );
}
