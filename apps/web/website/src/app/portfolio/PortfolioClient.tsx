"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const categories = ["All", "Weddings", "Resorts", "Portraits", "Events"];

const portfolioItems = [
    // Wedding Portfolio - Curated Best Selection
    { id: 1, src: "/images/portfolio/wedding-couple-aym.jpg", category: "Weddings", title: "Wedding Couple AYM" },
    { id: 2, src: "/images/portfolio/aym_1458.jpg", category: "Weddings", title: "Romantic Beach Wedding" },
    { id: 3, src: "/images/portfolio/aym_1459.jpg", category: "Weddings", title: "Golden Hour Wedding" },
    { id: 4, src: "/images/portfolio/aym_1460.jpg", category: "Weddings", title: "Coastal Wedding Portrait" },
    { id: 5, src: "/images/portfolio/aym_1461.jpg", category: "Weddings", title: "Sunset Wedding Moments" },
    { id: 6, src: "/images/portfolio/aym_1467.jpg", category: "Weddings", title: "Tropical Wedding" },
    { id: 7, src: "/images/portfolio/aym_1469.jpg", category: "Weddings", title: "Wedding Embrace" },
    { id: 8, src: "/images/portfolio/4a439b01-6c97-4c53-b8bd-e4e267382d7b.jpg", category: "Weddings", title: "Beach Wedding Ceremony" },
    { id: 9, src: "/images/portfolio/IMG-20250701-WA0008.jpg", category: "Weddings", title: "Wedding Celebration" },
    { id: 10, src: "/images/portfolio/IMG-20250701-WA0011.jpg", category: "Weddings", title: "Wedding Couple Portrait" },
    { id: 11, src: "/images/portfolio/IMG-20250701-WA0040.jpg", category: "Weddings", title: "Wedding Details" },
    { id: 12, src: "/images/portfolio/IMG-20250701-WA0061.jpg", category: "Weddings", title: "Wedding Moment" },
    { id: 13, src: "/images/portfolio/d753e241-b318-4356-91be-b51b899e2394.jpg", category: "Weddings", title: "Bride Portrait" },
    
    // Resort Portfolio
    { id: 14, src: "/images/portfolio/becf6411-fc20-4b91-bba6-94d76eb0f9f5.jpg", category: "Resorts", title: "Luxury Resort" },
    { id: 15, src: "/images/portfolio/IMG-20250701-WA0010.jpg", category: "Resorts", title: "Poolside" },
    { id: 16, src: "/images/portfolio/IMG-20250701-WA0041.jpg", category: "Resorts", title: "Resort View" },
    { id: 17, src: "/images/portfolio/aym_1456.jpg", category: "Resorts", title: "Beach Resort" },
    
    // Portrait Portfolio
    { id: 18, src: "/images/portfolio/ab5ba25a-42b0-4b27-a544-39c622685a10.jpg", category: "Portraits", title: "Portrait Session" },
    { id: 19, src: "/images/portfolio/IMG-20250701-WA0009.jpg", category: "Portraits", title: "Beach Portrait" },
    { id: 20, src: "/images/portfolio/IMG-20250701-WA0012.jpg", category: "Portraits", title: "Sunset Portrait" },
    { id: 21, src: "/images/portfolio/IMG-20250701-WA0044.jpg", category: "Portraits", title: "Couple Portrait" },
    { id: 22, src: "/images/portfolio/1a5aeeb8-c8ee-4991-abcb-a9a08b5aa7a5.jpg", category: "Portraits", title: "Professional Portrait" },
    { id: 23, src: "/images/portfolio/aym_1465.jpg", category: "Portraits", title: "Beach Portrait Session" },
    
    // Events Portfolio
    { id: 24, src: "/images/portfolio/9deb28fd-159f-4ad8-b0a6-0eba99a7fdbe.jpg", category: "Events", title: "Corporate Event" },
    { id: 25, src: "/images/portfolio/IMG-20250701-WA0024.jpg", category: "Events", title: "Beach Event" },
    { id: 26, src: "/images/portfolio/aym_1457.jpg", category: "Events", title: "Beach Celebration" },
];

export function PortfolioClient() {
    const [activeCategory, setActiveCategory] = useState("All");

    const filteredItems = activeCategory === "All" 
        ? portfolioItems 
        : portfolioItems.filter(item => item.category === activeCategory);

    return (
        <main className="min-h-screen bg-white pt-24 md:pt-28 lg:pt-32 pb-16 md:pb-20 lg:pb-24">
            {/* HERO SECTION */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-cyan-700 font-black uppercase tracking-[0.3em] text-[12px] mb-4 block">Our Portfolio</span>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 mb-6 md:mb-8 leading-tight tracking-tighter">
                            Gallery of <span className="text-cyan-700">Memories</span>
                        </h1>
                        <p className="text-slate-600 text-base md:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto px-2">
                            Browse through our curated collection of captured moments from weddings, 
                            resorts, and special events across Tunisia. Each photo tells a unique story.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* CATEGORY FILTER */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-4 md:px-6 py-2 text-xs md:text-sm font-medium transition-all duration-300 border rounded-full ${
                                activeCategory === category
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </section>

            {/* PORTFOLIO GRID */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
                    {filteredItems.map((item, i) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: i * 0.03 }}
                            className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer"
                        >
                            <Image
                                src={item.src}
                                alt={item.title}
                                fill
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <span className="text-cyan-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2 block">{item.category}</span>
                                <h3 className="text-slate-900 font-bold text-sm md:text-lg">{item.title}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-24 lg:mt-32">
                <div className="bg-slate-50 rounded-2xl md:rounded-3xl p-8 md:p-12 lg:p-16 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-4 md:mb-6 tracking-tighter">
                        Create Your Own <span className="text-cyan-700">Memories</span>
                    </h2>
                    <p className="text-slate-600 text-base md:text-lg mb-6 md:mb-8 max-w-2xl mx-auto px-2">
                        Let us capture your special moments with our professional photography services. 
                        Book a session today and create memories that last a lifetime.
                    </p>
                    <Link 
                        href="/contact" 
                        className="inline-block px-8 md:px-10 py-3 md:py-4 bg-cyan-700 text-white font-black uppercase tracking-widest text-[11px] md:text-[12px] rounded-full hover:bg-slate-900 transition-all"
                    >
                        Book Now
                    </Link>
                </div>
            </section>
        </main>
    );
}
