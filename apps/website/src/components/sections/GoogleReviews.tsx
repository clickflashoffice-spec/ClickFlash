"use client";

import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

const googleReviews = [
    {
        name: "JOAN MARIE",
        text: "Exceptional service! The photos captured in Santorini were breathtaking. Highly recommend ClickFlash for any destination event.",
        rating: 5,
        date: "2 days ago"
    },
    {
        name: "SARAH SMITH",
        text: "Professional, friendly, and truly skilled. Our family photoshoot was a blast and the results are absolutely stunning! We are so happy.",
        rating: 5,
        date: "1 week ago"
    },
    {
        name: "MIKE JOHNSON",
        text: "The team made us feel so comfortable. We now have a beautiful album to remember our honeymoon forever. Thank you ClickFlash team!",
        rating: 5,
        date: "3 days ago"
    },
    {
        name: "ALEX RIVERA",
        text: "Best photography company we've ever worked with. The lighting and composition are world-class.",
        rating: 5,
        date: "5 days ago"
    }
];

export function GoogleReviews() {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    return (
        <section className="py-32 bg-white/5 relative overflow-hidden">
            {/* World Map Background (Abstract) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-center bg-no-repeat bg-contain" />

            <div className="container mx-auto px-6 text-center mb-20 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <span className="text-cyan-700 font-bold uppercase tracking-[0.4em] text-[13px] mb-4 block">Customer Reviews</span>
                    <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-tight text-white">
                        Words from Our <span className="text-cyan-700">Clients</span>
                    </h2>

                    <p className="text-white/70 max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
                        At ClickFlash, our clients&apos; satisfaction is our top priority. Hear what
                        they have to say about their unforgettable photography experiences.
                    </p>
                </motion.div>
            </div>

            <div className="container mx-auto px-6 max-w-5xl mb-12">
                <div className="flex flex-col md:flex-row justify-between items-center bg-[#0B111F] p-8 rounded-3xl shadow-sm border border-white/10">
                    <div className="flex items-center gap-4">
                        <span className="font-black text-white/90 text-xl">Excellent</span>
                        <div className="flex text-amber-400 gap-0.5">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-7 h-7 fill-current" />)}
                        </div>
                        <span className="font-black text-white/90 text-2xl">4.9</span>
                        <span className="text-slate-200">|</span>
                        <span className="text-white/70 font-bold uppercase tracking-widest text-[11px]">2097 reviews</span>
                    </div>
                    <button className="mt-4 md:mt-0 px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-cyan-700 transition-all">
                        Write a review
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-6 relative z-10 group">
                <div
                    ref={scrollRef}
                    className="flex gap-8 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-8"
                >
                    {googleReviews.map((review, i) => (
                        <motion.div
                            key={i}
                            className="min-w-full md:min-w-[calc(33.33%-22px)] snap-start bg-[#0B111F] p-12 rounded-[50px] border border-white/10 hover:shadow-2xl hover:border-cyan-100 transition-all duration-500 flex flex-col shadow-xl"
                        >
                            <div className="flex text-amber-400 mb-8 space-x-1">
                                {[...Array(review.rating)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-current" />
                                ))}
                            </div>

                            <p className="text-[17px] leading-[1.6] text-white/70 mb-10 font-medium italic">
                                &ldquo;{review.text}&rdquo;
                            </p>

                            <div className="mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-black text-white/90 text-lg">
                                        {review.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white uppercase tracking-tight text-[15px] mb-0.5">
                                            {review.name}
                                        </h4>
                                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                                            {review.date} via Google
                                        </span>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-blue-500 font-black text-xs">
                                    G
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Slider Controls */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 bg-[#0B111F] rounded-full shadow-2xl border border-white/10 flex items-center justify-center text-white/70 hover:text-cyan-700 transition-all opacity-0 group-hover:opacity-100 z-30"
                    aria-label="Previous review"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-14 h-14 bg-[#0B111F] rounded-full shadow-2xl border border-white/10 flex items-center justify-center text-white/70 hover:text-cyan-700 transition-all opacity-0 group-hover:opacity-100 z-30"
                    aria-label="Next review"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </section>
    );
}
