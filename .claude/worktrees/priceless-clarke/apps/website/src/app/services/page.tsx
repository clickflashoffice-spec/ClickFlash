"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { InstagramFeed } from "@/components/sections/InstagramFeed";

const services = [
  {
    id: 1,
    title: "Wedding Photography",
    headline: "Capturing Your Perfect Day",
    description:
      "Your wedding day is one of the most important moments of your life. Our experienced wedding photographers capture every emotion, from the nervous anticipation to the joyful celebration. We create timeless images that you'll treasure forever.",
    image: "/images/portfolio/4a439b01-6c97-4c53-b8bd-e4e267382d7b.jpg",
    features: [
      "Full-day coverage",
      "Professional editing",
      "Online gallery",
      "Premium wedding albums",
    ],
    link: "/bookings",
    reverse: false,
  },
  {
    id: 2,
    title: "Resort & Hotel Photography",
    headline: "Showcasing Luxury Destinations",
    description:
      "We specialize in capturing the essence of luxury resorts and hotels. From stunning property shots to guest experience photography, we help showcase your destination in its best light to attract more visitors.",
    image: "/images/portfolio/becf6411-fc20-4b91-bba6-94d76eb0f9f5.jpg",
    features: [
      "Property photography",
      "Guest experience shots",
      "Event coverage",
      "Marketing content",
    ],
    link: "/bookings",
    reverse: true,
  },
  {
    id: 3,
    title: "Portrait Sessions",
    headline: "Your Personality in Every Frame",
    description:
      "Whether it's family portraits, individual sessions, or creative shoots, our portrait photography captures your unique personality. We create relaxed, enjoyable sessions that result in natural, beautiful photographs.",
    image: "/images/portfolio/ab5ba25a-42b0-4b27-a544-39c622685a10.jpg",
    features: [
      "Family portraits",
      "Individual sessions",
      "Creative concepts",
      "Professional retouching",
    ],
    link: "/bookings",
    reverse: false,
  },
  {
    id: 4,
    title: "Corporate Events",
    headline: "Professional Event Coverage",
    description:
      "From corporate retreats to conferences and team building events, we provide professional photography that captures the essence of your business events. Perfect for marketing, internal communications, and social media.",
    image: "/images/portfolio/9deb28fd-159f-4ad8-b0a6-0eba99a7fdbe.jpg",
    features: ["Event documentation", "Candid moments", "Team photos", "Quick turnaround"],
    link: "/bookings",
    reverse: true,
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="container mx-auto px-4 pt-28 pb-16 text-center sm:px-6 md:pt-36 md:pb-20 lg:px-8 lg:pt-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            title="Photography Services"
            subtitle="Our Comprehensive Solutions"
            align="center"
            light={true}
          />
          <p className="mx-auto mt-6 max-w-3xl px-4 text-base leading-relaxed text-slate-500 md:mt-8 md:text-lg">
            ClickFlash offers a wide range of photography services tailored to various settings
            across Tunisia and beyond. From luxurious resorts to intimate weddings and professional
            corporate events, we capture unforgettable memories for every occasion.
          </p>
        </motion.div>
      </section>

      {/* SERVICES ALTERNATING SECTIONS */}
      {services.map((service, index) => (
        <section
          key={service.id}
          className={`py-16 md:py-24 lg:py-32 ${index % 2 !== 0 ? "border-y border-slate-100 bg-slate-50/50" : "bg-white"}`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className={`grid grid-cols-1 items-center gap-10 md:gap-16 lg:grid-cols-2 lg:gap-20 ${service.reverse ? "lg:flex-row-reverse" : ""}`}
            >
              <motion.div
                initial={{ opacity: 0, x: service.reverse ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={service.reverse ? "lg:order-2" : "lg:order-1"}
              >
                <span className="mb-4 block text-[10px] font-black tracking-[0.3em] text-cyan-500 uppercase">
                  {service.title}
                </span>
                <h2 className="mb-6 text-2xl leading-tight font-black tracking-tighter text-slate-900 sm:text-3xl md:mb-8 md:text-4xl lg:text-5xl">
                  {service.headline}
                </h2>
                <p className="mb-8 text-base leading-relaxed text-slate-600 md:mb-10 md:text-lg">
                  {service.description}
                </p>
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mb-10 md:gap-6">
                  {service.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 text-[12px] font-bold text-slate-800 md:text-[13px]"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100">
                        <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>
                <Link
                  href={service.link}
                  className="inline-block rounded-full bg-cyan-500 px-8 py-3 text-[11px] font-black tracking-widest text-white uppercase transition-all hover:bg-slate-900 md:px-10 md:py-4 md:text-[12px]"
                >
                  Learn More
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`relative h-[300px] overflow-hidden rounded-2xl shadow-2xl sm:h-[400px] md:h-[500px] md:rounded-[3rem] lg:h-[550px] ${service.reverse ? "lg:order-1" : "lg:order-2"}`}
              >
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-slate-900/5 transition-opacity hover:opacity-0" />
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* GALLERY SECTION */}
      <section className="container mx-auto px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-32">
        <div className="mb-12 md:mb-16 lg:mb-20">
          <SectionHeader
            title="Every Click Tells a Story"
            subtitle="Gallery Context"
            align="left"
            light={true}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
          {[
            { src: "/images/portfolio/IMG-20250701-WA0008.jpg", alt: "Wedding Celebration" },
            { src: "/images/portfolio/IMG-20250701-WA0009.jpg", alt: "Luxury Resort" },
            { src: "/images/portfolio/IMG-20250701-WA0010.jpg", alt: "Portrait Session" },
            { src: "/images/portfolio/IMG-20250701-WA0011.jpg", alt: "Beach Photography" },
            { src: "/images/portfolio/IMG-20250701-WA0012.jpg", alt: "Couple Portrait" },
            { src: "/images/portfolio/IMG-20250701-WA0024.jpg", alt: "Family Moment" },
            { src: "/images/portfolio/IMG-20250701-WA0040.jpg", alt: "Event Photography" },
            { src: "/images/portfolio/IMG-20250701-WA0041.jpg", alt: "Resort Pool" },
            { src: "/images/portfolio/IMG-20250701-WA0044.jpg", alt: "Beach Portrait" },
            { src: "/images/portfolio/IMG-20250701-WA0061.jpg", alt: "Wedding Moments" },
          ].map((item, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-3xl shadow-lg"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          ))}
        </div>
      </section>

      {/* EXPERTISE SECTION */}
      <section className="bg-slate-50 py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center md:mb-16 lg:mb-20">
            <span className="mb-4 block text-[11px] font-black tracking-[0.3em] text-cyan-500 uppercase md:text-[12px]">
              Our Expertise
            </span>
            <h2 className="text-3xl leading-tight font-black tracking-tighter text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl">
              Enhancing Your Experience
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-8">
            {[
              { title: "Moments", desc: "Capturing fleeting instances of joy" },
              { title: "Passion", desc: "Photography driven by love for the craft" },
              { title: "Unforgettable", desc: "Creating memories that last forever" },
              { title: "Captured", desc: "Preserving your story in every frame" },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-6 text-center shadow-sm md:rounded-3xl md:p-8"
              >
                <h3 className="mb-3 text-xl font-black text-slate-900 md:mb-4 md:text-2xl">
                  {item.title}
                </h3>
                <p className="text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <InstagramFeed
        title={
          <>
            Experience <span className="text-cyan-500">ClickFlash</span>
          </>
        }
        subtitle="Stories in Motion"
      />

      {/* CTA SECTION */}
      <section className="relative mx-4 mb-16 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 py-16 text-center sm:mx-6 md:mb-20 md:rounded-[3rem] md:py-24">
        <div className="relative z-10 px-4">
          <h2 className="mb-6 text-2xl font-black tracking-tighter text-slate-900 sm:text-3xl md:mb-10 md:text-5xl lg:text-6xl">
            Ready to Capture <span className="text-cyan-500 italic">Your Moments?</span>
          </h2>
          <Link
            href="/bookings"
            className="inline-block rounded-full bg-cyan-500 px-8 py-4 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-cyan-500/20 transition-all hover:bg-slate-900 hover:text-white md:px-14 md:py-6 md:text-[11px]"
          >
            Book Now
          </Link>
        </div>
      </section>
    </main>
  );
}
