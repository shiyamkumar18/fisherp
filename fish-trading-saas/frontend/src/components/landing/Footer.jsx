import React from "react";

export default function Footer() {
  return (
    <footer className="py-10 px-4 bg-gray-900 text-gray-300 mt-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-lg font-bold text-white">FisherP</div>
        <nav className="flex gap-6 text-sm">
          <a href="/features" className="hover:text-white">Features</a>
          <a href="/pricing" className="hover:text-white">Pricing</a>
          <a href="/about" className="hover:text-white">About</a>
          <a href="/contact" className="hover:text-white">Contact</a>
        </nav>
        <div className="text-xs text-gray-400 text-center md:text-right">
          <div>Contact: <a href="mailto:support@fisherp.com" className="underline">support@fisherp.com</a></div>
          <div className="mt-1">&copy; {new Date().getFullYear()} FisherP. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
