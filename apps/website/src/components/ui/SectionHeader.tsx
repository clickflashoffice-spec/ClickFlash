"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    align?: "left" | "center";
    light?: boolean;
}

export function SectionHeader({ title, subtitle, align = "center", light = false }: SectionHeaderProps) {
    return (
        <div className={`mb-16 ${align === "center" ? "text-center" : "text-left"}`}>
            <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`text-cyan-500 text-sm tracking-[0.3em] uppercase font-bold block mb-4`}
            >
                {subtitle}
            </motion.span>
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl md:text-5xl font-serif font-medium tracking-tight ${light ? "text-slate-900" : "text-white"}`}
            >
                {title}
            </motion.h2>
        </div>
    );
}
