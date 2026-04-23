"use client";

import { ReviewCard } from "../ui/ReviewCard";
import { motion, AnimatePresence } from "framer-motion";

const allReviews = [
    {
        id: 1,
        name: "JOAN MARIE",
        text: "Exceptional service! The photos captured in Santorini were breathtaking. Highly recommend ClickFlash for any destination event.",
        rating: 5,
        date: "2 DAYS AGO",
        source: "google"
    },
    {
        id: 2,
        name: "SARAH SMITH",
        text: "Professional, friendly, and truly skilled. Our family photoshoot was a blast and the results are absolutely stunning! We are so happy.",
        rating: 5,
        date: "1 WEEK AGO",
        source: "google"
    },
    {
        id: 3,
        name: "MIKE JOHNSON",
        text: "The team made us feel so comfortable. We now have a beautiful album to remember our honeymoon forever. Thank you ClickFlash team!",
        rating: 5,
        date: "3 DAYS AGO",
        source: "facebook"
    },
    {
        id: 4,
        name: "ALEX RIVERA",
        text: "Best photography company we've ever worked with. The lighting and composition are world-class.",
        rating: 5,
        date: "5 DAYS AGO",
        source: "google"
    },
    {
        id: 5,
        name: "EMMA WILSON",
        text: "Booked through GetYourGuide and it was the highlight of our trip. The photographer knew all the hidden spots!",
        rating: 5,
        date: "1 MONTH AGO",
        source: "getyourguide"
    },
    {
        id: 6,
        name: "DAVID CHEN",
        text: "Amazing experience! The turn around time was super fast and the quality exceeded our expectations.",
        rating: 5,
        date: "2 WEEKS AGO",
        source: "facebook"
    },
    {
        id: 7,
        name: "SOPHIE MULLER",
        text: "The best memory from our vacation. Professional equipment and an eye for the perfect shot.",
        rating: 5,
        date: "4 DAYS AGO",
        source: "google"
    },
    {
        id: 8,
        name: "MARCO ROSSI",
        text: "Un service incroyable. Les photos sont magnifiques. Merci beaucoup à toute l'équipe!",
        rating: 5,
        date: "12 DAYS AGO",
        source: "getyourguide"
    }
] as const;

interface CustomReviewListProps {
    source: "all" | "google" | "facebook" | "getyourguide";
}

export function CustomReviewList({ source }: CustomReviewListProps) {
    const filteredReviews = source === "all"
        ? allReviews
        : allReviews.filter(r => r.source === source);

    return (
        <div className="relative group/list">
            {/* Mobile/Tablet: Horizontal Swiping | Desktop: Grid */}
            <div className="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto lg:overflow-x-hidden snap-x snap-mandatory no-scrollbar pb-10 -mx-6 px-6 lg:mx-0 lg:px-0">
                <AnimatePresence mode="popLayout">
                    {filteredReviews.map((review) => (
                        <motion.div
                            key={review.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="min-w-[85vw] md:min-w-[45vw] lg:min-w-0 snap-center"
                        >
                            <ReviewCard {...review} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Mobile Interaction Hint */}
            <div className="flex lg:hidden justify-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            </div>

            {/* Visual indicator for swiping on desktop/tablet if needed */}
            <div className="hidden md:block lg:hidden absolute -right-4 top-1/2 -translate-y-1/2 bg-white/50 backdrop-blur-md p-2 rounded-full shadow-lg opacity-0 group-hover/list:opacity-100 transition-opacity">
                <div className="w-6 h-6 border-r-2 border-t-2 border-slate-300 rotate-45 translate-x-1" />
            </div>
        </div>
    );
}
