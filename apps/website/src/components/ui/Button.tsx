"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, HTMLMotionProps } from "framer-motion";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size"> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}

export function Button({
    className,
    variant = "primary",
    size = "md",
    children,
    ...props
}: ButtonProps) {
    const variants = {
        primary: "bg-cyan-700 text-white hover:bg-slate-900",
        secondary: "bg-slate-900 text-white hover:bg-slate-800",
        outline: "border border-cyan-500/20 text-cyan-700 hover:bg-cyan-700/10",
        ghost: "text-white/70 hover:text-cyan-700 hover:bg-cyan-700/5",
    };

    const sizes = {
        sm: "px-4 py-2 text-xs",
        md: "px-8 py-4 text-xs",
        lg: "px-10 py-5 text-sm",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "inline-flex items-center justify-center font-bold uppercase tracking-widest transition-all",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </motion.button>
    );
}
