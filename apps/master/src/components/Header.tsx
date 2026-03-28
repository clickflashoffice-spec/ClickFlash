
import React from 'react';
import { Photographer } from '../types';
import { pb } from '../services/pb.ts';

interface HeaderProps {
    currentUser: Photographer;
    onMenuClick: () => void;
}

/**
 * Header Component
 * 
 * Displays the mobile header with user info and menu toggle.
 * Hidden on desktop as the sidebar takes over navigation.
 */
const Header: React.FC<HeaderProps> = ({ currentUser, onMenuClick }) => {
    return (
        <header role="banner" className="md:hidden flex justify-between items-center p-3 sm:p-4 glass-panel border-x-0 border-t-0 rounded-none sticky top-0 z-30 no-print shadow-xl">
            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-sm opacity-20"></div>
                    <img
                        src={
                            currentUser.avatarUrl
                                ? (currentUser.avatarUrl.startsWith('http') || currentUser.avatarUrl.startsWith('data:')
                                    ? currentUser.avatarUrl
                                    : `${pb.baseUrl}${currentUser.avatarUrl.startsWith('/') ? '' : '/'}${currentUser.avatarUrl}`)
                                : 'https://i.imgur.com/3Y2j2s2.png'
                        }
                        alt={currentUser.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 relative rounded-xl ring-2 ring-white/30 dark:ring-white/10 shadow-lg object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== 'https://i.imgur.com/3Y2j2s2.png') {
                                target.src = 'https://i.imgur.com/3Y2j2s2.png';
                            }
                        }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-md"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-sm sm:text-base leading-tight text-slate-900 dark:text-white truncate font-heading">{currentUser.name}</h1>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider opacity-80 truncate">{currentUser.role}</p>
                </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                    onClick={onMenuClick}
                    aria-label="Open menu"
                    className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl glass-button text-slate-700 dark:text-slate-300 active:scale-95 shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </header>
    );
};

export default Header;
