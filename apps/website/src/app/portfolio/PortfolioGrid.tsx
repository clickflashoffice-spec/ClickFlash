"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { PortfolioItem } from "@/lib/settings";
import { ImageIcon } from "lucide-react";

interface PortfolioGridProps {
    items: PortfolioItem[];
}

const LOCAL_PORTFOLIO_ITEMS: PortfolioItem[] = [
    {
        id: "local-1",
        title: "Sunset over the Aegean",
        category: "Beach",
        description: "Breathtaking sunset colors captured at our premium resort locations.",
        image_url: "/portfolio/1a5aeeb8-c8ee-4991-abcb-a9a08b5aa7a5.jpg",
        featured: true,
        sort_order: 1
    },
    {
        id: "local-2",
        title: "Mermaid Dreams",
        category: "Creative",
        description: "Ethereal mermaid-themed photo sessions in crystal clear waters.",
        image_url: "/portfolio/Mermaid-Photo-Session_08.jpg",
        featured: true,
        sort_order: 2
    },
    {
        id: "local-3",
        title: "Eternal Union",
        category: "Wedding",
        description: "Capturing the pure emotion of destination weddings.",
        image_url: "/portfolio/MAR_0396.JPG",
        featured: true,
        sort_order: 3
    },
    {
        id: "local-4",
        title: "Tropical Paradise",
        category: "Resort",
        description: "The essence of luxury resort life, perfectly framed.",
        image_url: "/portfolio/becf6411-fc20-4b91-bba6-94d76eb0f9f5.jpg",
        featured: true,
        sort_order: 4
    },
    {
        id: "local-5",
        title: "Coastal Romance",
        category: "Couple",
        description: "Intimate moments shared along the beautiful coastlines.",
        image_url: "/portfolio/couple-photography-00026.webp",
        featured: false,
        sort_order: 5
    },
    {
        id: "local-6",
        title: "Joyful Moments",
        category: "Resort",
        description: "Smiles and memories that last a lifetime.",
        image_url: "/portfolio/IMG-20250701-WA0010.jpg",
        featured: false,
        sort_order: 6
    },
    {
        id: "local-7",
        title: "Beachside Bliss",
        category: "Beach",
        description: "Pure relaxation and joy on the golden sands.",
        image_url: "/portfolio/4a439b01-6c97-4c53-b8bd-e4e267382d7b.jpg",
        featured: false,
        sort_order: 7
    },
    {
        id: "local-8",
        title: "Waves of Grace",
        category: "Creative",
        description: "Artistic photography that blends nature and human beauty.",
        image_url: "/portfolio/Mermaid-Photoshoot-on-the-Beach-image-1.webp",
        featured: false,
        sort_order: 8
    }
];

export default function PortfolioGrid({ items }: PortfolioGridProps) {
    const [activeCategory, setActiveCategory] = useState("All");

    const allItems = [...LOCAL_PORTFOLIO_ITEMS, ...items];
    const categories = ["All", ...Array.from(new Set(allItems.map(item => item.category))).sort()];

    const filteredItems = activeCategory === "All"
        ? allItems
        : allItems.filter(item => item.category === activeCategory);

    return (
        <>
            {/* Category Filters (Pills) */}
            <div className="flex flex-wrap justify-center gap-3 mb-16 px-4">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeCategory === category
                            ? "bg-cyan-700 text-white shadow-lg shadow-cyan-500/20"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Portfolio Grid - Masonry-style Columns */}
            {allItems.length > 0 ? (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 px-4 space-y-8">
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.5 }}
                                className="break-inside-avoid group relative rounded-3xl overflow-hidden bg-slate-50 cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 mb-8"
                            >
                                <div className="relative overflow-hidden">
                                    <Image
                                        src={item.image_url}
                                        alt={item.title}
                                        width={800}
                                        height={600}
                                        className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                                        loading="lazy"
                                    />

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    {/* Content Overlay */}
                                    <div className="absolute inset-0 p-8 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                                        <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-2 px-3 py-1 rounded-full bg-cyan-700/10 backdrop-blur-md self-start border border-cyan-500/20">
                                            {item.category}
                                        </span>
                                        <h3 className="text-slate-900 text-2xl font-black tracking-tight mb-2 uppercase italic">
                                            {item.title}
                                        </h3>
                                        <p className="text-slate-200 text-sm font-medium line-clamp-2 leading-relaxed tracking-tight">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-bold text-slate-900">Portfolio Gallery Coming Soon</p>
                    <p className="text-sm">We are currently curating our best shots.</p>
                </div>
            )}
        </>
    );
}
