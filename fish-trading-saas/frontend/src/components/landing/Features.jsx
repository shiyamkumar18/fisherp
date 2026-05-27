
import { motion } from "framer-motion";
import Container from "../ui/Container";

export default function Features() {
  const features = [
    "Inventory Management",
    "Order Tracking",
    "Payments",
    "Analytics",
    "Multi-tenant",
    "Secure API",
  ];

    return (
      <section className="py-20 bg-gradient-to-b from-white to-gray-100">
        <Container>
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f}
                className="bg-white/80 backdrop-blur p-6 rounded-2xl shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
                whileHover={{ scale: 1.04, boxShadow: "0 12px 32px 0 rgba(0,0,0,0.12)" }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <h3 className="font-semibold text-lg mb-2">{f}</h3>
                <p className="text-gray-600 text-sm">
                  Manage your business efficiently.
                </p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>
    );
}
