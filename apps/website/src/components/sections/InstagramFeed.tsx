"use client";

import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import Script from "next/script";
import type { WebsiteSettings } from "@/lib/settings";

interface InstagramFeedProps {
  title?: string | React.ReactNode;
  subtitle?: string;
  settings?: WebsiteSettings;
}

export function InstagramFeed({
  title = (
    <>
      Gallery of <span className="text-cyan-700">Memories</span>
    </>
  ),
  subtitle = "Our Portfolio",
  settings = {},
}: InstagramFeedProps) {
  const {
    instagramFeedId = "8784e0d6-6996-449c-87b8-5b51dcb30bff",
    socialInstagram = "https://www.instagram.com/clicketflash/",
  } = settings;

  return (
    <section className="container mx-auto bg-white px-6 py-24">
      <div className="mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="mb-4 block text-[12px] font-black tracking-[0.4em] text-cyan-700 uppercase">
            {subtitle}
          </span>
          <h2 className="mb-10 text-5xl font-black tracking-tighter text-slate-800 md:text-7xl">
            {title}
          </h2>
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Primary: SnapWidget Embed */}
        <iframe
          src="https://snapwidget.com/embed/1119347"
          className="snapwidget-widget h-[800px] w-full max-w-[1530px] overflow-hidden border-none"
          allowTransparency={true}
          frameBorder={0}
          scrolling="no"
          title="Posts from Instagram"
        ></iframe>
      </div>

      {/* Bottom Actions */}
      <div className="mt-16 flex flex-col items-center gap-10 text-center">
        <a
          href={socialInstagram}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-full bg-cyan-700 px-10 py-5 font-bold text-white shadow-xl shadow-cyan-500/20 transition-all transition-transform duration-500 hover:bg-slate-900 active:scale-95"
        >
          <Instagram className="h-6 w-6" />
          <span className="text-xs tracking-widest uppercase">Follow us on Instagram</span>
        </a>
      </div>
    </section>
  );
}
