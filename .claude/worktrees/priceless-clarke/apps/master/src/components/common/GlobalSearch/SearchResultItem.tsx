import React from 'react';
import { motion } from 'framer-motion';
import { SearchResult } from '../../../context/GlobalSearchContext';
import { ChevronRight } from 'lucide-react';

interface SearchResultItemProps {
    result: SearchResult;
    isSelected: boolean;
    onClick: () => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, isSelected, onClick }) => {
    return (
        <motion.li
            layout
            onClick={onClick}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200
                ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'}
            `}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`
                    p-2 rounded-lg flex-shrink-0 transition-colors
                    ${isSelected ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}
                `}>
                    {result.icon}
                </div>

                <div className="flex flex-col overflow-hidden">
                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        {result.title}
                    </span>
                    {result.subtitle && (
                        <span className={`text-xs truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-500'}`}>
                            {result.subtitle}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {result.type}
                </span>
                {isSelected && (
                    <motion.div layoutId="enter-icon">
                        <ChevronRight className="w-4 h-4 text-blue-500" />
                    </motion.div>
                )}
            </div>
        </motion.li>
    );
};
