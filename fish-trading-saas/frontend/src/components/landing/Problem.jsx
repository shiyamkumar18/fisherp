
import { motion } from "framer-motion";
import Card from "./Card";

  return (
    <motion.section
      className="bg-white py-20 text-center"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <h2 className="text-2xl font-bold mb-12">Problems in Fish Business</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[{
          title: "Manual Tracking",
          desc: "Spreadsheets and paper lead to errors and wasted time."
        }, {
          title: "Payment Confusion",
          desc: "Difficult to track who paid, who owes, and when."
        }, {
          title: "Inventory Loss",
          desc: "No real-time stock updates means missed orders and lost revenue."
        }].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            whileHover={{ scale: 1.04, boxShadow: "0 12px 32px 0 rgba(0,0,0,0.12)" }}
            className="h-full"
          >
            <Card title={item.title}>
              {item.desc}
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
