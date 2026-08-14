"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { CustomerReviews } from "@/components/sections/CustomerReviews";
import { InstagramFeed } from "@/components/sections/InstagramFeed";
import { StatsSection } from "@/components/sections/StatsSection";
import type { WebsiteSettings } from "@/lib/settings";

import { Hero } from "@/components/sections/Hero";
import { FeaturesBento } from "@/components/sections/FeaturesBento";

interface HomePageContentProps {
  settings: WebsiteSettings;
}

export default function HomePageContent({ settings }: HomePageContentProps) {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* HERO SECTION */}
      <Hero
        title={settings.heroTitle || "Creating Smiles and Memories"}
        subtitle={settings.heroSubtitle || "Professional Photography Services"}
        imageUrl={
          settings.heroImageUrl ||
          "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2938&auto=format&fit=crop"
        }
      />

      {/* WHO WE ARE SECTION */}
      <section className="container mx-auto px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-32">
        <div className="grid grid-cols-1 items-center gap-10 md:gap-16 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="mb-4 block text-[12px] font-black tracking-[0.3em] text-cyan-700 uppercase">
              Who We Are
            </span>
            <h2 className="mb-6 text-3xl leading-tight font-black tracking-tighter text-slate-900 sm:text-4xl md:mb-8 md:text-5xl lg:text-6xl">
              {settings.aboutTitle || "Creating Smiles and Memories Since 2008"}
            </h2>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 md:mb-10 md:text-lg">
              {settings.aboutText ||
                "ClickFlash, established in 2008, specializes in hotel and resort photography. We capture unique moments and emotions in Tunisia and worldwide. Our growing team ensures every memory is unforgettable with high-quality services, products, and the latest technology at top destinations."}
            </p>
            <ul className="mb-12 space-y-4">
              {(settings.aboutPoints && settings.aboutPoints.length > 0
                ? settings.aboutPoints
                : [
                    "Experienced and Professional Team",
                    "Wide and Diverse Destinations",
                    "Customized and Personalized Services",
                  ]
              ).map((item) => (
                <li key={item} className="flex items-center gap-3 font-bold text-slate-900/80">
                  <CheckCircle2 className="h-6 w-6 text-cyan-700" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/services"
              className="inline-block rounded-full bg-cyan-600 px-8 py-3 text-[11px] font-black tracking-widest text-white uppercase transition-all hover:bg-cyan-500 md:px-10 md:py-4 md:text-[12px]"
            >
              Our Services
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative h-[350px] overflow-hidden rounded-2xl bg-slate-50 shadow-2xl sm:h-[400px] md:h-[500px] md:rounded-3xl lg:h-[600px]"
          >
            <Image
              src={
                settings.aboutImageUrl ||
                "/images/portfolio/1a5aeeb8-c8ee-4991-abcb-a9a08b5aa7a5.jpg"
              }
              alt="ClickFlash Photography Team"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </motion.div>
        </div>
      </section>

      {/* STATS SECTION */}
      <StatsSection
        stats={[
          { val: settings.statsPhotographers || "50+", label: "Professional Photographers" },
          { val: settings.statsClients || "100K+", label: "Happy Clients Worldwide" },
          { val: settings.statsYears || "15+", label: "Years of Excellence" },
          { val: "30+", label: "Breathtaking Locations" },
        ].map((s) => ({ value: s.val, label: s.label, title: s.label }))}
      />

      {/* SERVICES PREVIEW */}
      <FeaturesBento settings={settings} />

      {/* PORTFOLIO PREVIEW */}
      <section className="bg-slate-50 py-16 text-white md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center md:mb-16 lg:mb-20">
            <span className="mb-4 block text-[11px] font-black tracking-[0.3em] text-cyan-700 uppercase md:text-[12px]">
              Our Portfolio
            </span>
            <h2 className="mb-4 text-3xl leading-tight font-black tracking-tighter sm:text-4xl md:mb-6 md:text-5xl lg:text-6xl">
              Gallery of Memories
            </h2>
            <p className="mx-auto max-w-2xl px-4 text-base text-slate-600 md:text-lg">
              Browse through our collection of captured moments from weddings, resorts, and special
              events around Tunisia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {[
              "/images/portfolio/IMG-20250701-WA0008.jpg",
              "/images/portfolio/IMG-20250701-WA0009.jpg",
              "/images/portfolio/IMG-20250701-WA0010.jpg",
              "/images/portfolio/IMG-20250701-WA0011.jpg",
              "/images/portfolio/IMG-20250701-WA0012.jpg",
              "/images/portfolio/IMG-20250701-WA0024.jpg",
              "/images/portfolio/IMG-20250701-WA0040.jpg",
              "/images/portfolio/IMG-20250701-WA0041.jpg",
            ].map((img, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-2xl">
                <Image
                  src={img}
                  alt={`Portfolio ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-cyan-700/0 transition-colors group-hover:bg-cyan-700/20" />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:mt-12">
            <Link
              href="/portfolio"
              className="inline-block rounded-full bg-cyan-700 px-8 py-3 text-[11px] font-black tracking-widest text-white uppercase transition-all hover:bg-slate-900 md:px-10 md:py-4 md:text-[12px]"
            >
              View Full Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* VISION SECTION */}
      <section className="container mx-auto px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-4xl px-2 text-center">
          <span className="mb-4 block text-[11px] font-black tracking-[0.3em] text-cyan-700 uppercase md:text-[12px]">
            Our Vision
          </span>
          <h2 className="mb-6 text-3xl leading-tight font-black tracking-tighter text-slate-900 sm:text-4xl md:mb-8 md:text-5xl lg:text-6xl">
            {settings.visionTitle || "Creating Smiles Worldwide"}
          </h2>
          <div className="mb-8 flex flex-wrap justify-center gap-4 md:mb-10 md:gap-8">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-700" />
              <span className="font-bold text-slate-800">Capture Special Moments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-700" />
              <span className="font-bold text-slate-800">Share Global Adventures</span>
            </div>
          </div>
          <p className="mb-6 px-2 text-base leading-relaxed text-slate-600 md:mb-8 md:text-lg">
            {settings.visionText1 ||
              "At ClickFlash, our vision is to create more and more smiles by giving people the opportunity to save and share their special moments, feelings, dreams, experiences, and adventures."}
          </p>
          <p className="mb-8 px-2 text-base leading-relaxed text-slate-600 md:mb-10 md:text-lg">
            {settings.visionText2 ||
              "By preserving these cherished memories, we help individuals relive their happiest moments and share their joy with loved ones across the globe."}
          </p>
          <p className="px-2 text-lg font-medium text-slate-900 md:text-xl">
            {settings.visionText3 || "Your moments, our passion –"}{" "}
            <span className="text-cyan-700">let's create memories</span> together.
          </p>
        </div>
      </section>

      <CustomerReviews settings={settings} />

      <InstagramFeed
        settings={settings}
        title={
          <>
            Gallery of <span className="text-cyan-700">Memories</span>
          </>
        }
        subtitle="Our Portfolio"
      />
    </main>
  );
}
