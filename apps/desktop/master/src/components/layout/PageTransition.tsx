import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export type TransitionVariant = 'fade' | 'slide' | 'scale';

interface PageTransitionProps {
    children: React.ReactNode;
    viewKey: string;
    variant?: TransitionVariant;
    className?: string;
}

const variants: Record<TransitionVariant, Variants> = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    },
    slide: {
        initial: { opacity: 0, y: 10 },
        animate: { 
            opacity: 1, 
            y: 0, 
            transition: { 
                duration: 0.4, 
                staggerChildren: 0.1 
            } 
        },
        exit: { 
            opacity: 0, 
            y: -8, 
            transition: { 
                duration: 0.25 
            } 
        }
    },
    scale: {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
    }
};

/**
 * PageTransition Component
 * 
 * High-performance view transitions using framer-motion.
 * Provides preset entry animations for all portal views.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ 
    children, 
    viewKey, 
    variant = 'slide',
    className = 'w-full h-full' 
}) => {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={viewKey}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants[variant]}
                className={className}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

PageTransition.displayName = 'PageTransition';
export default React.memo(PageTransition);
