"use client";

import { motion } from "framer-motion";

interface StatsSectionProps {
  stats?: { value: string; label: string; title: string }[];
}

const DEFAULT_STATS = [
  { value: "50+", label: "Professional Photographers captuing smiles.", title: "Photographers" },
  { value: "100K+", label: "Happy Clients worldwide since 2008.", title: "Clients" },
  { value: "15+", label: "Years of excellence in photography.", title: "Years Experience" },
  { value: "30+", label: "Breathtaking locations across the globe.", title: "Locations" },
];

export function StatsSection({ stats = DEFAULT_STATS }: StatsSectionProps) {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center justify-between gap-10 text-center md:flex-row md:items-start">
          <div className="text-left md:w-1/4">
            <h2 className="mb-2 font-sans text-4xl font-bold text-slate-900 md:text-5xl">
              A Unique Story in <br />
              <span className="border-b-4 border-cyan-200 text-cyan-700">Every Number</span>
            </h2>
          </div>

          <div className="flex w-full flex-wrap justify-center gap-12 md:w-3/4 md:justify-end md:gap-16">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex max-w-[200px] flex-col items-center"
              >
                <span className="mb-2 text-5xl font-bold text-slate-800">{stat.value}</span>
                <p className="text-sm leading-relaxed font-medium text-slate-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

StatsSection.displayName = "StatsSection";
