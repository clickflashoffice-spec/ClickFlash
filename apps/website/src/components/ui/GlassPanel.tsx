"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export function GlassPanel({ children, className, hover = true }: GlassPanelProps) {
    return (
        <motion.div
            whileHover={hover ? { y: -5, borderColor: "rgba(212, 175, 55, 0.3)" } : {}}
            className={cn(
                "glass-panel rounded-2xl p-8 transition-all duration-300",
                className
            )}
        >
            {children}
        </motion.div>
    );
}
