import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, User, FileText, Settings, LayoutGrid, Image as ImageIcon, Loader2, Camera } from 'lucide-react';
import { useGlobalSearch, SearchResult } from '../../../context/GlobalSearchContext';
import { SearchResultItem } from './SearchResultItem';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useNavigate } from 'react-router-dom';
import { Photographer } from '../../../types';
import { usePermissions } from '../../../hooks/usePermissions';
import { searchService } from '../../../services/SearchService';
import { logger } from '@/utils/logger';

interface GlobalSearchProps {
    currentUser: Photographer | null;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ currentUser }) => {
    const { isOpen, close, query, setQuery, isLoading, setIsLoading } = useGlobalSearch();
    const navigate = useNavigate();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { can } = usePermissions(currentUser);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Define Navigation Items
    const navigationItems: SearchResult[] = useMemo(() => {
        const items: SearchResult[] = [
            { id: 'nav-dashboard', title: 'Dashboard', type: 'navigation', icon: <LayoutGrid size={18} />, url: '/dashboard', permission: 'viewDashboard', keywords: ['home', 'main'] },
            { id: 'nav-orders', title: 'Orders', type: 'navigation', icon: <FileText size={18} />, url: '/orders', permission: 'viewOrders', keywords: ['sales', 'transactions'] },
            { id: 'nav-albums', title: 'Albums', type: 'navigation', icon: <ImageIcon size={18} />, url: '/albums', permission: 'viewAlbums', keywords: ['galleries', 'events'] },
            { id: 'nav-photographers', title: 'Photographers', type: 'navigation', icon: <Camera size={18} />, url: '/photographers', permission: 'viewPhotographers', keywords: ['users', 'staff'] },
            { id: 'nav-clients', title: 'Clients', type: 'navigation', icon: <User size={18} />, url: '/clients', permission: 'viewClients', keywords: ['customers', 'people'] },
            { id: 'nav-settings', title: 'Settings', type: 'navigation', icon: <Settings size={18} />, url: '/settings', permission: 'viewSettings', keywords: ['config', 'preferences'] },
            { id: 'nav-growth', title: 'Growth Hub', type: 'navigation', icon: <Search size={18} />, url: '/growth', permission: 'viewGrowth', keywords: ['marketing', 'retention', 'money trash'] },
        ];

        // Filter by permissions
        return items.filter(item => !item.permission || can(item.permission as any));
    }, [can]);

    // Compute Filtered Results
    const [results, setResults] = useState<SearchResult[]>([]);

    useEffect(() => {
        const performSearch = async () => {
            setIsLoading(true);
            try {
                const searchResults = await searchService.search(query);

                // Merge with navigation items if query is empty or matches navigation
                if (!query.trim()) {
                    setResults(navigationItems);
                } else {
                    const lowerQuery = query.toLowerCase();
                    const navMatches = navigationItems.filter(item =>
                        item.title.toLowerCase().includes(lowerQuery) ||
                        item.keywords?.some(k => k.includes(lowerQuery))
                    );
                    setResults([...navMatches, ...searchResults]);
                }
            } catch (error) {
                logger.error('Search failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(performSearch, 150);
        return () => clearTimeout(timer);
    }, [query, navigationItems]);

    const filteredResults = results;

    // Handle Selection
    const handleSelect = (result: SearchResult) => {
        close();
        if (result.action) {
            result.action();
        } else if (result.url) {
            navigate(result.url);
        }
    };

    // Keyboard Navigation
    useKeyboardShortcuts('ArrowDown', (e) => {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredResults.length);
        // Scroll into view logic could go here
    });

    useKeyboardShortcuts('ArrowUp', (e) => {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
    });

    useKeyboardShortcuts('Enter', (e) => {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
            handleSelect(filteredResults[selectedIndex]);
        }
    });

    useKeyboardShortcuts('Escape', () => close());

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
                    onClick={close}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col max-h-[70vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />
                            ) : (
                                <Search className="w-5 h-5 text-slate-400 mr-3" />
                            )}
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search orders, albums, clients, or navigate..."
                                className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 dark:text-white placeholder:text-slate-400"
                                autoFocus
                            />
                            <div className="flex items-center gap-2">
                                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-sans">
                                    <span className="text-xs">ESC</span>
                                </kbd>
                                <button
                                    onClick={close}
                                    aria-label="Close search"
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {filteredResults.length > 0 ? (
                                <ul ref={listRef} className="space-y-1">
                                    {filteredResults.map((result, index) => (
                                        <SearchResultItem
                                            key={result.id}
                                            result={result}
                                            isSelected={index === selectedIndex}
                                            onClick={() => handleSelect(result)}
                                        />
                                    ))}
                                </ul>
                            ) : (
                                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                    <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No results found for "{query}"</p>
                                    <p className="text-sm opacity-60 mt-1">Try searching for navigation items, orders, or albums.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                                <span><kbd className="font-sans px-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↵</kbd> to select</span>
                                <span><kbd className="font-sans px-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↑↓</kbd> to navigate</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-60">
                                <span>Global Search</span>
                                <Command className="w-3 h-3" />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
