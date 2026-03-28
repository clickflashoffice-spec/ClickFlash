"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const reviews = [
    {
        initial: "A",
        name: "Aikaterini Iosifidou",
        platform: "Google",
        date: "1 month ago",
        stars: 5,
        text: "Fantastic work!!!!",
        subtext: "(Translated by Google, see original)"
    },
    {
        initial: "W",
        name: "Wiktoria Wawrzyniak",
        platform: "Google",
        date: "1 month ago",
        stars: 5,
        text: "Very good and professional Company- especially in Mallorca photographer Alicja took me and my husband beautifull photos!! 🩷",
        subtext: ""
    },
    {
        initial: "T",
        name: "Tito Khemiri",
        platform: "Google",
        date: "1 month ago",
        stars: 5,
        text: "Great company",
        subtext: ""
    }
];

export function ReviewsSection() {
    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
            {/* World Map Background (Abstract) */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-center bg-no-repeat bg-contain" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <span className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-4 block">Customer Reviews</span>
                    <h2 className="text-4xl md:text-5xl font-sans font-bold text-slate-800 mb-6">
                        Words from Our <br /> Happy Clients
                    </h2>
                    <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        At ClickFlash, our clients&apos; satisfaction is our top priority. Hear what
                        they have to say about their experiences with our photography services.
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-center flex-wrap gap-6 mb-12 border-b border-slate-200 pb-4 max-w-2xl mx-auto">
                    <button className="font-bold text-slate-800 border-b-2 border-slate-800 pb-4 -mb-4.5">All reviews</button>
                    <button className="font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2"><span className="text-blue-500 font-bold">G</span> Google</button>
                    <button className="font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2"><span className="text-blue-600 font-bold">f</span> Facebook</button>
                    <button className="font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2"><span className="text-orange-500 font-bold">G</span> Getyourguide</button>
                </div>

                {/* Rating Summary */}
                <div className="flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto mb-10 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Excellent</span>
                        <div className="flex text-amber-400 gap-0.5">
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                        </div>
                        <span className="font-bold text-slate-800">4.9</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-600 font-medium">2097 reviews</span>
                    </div>
                    <button className="px-6 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors mt-4 md:mt-0">
                        Write a review
                    </button>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {reviews.map((review, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-4"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${review.initial === 'A' ? 'bg-zinc-700' : review.initial === 'W' ? 'bg-orange-500' : 'bg-pink-600'
                                        }`}>
                                        {review.initial}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{review.name}</h4>
                                        <span className="text-xs text-slate-400">{review.date}</span>
                                    </div>
                                </div>
                                <span className="text-blue-500 font-bold">G</span>
                            </div>

                            <div className="flex text-amber-400 gap-0.5">
                                {[...Array(review.stars)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ml-2">
                                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                            </div>

                            <p className="text-slate-600 text-sm leading-relaxed">
                                {review.text}
                            </p>
                            {review.subtext && (
                                <p className="text-xs text-slate-400 italic mt-auto">{review.subtext}</p>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
