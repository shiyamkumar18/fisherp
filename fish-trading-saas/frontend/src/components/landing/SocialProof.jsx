import React from "react";

const logos = [
  { src: "/logos/logo1.png", alt: "Trader One" },
  { src: "/logos/logo2.png", alt: "Trader Two" },
  { src: "/logos/logo3.png", alt: "Trader Three" },
  { src: "/logos/logo4.png", alt: "Trader Four" },
  { src: "/logos/logo5.png", alt: "Trader Five" },
];

export default function SocialProof() {
  return (
    <section className="py-10 text-center text-gray-500 bg-white">
      <div className="text-lg md:text-xl font-semibold mb-4 text-gray-700">
        Trusted by <span className="text-blue-600 font-bold">500+</span> fish traders across India
      </div>
      <div className="flex flex-wrap justify-center items-center gap-8 opacity-80">
        {logos.map((logo, idx) => (
          <img
            key={idx}
            src={logo.src}
            alt={logo.alt}
            className="h-10 md:h-12 grayscale hover:grayscale-0 transition duration-300 bg-white rounded shadow-sm p-2"
            style={{ minWidth: 80 }}
          />
        ))}
      </div>
    </section>
  );
}
