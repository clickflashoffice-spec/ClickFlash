"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { WebsiteSettings } from "@/lib/settings";

interface FeaturesBentoProps {
  settings: WebsiteSettings;
}

export function FeaturesBento({ settings }: FeaturesBentoProps) {
  const features = [
    {
      title: settings.service1Title || "Wedding Photography",
      desc: settings.service1Desc || "Capture your special day with timeless elegance.",
      image: settings.service1Image || "/images/portfolio/wedding_service.png",
      className: "md:col-span-2 md:row-span-2",
      delay: 0.1,
    },
    {
      title: settings.service2Title || "Couple & Romantic",
      desc: settings.service2Desc || "Intimate moments in breathtaking settings.",
      image: settings.service2Image || "/images/portfolio/beach_couple.png",
      className: "md:col-span-2 md:row-span-1",
      delay: 0.2,
    },
    {
      title: settings.service3Title || "Portrait Sessions",
      desc: settings.service3Desc || "Beautiful portraits capturing your personality.",
      image: settings.service3Image || "/images/portfolio/ab5ba25a-42b0-4b27-a544-39c622685a10.jpg",
      className: "md:col-span-1 md:row-span-1",
      delay: 0.3,
    },
    {
      title: "Event Coverage",
      desc: "Comprehensive photography for corporate and private events.",
      image: "/images/portfolio/IMG-20250701-WA0008.jpg",
      className: "md:col-span-1 md:row-span-1",
      delay: 0.4,
    },
  ];

  return (
    <section className="container mx-auto px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-32">
      <div className="mb-12 text-center md:mb-16 lg:mb-20">
        <span className="mb-4 block text-[11px] font-black tracking-[0.3em] text-cyan-700 uppercase md:text-[12px]">
          What We Offer
        </span>
        <h2 className="mb-4 text-3xl leading-tight font-black tracking-tighter text-slate-900 sm:text-4xl md:mb-6 md:text-5xl lg:text-6xl">
          Signature Experiences
        </h2>
        <p className="mx-auto max-w-2xl px-4 text-base text-slate-600 md:text-lg">
          We curate exceptional photography experiences designed to immortalize your most precious moments with unparalleled artistry.
        </p>
      </div>

      <div className="grid auto-rows-[250px] grid-cols-1 gap-4 md:grid-cols-4 md:gap-6 lg:auto-rows-[300px]">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: feature.delay, duration: 0.6, ease: "easeOut" }}
            className={`group relative overflow-hidden rounded-3xl bg-slate-100 ${feature.className}`}
          >
            {/* Subtle Border Glow on Hover */}
            <div className="absolute inset-0 z-20 rounded-3xl border-2 border-transparent transition-colors duration-500 group-hover:border-cyan-400/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]" />
            
            <Image
              src={feature.image}
              alt={feature.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent transition-opacity duration-500" />
            
            <div className="absolute bottom-0 left-0 z-30 p-6 md:p-8 lg:p-10 w-full transform transition-transform duration-500 group-hover:-translate-y-2">
              <h3 className="mb-2 text-2xl md:text-3xl font-black text-white drop-shadow-md">
                {feature.title}
              </h3>
              <p className="text-sm md:text-base text-white/80 font-medium max-w-md opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                {feature.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 text-center md:mt-16">
        <Link
          href="/services"
          className="group inline-flex items-center gap-2 rounded-full border-2 border-slate-900 px-8 py-3 text-[11px] font-black tracking-widest text-slate-900 uppercase transition-all hover:bg-slate-900 hover:text-white md:px-10 md:py-4 md:text-[12px]"
        >
          View All Services
          <span className="transform transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}
