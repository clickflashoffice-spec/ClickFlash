import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Folder, Image as ImageIcon, ShoppingBag, 
    User, Sparkles, Settings, Command, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommandItem {
    id: string;
    title: string;
    category: 'Albums' | 'Photos' | 'Orders' | 'Photographers' | 'AI Commands' | 'Settings';
    icon: React.ElementType;
    action: () => void;
}

const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Mock data for commands
    const allCommands: CommandItem[] = [
        { id: '1', title: 'View Recent Albums', category: 'Albums', icon: Folder, action: () => navigate('/albums') },
        { id: '2', title: 'Create New Album', category: 'Albums', icon: Folder, action: () => console.log('Create album') },
        { id: '3', title: 'Search All Photos', category: 'Photos', icon: ImageIcon, action: () => navigate('/photos') },
        { id: '4', title: 'View Pending Orders', category: 'Orders', icon: ShoppingBag, action: () => navigate('/orders') },
        { id: '5', title: 'Manage Photographers', category: 'Photographers', icon: User, action: () => navigate('/photographers') },
        { id: '6', title: 'Auto-Cull Album', category: 'AI Commands', icon: Sparkles, action: () => console.log('Auto-cull') },
        { id: '7', title: 'Enhance Photo', category: 'AI Commands', icon: Sparkles, action: () => console.log('Enhance photo') },
        { id: '8', title: 'Open Assistant', category: 'AI Commands', icon: Sparkles, action: () => console.log('Open assistant') },
        { id: '9', title: 'System Settings', category: 'Settings', icon: Settings, action: () => navigate('/settings') },
    ];

    const filteredCommands = allCommands.filter(cmd => 
        cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group commands by category
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) {
            acc[cmd.category] = [];
        }
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, CommandItem[]>);

    const flatCommands = Object.values(groupedCommands).flat();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % flatCommands.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (flatCommands[selectedIndex]) {
                flatCommands[selectedIndex].action();
                setIsOpen(false);
            }
        }
    };

    let globalIndex = 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center px-4 border-b border-zinc-800 h-14 shrink-0">
                            <Search className="w-5 h-5 text-zinc-400 mr-3 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full bg-transparent border-none text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0 text-lg"
                                placeholder="What do you need?"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                                <span className="text-xs text-zinc-500 font-medium bg-zinc-800 px-2 py-1 rounded">ESC</span>
                                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            {Object.entries(groupedCommands).map(([category, items]) => (
                                <div key={category} className="mb-4 last:mb-0">
                                    <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        {category}
                                    </div>
                                    <div className="space-y-1">
                                        {items.map((item) => {
                                            const currentIndex = globalIndex++;
                                            const isSelected = currentIndex === selectedIndex;
                                            const Icon = item.icon;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100'
                                                    }`}
                                                    onClick={() => {
                                                        item.action();
                                                        setIsOpen(false);
                                                    }}
                                                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                                                >
                                                    <Icon className={`w-5 h-5 mr-3 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                                                    <span className="flex-1 font-medium">{item.title}</span>
                                                    {isSelected && (
                                                        <span className="text-xs opacity-75 font-medium ml-2">
                                                            Enter to select
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {flatCommands.length === 0 && (
                                <div className="p-8 text-center text-zinc-500">
                                    <Command className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p>No results found for "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
