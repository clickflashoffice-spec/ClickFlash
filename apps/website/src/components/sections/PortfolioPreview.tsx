"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ArrowRight } from "lucide-react";

const projects = [
  {
    title: "The Golden Wedding",
    category: "Weddings",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop",
    size: "large"
  },
  {
    title: "Newborn Series",
    category: "Newborn",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop",
    size: "small"
  },
  {
    title: "Portrait Collection",
    category: "Portrait",
    image: "https://images.unsplash.com/photo-1540575861501-7ad060e39fe5?q=80&w=2070&auto=format&fit=crop",
    size: "small"
  },
  {
    title: "Eternal Dreams",
    category: "Engagements",
    image: "https://images.unsplash.com/photo-1505118380757-91f5f5832de0?q=80&w=1944&auto=format&fit=crop",
    size: "medium"
  }
];

export function PortfolioPreview() {
  return (
    <section className="py-32 bg-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader
          title="Our Portfolio"
          subtitle="A Glimpse of Magic"
          light
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 auto-rows-[350px]">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className={`relative group rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-50 ${project.size === "large" ? "md:col-span-2 md:row-span-2" :
                  project.size === "medium" ? "md:col-span-2" : ""
                }`}
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />

              {/* Light Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content on Hover - Light Theme */}
              <div className="absolute inset-0 flex flex-col justify-end p-10 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                <span className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3">
                  {project.category}
                </span>
                <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">
                  {project.title}
                </h3>
                <Link
                  href="/portfolio"
                  className="flex items-center gap-2 text-slate-600 font-bold text-sm group/link"
                >
                  View Details <ArrowRight size={16} className="transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-full hover:bg-cyan-500 transition-all shadow-xl hover:shadow-cyan-500/30 active:scale-95"
          >
            Explore Full Portfolio <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}