"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { WebsiteSettings } from "@/lib/settings";

interface CustomerReviewsProps {
  settings?: WebsiteSettings;
}

export function CustomerReviews({ settings = {} }: CustomerReviewsProps) {
  const {
    manualReviewCount = "2,050",
    manualReviewRating = "5.0",
    reviewsWidgetId = "8dfffd2d-2bce-4158-82b7-c5d24ed3b428",
  } = settings;

  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!widgetRef.current) return;

    // Prevent duplicate injections in React Strict Mode
    if (widgetRef.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://cdn.revukit.com/widgets/testimonial-grid-double-row.umd.js";
    script.setAttribute("data-business-id", "RVK-7984FA5A");
    script.setAttribute("data-place-id", "ChIJu86SVJ6L_RIRGkF4TGgMFYc");
    script.setAttribute("data-primary-color", "#FBBC04");
    script.setAttribute("data-secondary-color", "#1f2937");
    script.setAttribute("data-tertiary-color", "#6b7280");
    script.setAttribute("data-border-radius", "8px");
    script.setAttribute("data-shadow", "0 1px 2px 0 rgb(0 0 0 / 0.05)");
    script.setAttribute("data-mode", "inline");
    script.async = true;

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

        {/* Revukit Google Reviews Widget */}
        <div ref={widgetRef} className="mx-auto min-h-[400px] max-w-7xl">
          {/* Script is injected here via useEffect to maintain exact DOM hierarchy */}
        </div>
      </div>
    </section>
  );
}
