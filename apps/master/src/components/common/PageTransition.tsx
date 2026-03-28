import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    viewKey: string;
}

/**
 * PageTransition Component
 * 
 * High-performance view transitions using framer-motion.
 * Provides a standardized slide-up and fade entry for all portal views.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children, viewKey }) => {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={viewKey}
                initial={{ opacity: 0, y: 12, scale: 0.99 }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for a "premium" feel
                        staggerChildren: 0.1
                    }
                }}
                exit={{
                    opacity: 0,
                    y: -8,
                    scale: 0.99,
                    transition: {
                        duration: 0.25,
                        ease: "easeInOut"
                    }
                }}
                className="w-full h-full origin-top"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default React.memo(PageTransition);
