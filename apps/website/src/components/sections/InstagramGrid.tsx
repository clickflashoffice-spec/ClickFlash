"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";

const instagramPosts = [
    {
        id: 1,
        image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=800",
        likes: "1.2k",
        comments: "45",
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
        likes: "850",
        comments: "32",
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1544750040-4ef418140312?auto=format&fit=crop&q=80&w=800",
        likes: "2.5k",
        comments: "120",
    },
    {
        id: 4,
        image: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&q=80&w=800",
        likes: "3.1k",
        comments: "89",
    },
    {
        id: 5,
        image: "https://images.unsplash.com/photo-1506929199364-6d80653634b8?auto=format&fit=crop&q=80&w=800",
        likes: "940",
        comments: "28",
    },
    {
        id: 6,
        image: "https://images.unsplash.com/photo-1520483601560-389dff434fdf?auto=format&fit=crop&q=80&w=800",
        likes: "1.7k",
        comments: "64",
    },
    {
        id: 7,
        image: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&q=80&w=800",
        likes: "1.1k",
        comments: "42",
    },
    {
        id: 8,
        image: "https://images.unsplash.com/photo-1533719071182-1828dcd33bb4?auto=format&fit=crop&q=80&w=800",
        likes: "2.3k",
        comments: "115",
    }
];

export function InstagramGrid() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 p-2 md:p-0">
            {instagramPosts.map((post, idx) => (
                <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    viewport={{ once: true }}
                    className="relative aspect-square group overflow-hidden bg-white/10 rounded-lg md:rounded-xl cursor-pointer"
                >
                    <Image
                        src={post.image}
                        alt={`Instagram post ${post.id}`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 text-white font-bold">
                            <Heart className="w-5 h-5 fill-current" />
                            <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white font-bold">
                            <MessageCircle className="w-5 h-5 fill-current" />
                            <span>{post.comments}</span>
                        </div>
                    </div>

                    {/* Mobile Touch Indicator */}
                    <div className="absolute bottom-2 right-2 md:hidden bg-black/20 backdrop-blur-md p-1 rounded-full text-white/80">
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" width={14} height={14} alt="Instagram" className="opacity-80" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
