import { Link } from "react-router-dom";
import {
  Fish, ShoppingCart, CreditCard, Warehouse, BarChart3, Users,
  Clock, CheckCircle, Shield, Layers, Zap, Rocket,
} from "lucide-react";

const features = [
  { icon: ShoppingCart, title: "Purchase Management", desc: "Record purchases from suppliers with quantity, price, and payment tracking built in.", color: "from-teal-500 to-teal-400" },
  { icon: CreditCard, title: "Sales Tracking", desc: "Log sales to buyers, apply different units and pricing, and track settlements.", color: "from-sky-500 to-sky-400" },
  { icon: Warehouse, title: "Inventory Control", desc: "Real-time stock levels per fish category with automated alerts on low inventory.", color: "from-amber-500 to-amber-400" },
  { icon: BarChart3, title: "Payment Ledger", desc: "Track payments to suppliers and from buyers with full settlement history.", color: "from-emerald-500 to-emerald-400" },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Daily, weekly, monthly reports with profit/loss, top sellers, and trend analysis.", color: "from-violet-500 to-violet-400" },
  { icon: Users, title: "Team Management", desc: "Assign roles — Admin, Accountant, Trader, Store — each with tailored dashboard access.", color: "from-pink-500 to-pink-400" },
];

const steps = [
  { num: "1", title: "Register Company", desc: "Create your company workspace in seconds with your company name and admin details." },
  { num: "2", title: "Add Your Team", desc: "Invite accountants, traders, and store managers with role-based permissions." },
  { num: "3", title: "Set Up Catalog", desc: "Add fish categories, suppliers, and buyers to start managing your operations." },
  { num: "4", title: "Start Trading", desc: "Record purchases, sales, and payments. View real-time reports and analytics." },
];

const plans = [
  { name: "Starter", price: "₹0", period: "/ month", items: ["1 Admin user", "Up to 50 transactions/month", "Basic reports"], cta: "Get Started", featured: false },
  { name: "Professional", price: "₹999", period: "/ month", items: ["Up to 5 team members", "Unlimited transactions", "Advanced reports & analytics", "Priority support"], cta: "Start Free Trial", featured: true },
  { name: "Enterprise", price: "Custom", period: "", items: ["Unlimited team members", "Multi-branch support", "Dedicated account manager", "Custom integrations"], cta: "Contact Us", featured: false },
];

function IconBox({ icon: Icon, className = "" }) {
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${className}`}>
      <Icon size={22} />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans antialiased">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-400 text-white">
              <Fish size={18} />
            </div>
            <div className="leading-none">
              <span className="text-sm font-extrabold text-slate-900">FisherP</span>
              <span className="block text-[10px] text-slate-400">Fish Trading SaaS</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-teal-600">Features</a>
            <a href="#workflow" className="transition hover:text-teal-600">How It Works</a>
            <a href="#pricing" className="transition hover:text-teal-600">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Login
            </Link>
            <Link to="/register" className="rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:shadow-md">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 md:py-28">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-teal-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-60 bottom-0 h-[400px] w-[400px] rounded-full bg-sky-100/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2">
          <div>
            <span className="mb-4 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700">
              Built for Fish Traders
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Manage Your Fish Trading Business
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-500">
              Track purchases, sales, inventory, payments, and reports from one powerful dashboard.
              Role-based access for your entire team — from traders to accountants.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-200 transition hover:shadow-xl">
                <Rocket size={16} /> Start Free Trial
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                Login
              </Link>
            </div>
          </div>

          {/* Stats cards */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Platform Stats</span>
              <p className="mt-2 text-5xl font-extrabold text-slate-900">500+</p>
              <p className="mt-1 text-sm text-slate-500">Companies managing their fish trading operations with FisherP</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
                <Clock size={28} className="mb-2 text-teal-500" />
                <p className="text-2xl font-extrabold text-slate-900">24/7</p>
                <span className="text-xs text-slate-500">Cloud Access</span>
              </div>
              <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
                <CheckCircle size={28} className="mb-2 text-sky-500" />
                <p className="text-2xl font-extrabold text-slate-900">99.9%</p>
                <span className="text-xs text-slate-500">Uptime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-16 grid max-w-7xl gap-4 px-5 sm:grid-cols-3">
          {[
            { icon: Layers, title: "Multi-Tenant", desc: "Each company gets isolated, secure data" },
            { icon: Users, title: "Role-Based", desc: "Admin, Accountant, Trader, Store roles" },
            { icon: Zap, title: "Real-Time", desc: "Live dashboards and instant reports" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <IconBox icon={item.icon} className="from-teal-600 to-teal-400" />
              <div>
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700">Features</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Everything You Need to Run Your Fish Business</h2>
            <p className="mt-3 text-slate-500">From daily purchases to monthly reports — all in one place.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
                <IconBox icon={f.icon} className={`bg-gradient-to-br ${f.color}`} />
                <h3 className="mt-4 text-base font-bold text-slate-800">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="workflow" className="bg-slate-50 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700">How It Works</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Get Started in Minutes</h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-teal-400 text-sm font-extrabold text-white">{s.num}</span>
                <h3 className="text-base font-bold text-slate-800">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform ─── */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700">Platform</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Built for Teams of Every Size</h2>
            <p className="mt-3 text-slate-500">Whether you're a single trader or a large operation with multiple branches, FisherP scales with you.</p>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl gap-5">
            {[
              { icon: Layers, title: "Multi-Company Support", desc: "Run multiple companies from a single platform with complete data isolation.", color: "from-teal-600 to-teal-400" },
              { icon: Shield, title: "Enterprise Security", desc: "Role-based permissions, audit logs, and encrypted data at rest and in transit.", color: "from-pink-500 to-pink-400" },
              { icon: Zap, title: "API Access", desc: "RESTful API for integrating with your existing systems and tools.", color: "from-amber-500 to-amber-400" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <IconBox icon={item.icon} className={`bg-gradient-to-br ${item.color}`} />
                <div>
                  <p className="font-bold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="bg-slate-50 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700">Pricing</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mt-3 text-slate-500">Start free. Upgrade when you need more.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`relative rounded-2xl border bg-white p-6 shadow-sm ${p.featured ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-100"}`}>
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-600 to-teal-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Most Popular</span>
                )}
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{p.name}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">{p.price}<span className="text-base font-medium text-slate-400">{p.period}</span></p>
                <ul className="mt-5 space-y-2.5">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle size={14} className="text-teal-500" /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-bold transition ${
                    p.featured
                      ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-sm hover:shadow-md"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-teal-700 to-teal-500 p-10 text-center text-white md:flex-row md:text-left">
            <div>
              <h2 className="text-2xl font-extrabold">Ready to streamline your fish trading?</h2>
              <p className="mt-1 text-teal-100">Join hundreds of companies already using FisherP.</p>
            </div>
            <Link to="/register" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-teal-700 shadow transition hover:shadow-lg">
              <Rocket size={16} /> Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <div className="mx-auto max-w-7xl px-5 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-center">
          <span className="text-sm font-bold text-slate-600">Trusted by fish traders across India</span>
          {["ISO Compliant", "GDPR Ready", "99.9% Uptime", "24/7 Support"].map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{t}</span>
          ))}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 md:flex-row">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-400 text-white">
              <Fish size={15} />
            </div>
            <span className="text-sm font-extrabold text-slate-900">FisherP</span>
          </Link>
          <nav className="flex gap-5 text-sm text-slate-500">
            <a href="#features" className="transition hover:text-teal-600">Features</a>
            <a href="#workflow" className="transition hover:text-teal-600">How It Works</a>
            <a href="#pricing" className="transition hover:text-teal-600">Pricing</a>
            <Link to="/login" className="transition hover:text-teal-600">Login</Link>
            <Link to="/register" className="transition hover:text-teal-600">Register</Link>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">&copy; 2026 FisherP. All rights reserved.</p>
      </footer>
    </div>
  );
}
