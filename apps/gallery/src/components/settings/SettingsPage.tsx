
import React, { useState, useMemo } from 'react';
import GeneralSettings from './GeneralSettings';
import UserManagement from './UserManagement';
import KioskAppearanceSettings from './KioskAppearanceSettings';
import KioskConnections from './KioskConnections';
import { Photographer, DestinationFeatures } from '../../types.ts';
import PermissionsMatrix from './PermissionsMatrix';
import { usePermissions } from '../../hooks/usePermissions.ts';
import SessionTypesSettings from './SessionTypesSettings';
import SetupGuide from './SetupGuide';
import SystemStatusSettings from './SystemStatusSettings';
import CloudSync from './CloudSync';
import CustomerReceiptSettings from './CustomerReceiptSettings';
import DatabaseManagement from './DatabaseManagement';
import CategoryManagement from './CategoryManagement';
import WatermarkSettings from './WatermarkSettings';
import PhotoSettings from './PhotoSettings';
import MasterPortalLogoSettings from './MasterPortalLogoSettings';
import { isCloudMode } from '../../services/pb.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';

type SettingsTab = 
    | 'Local Portal Settings' | 'Database Engine' | 'Users' | 'Session Types' | 'Categories' 
    | 'Kiosks' | 'Kiosk Appearance' | 'Watermark' | 'Customer Receipt' | 'Master Portal Logo' | 'Permissions' | 'Setup Guide' 
    | 'System Status' | 'Cloud Sync' | 'Photo Processing';

interface SettingsPageProps {
    currentUser: Photographer;
    onCurrentUserUpdate: () => void;
    showToast: (message: string) => void;
    features?: DestinationFeatures;
}

/**
 * SettingsPage Component
 * 
 * Main settings page for the Master Portal, providing access to all system configuration options.
 * 
 * Features:
 * - Tab-based navigation for different settings categories
 * - Permission-based access control
 * - Search functionality for settings
 * - Mobile-responsive design with collapsible menu
 * - Grouped settings by category (System, Data, Operations, Devices, Branding, Security)
 * - Cloud mode detection
 * 
 * Settings Categories:
 * - System & Network: Local portal settings, system status, setup guide
 * - Data & Sync: Cloud sync, database engine
 * - Operations: Session types, categories
 * - Devices: Kiosks, kiosk appearance
 * - Branding: Watermark, customer receipt
 * - Security: Users, permissions
 * 
 * @param {SettingsPageProps} props - Component props
 * @param {Photographer} props.currentUser - Current logged-in user
 * @param {Function} props.onCurrentUserUpdate - Callback when current user is updated
 * @param {Function} props.showToast - Toast notification function
 * @param {DestinationFeatures} [props.features] - Feature flags (e.g., watermark support)
 */
const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onCurrentUserUpdate, showToast, features = { watermark: true } }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('Local Portal Settings');
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const { can } = usePermissions(currentUser);

    const TAB_CONFIG: Record<SettingsTab, { component: React.ReactNode, permission: boolean }> = {
        'Local Portal Settings': { component: <GeneralSettings currentUser={currentUser} onCurrentUserUpdate={onCurrentUserUpdate} showToast={showToast} />, permission: true },
        'System Status': { component: <SystemStatusSettings currentUser={currentUser} />, permission: true },
        'Setup Guide': { component: <SetupGuide />, permission: true },
        'Database Engine': { component: <DatabaseManagement />, permission: can('viewSettings') && !isCloudMode },
        'Cloud Sync': { component: <CloudSync showToast={showToast} />, permission: true },
        'Session Types': { component: <SessionTypesSettings />, permission: can('manageSessionTypes') },
        'Categories': { component: <CategoryManagement />, permission: can('manageSessionTypes') },
        'Photo Processing': { component: <PhotoSettings />, permission: true },
        'Kiosks': { component: <KioskConnections />, permission: true },
        'Kiosk Appearance': { component: <KioskAppearanceSettings showToast={showToast} />, permission: true },
        'Watermark': { component: <WatermarkSettings />, permission: features.watermark },
        'Customer Receipt': { component: <CustomerReceiptSettings />, permission: true },
        'Master Portal Logo': { component: <MasterPortalLogoSettings showToast={showToast} />, permission: true },
        'Users': { component: <UserManagement currentUser={currentUser} />, permission: can('managePhotographers') },
        'Permissions': { component: <PermissionsMatrix />, permission: true },
    };

    const GROUPS = [
        {
            title: 'System & Network',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
            items: ['Local Portal Settings', 'System Status', 'Setup Guide'] as SettingsTab[]
        },
        {
            title: 'Data & Sync',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
            items: ['Cloud Sync', 'Database Engine'] as SettingsTab[]
        },
        {
            title: 'Operations',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01m0 2.693c1.11 0 2.08-.402 2.599-1M12 8c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
            items: ['Session Types', 'Categories', 'Photo Processing'] as SettingsTab[]
        },
        {
            title: 'Devices',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
            items: ['Kiosks', 'Kiosk Appearance'] as SettingsTab[]
        },
        {
            title: 'Branding',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
            items: ['Watermark', 'Customer Receipt', 'Master Portal Logo'] as SettingsTab[]
        },
        {
            title: 'Team & Rights',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
            items: ['Users', 'Permissions'] as SettingsTab[]
        }
    ];

    const filteredGroups = useMemo(() => {
        if (!debouncedSearchTerm) return GROUPS;
        const searchLower = debouncedSearchTerm.toLowerCase();
        return GROUPS.map(group => ({
            ...group,
            items: group.items.filter(tab => 
                TAB_CONFIG[tab].permission && 
                (tab.toLowerCase().includes(searchLower) || group.title.toLowerCase().includes(searchLower))
            )
        })).filter(group => group.items.length > 0);
    }, [debouncedSearchTerm]);

    const renderTabContent = () => {
        const config = TAB_CONFIG[activeTab];
        if (!config || !config.permission) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 w-20 h-20 mb-4 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Settings Available</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
                        You don't have permission to access this settings section.
                    </p>
                </div>
            );
        }
        return <div className="animate-fadeIn">{config.component}</div>;
    };

    return (
        <div className="flex flex-col h-full animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 flex-shrink-0 px-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure system preferences, users, and integrations</p>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start h-[calc(100vh-9rem)]">
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden fixed top-4 left-4 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-lg hover:shadow-xl transition-all"
                    aria-label="Toggle settings menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Mobile Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/50 z-30"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-hidden="true"
                    />
                )}

                <nav className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block fixed lg:relative inset-y-0 left-0 lg:inset-auto z-40 lg:z-auto w-64 flex-shrink-0 space-y-6 lg:sticky lg:top-0 h-full overflow-y-auto custom-scrollbar pr-2 pb-4 bg-white dark:bg-slate-900 lg:bg-transparent border-r lg:border-r-0 border-slate-200 dark:border-slate-700 lg:border-0`}>
                    <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">Settings Menu</h2>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            aria-label="Close menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-3 lg:px-0">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search settings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="px-3 lg:px-0 space-y-6">
                        {filteredGroups.length > 0 ? filteredGroups.map(group => {
                            const visibleItems = group.items.filter(tab => TAB_CONFIG[tab].permission);
                            if (visibleItems.length === 0) return null;
                            return (
                                <div key={group.title} className="animate-fadeIn">
                                    <div className="flex items-center space-x-2 px-3 mb-2 text-slate-400 dark:text-slate-500">
                                        {group.icon}
                                        <h3 className="text-xs font-extrabold uppercase tracking-wider">{group.title}</h3>
                                    </div>
                                    <div className="space-y-0.5">
                                        {visibleItems.map(tab => (
                                            <button 
                                                key={tab} 
                                                onClick={() => {
                                                    setActiveTab(tab);
                                                    setIsMobileMenuOpen(false);
                                                }} 
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-2 ${
                                                    activeTab === tab 
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-600 dark:border-blue-400 shadow-sm' 
                                                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm px-3">
                                No settings found matching "{debouncedSearchTerm}"
                            </div>
                        )}
                    </div>
                </nav>
                <main className="flex-1 min-w-0 w-full h-full overflow-y-auto custom-scrollbar pb-10 px-1 lg:px-4">
                    {renderTabContent()}
                </main>
            </div>
        </div>
    );
};

export default SettingsPage;