"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { WebsiteSettings } from "@/lib/settings";

interface CustomerReviewsProps {
  settings?: WebsiteSettings;
}

/** Trustindex widget loader hash supplied by the dashboard. */
const TRUSTINDEX_LOADER_SRC =
  "https://cdn.trustindex.io/loader.js?0174c7b56d45942f1f76a34d6bc";

export function CustomerReviews({ settings = {} }: CustomerReviewsProps) {
  const {
    manualReviewCount = "2,050",
    manualReviewRating = "5.0",
  } = settings;

  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!widgetRef.current) return;

    // Prevent duplicate injections in React Strict Mode / re-mounts.
    if (widgetRef.current.querySelector("script")) return;

    // Trustindex auto-mounts the widget at the location of the loader
    // script tag, so append it inside our container ref.
    const script = document.createElement("script");
    script.src = TRUSTINDEX_LOADER_SRC;
    script.async = true;
    script.defer = true;

    widgetRef.current.appendChild(script);
  }, []);

  return (
    <section className="relative overflow-hidden bg-slate-50 py-32">
      {/* World Map Background (Abstract) */}
      <div className="pointer-events-none absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-contain bg-center bg-no-repeat opacity-[0.03]" />

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-4 block text-[13px] font-bold tracking-[0.4em] text-cyan-500 uppercase">
            Customer Experience
          </span>
          <h2 className="mb-8 text-4xl leading-tight font-black tracking-tighter text-slate-900 md:text-6xl">
            Loved by <span className="text-cyan-500">{manualReviewCount}+</span> customers with a{" "}
            <span className="text-cyan-500">{manualReviewRating}</span> rating
          </h2>
        </motion.div>

        {/* Trustindex Reviews Widget — loader script injects the widget DOM in place. */}
        <div ref={widgetRef} className="mx-auto min-h-[400px] max-w-7xl" />

      </div>
    </section>
  );
}
