
import { motion } from "framer-motion";
import Card from "./Card";

const Solution = () => {
  return (
    <motion.section
      className="bg-gray-50 py-20 text-center rounded-3xl mt-0"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <h2 className="text-2xl font-bold mb-12 text-green-900">How FisherP Transforms Your Business</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[{
          title: "Automated Tracking",
          desc: "Real-time inventory and order updates. No more manual errors."
        }, {
          title: "Payment Clarity",
          desc: "Instantly see who paid, who owes, and payment history."
        }, {
          title: "Growth Insights",
          desc: "Powerful analytics and dashboards for smarter decisions."
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
      <p className="text-lg text-green-800 mt-12">
        <span className="font-semibold">No more chaos. Just clarity and growth.</span>
      </p>
    </motion.section>
  );
};

export default Solution;
