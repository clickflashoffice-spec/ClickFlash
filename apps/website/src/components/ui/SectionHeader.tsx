"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    pillText?: string;
    align?: "left" | "center";
    light?: boolean;
}

export function SectionHeader({ title, subtitle, pillText, align = "center", light = false }: SectionHeaderProps) {
    return (
        <div className={`mb-16 ${align === "center" ? "text-center" : "text-left"}`}>
            {(pillText || subtitle) && (
                <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`text-cyan-700 text-sm tracking-[0.3em] uppercase font-bold block mb-4`}
                >
                    {pillText || subtitle}
                </motion.span>
            )}
            {subtitle && pillText && (
                <p className={`text-sm md:text-base mt-2 ${light ? "text-white/70" : "text-white/70"}`}>
                    {subtitle}
                </p>
            )}
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`text-4xl md:text-5xl font-serif font-medium tracking-tight ${light ? "text-white" : "text-white"}`}
            >
                {title}
            </motion.h2>
        </div>
    );
}
