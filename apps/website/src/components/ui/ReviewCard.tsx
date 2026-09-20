"use client";

import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface ReviewCardProps {
    name: string;
    text: string;
    rating: number;
    date: string;
    source: "google" | "facebook" | "getyourguide";
}

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
    </svg>
);

const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1877F2]" fill="currentColor">
        <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-8.74h-2.94v-3.411h2.94v-2.511c0-2.91 1.777-4.495 4.375-4.495 1.243 0 2.312.093 2.623.134v3.041l-1.799.001c-1.412 0-1.685.671-1.685 1.655v2.167h3.368l-.438 3.411h-2.93v8.74h6.107c.731 0 1.324-.593 1.324-1.324v-21.35c0-.732-.593-1.325-1.324-1.325z" />
    </svg>
);

const GetYourGuideIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500" fill="currentColor">
        <path d="M21.78 13.47l-1.66-4.99L18.46 3.5a1.24 1.24 0 0 0-2.36 0L14.44 8.48l-1.66 5a1.24 1.24 0 0 0 1.18 1.63h1.37l-1.63 4.89a.62.62 0 0 0 1.18.39l2.76-8.28h1.29a1.24 1.24 0 0 0 1.18-1.63l-1.33-3.99 1.33 3.99a1.24 1.24 0 0 0 1.18 1.63h.49zM9.56 15.11H8.19l1.63-4.89a.62.62 0 0 0-1.18-.39L5.88 18.11H4.59a1.24 1.24 0 0 0-1.18 1.63l0 .01a.62.62 0 0 0 .59.42h6.14a.62.62 0 0 0 .59-.42l.01-.03a1.24 1.24 0 0 0-1.18-1.61z" />
    </svg>
);

export function ReviewCard({ name, text, rating, date, source }: ReviewCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#0B111F] p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col relative h-full"
        >
            <div className="absolute top-8 right-8 text-slate-200">
                {source === 'google' && <GoogleIcon />}
                {source === 'facebook' && <FacebookIcon />}
                {source === 'getyourguide' && <GetYourGuideIcon />}
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-black text-white/90 text-lg uppercase">
                    {name.charAt(0)}
                </div>
                <div>
                    <h4 className="font-black text-white text-sm mb-0.5">
                        {name}
                    </h4>
                    <span className="text-[11px] text-white/70 font-medium tracking-wider">
                        {date}
                    </span>
                </div>
            </div>

            <div className="flex text-amber-400 mb-4 gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-4 h-4 ${i < rating ? 'fill-current' : 'text-slate-200'}`}
                    />
                ))}
            </div>

            <p className="text-[15px] leading-relaxed text-white/70 font-medium">
                "{text}"
            </p>
        </motion.div>
    );
}
