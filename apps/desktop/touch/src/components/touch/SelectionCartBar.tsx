import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectionCartBarProps {
    onShowCart: () => void;
    count: number;
}

const SelectionCartBar: React.FC<SelectionCartBarProps> = ({ onShowCart, count }) => {
    return (
        <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onShowCart} 
            data-testid="cart-button" 
            className="w-24 h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center border border-white/40 dark:border-white/10 hover:border-blue-500/50 transition-colors relative"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <AnimatePresence>
                {count > 0 && (
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white font-bold text-sm rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-lg"
                    >
                        {count}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

export default SelectionCartBar;