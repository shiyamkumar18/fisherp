
import React from "react";
import { motion } from "framer-motion";
import Container from "../ui/Container";


export default function ProductPreview() {
  return (
    <motion.section
      className="py-24 bg-gradient-to-b from-white to-gray-50"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <Container className="text-center">
        <h2 className="text-3xl font-bold mb-12">
          See FisherP in Action
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-12">
          Experience the platform as your users will. Instantly preview the FisherP dashboard and features in action.
        </p>
        <motion.div
          className="relative mx-auto max-w-4xl rounded-2xl shadow-2xl bg-white/80 backdrop-blur-lg p-2 md:p-6 transition-transform duration-300 hover:shadow-3xl hover:-translate-y-1"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <motion.img
            src="https://via.placeholder.com/1200x600"
            alt="FisherP product preview"
            className="rounded-xl w-full aspect-video object-cover shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          />
          {/* Play button overlay for demo video feel */}
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center focus:outline-none group"
            tabIndex={-1}
            aria-label="Play demo video"
            style={{ pointerEvents: 'none' }}
          >
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/80 backdrop-blur border-2 border-white shadow-lg group-hover:scale-105 transition-transform">
              <svg
                className="w-10 h-10 text-blue-500"
                fill="currentColor"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
                <polygon points="20,16 36,24 20,32" fill="currentColor" />
              </svg>
            </span>
          </button>
        </motion.div>
      </Container>
    </motion.section>
  );
}
