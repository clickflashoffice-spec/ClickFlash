
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Photographer, DestinationFeatures } from '../../types.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { isCloudMode } from '../../services/pb.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';
import {
    Settings,
    Database,
    Cloud,
    HardDrive,
    ShoppingBag,
    Image,
    Printer,
    Smartphone,
    Palette,
    Users,
    Shield,
    BookOpen,
    Activity,
    Zap,
    Layout,
    Search,
    X,
    ChevronRight,
    Star,
    Save,
    RotateCcw,
    AlertCircle,
    Wifi,
    Server,
    Camera,
    Trash2,
    FileText,
    UserCircle
} from 'lucide-react';

// Lazy load settings components
const GeneralSettings = lazy(() => import('./GeneralSettings'));
const SystemStatusSettings = lazy(() => import('./SystemStatusSettings'));
const SetupGuide = lazy(() => import('./SetupGuide'));
const DocumentationPage = lazy(() => import('./DocumentationPage'));
const DatabaseManagement = lazy(() => import('./DatabaseManagement'));
const CloudSettings = lazy(() => import('./CloudSettings'));
const BackupSettings = lazy(() => import('./BackupSettings'));
const DataManagementSettings = lazy(() => import('./DataManagementSettings'));
const SessionTypesSettings = lazy(() => import('./SessionTypesSettings'));
const CategoryManagement = lazy(() => import('./CategoryManagement'));
const PhotoSettings = lazy(() => import('./PhotoSettings'));
const AISettings = lazy(() => import('./AISettings'));
const PrintSettings = lazy(() => import('./PrintSettings'));
const KioskConnections = lazy(() => import('./KioskConnections'));
const WatermarkSettings = lazy(() => import('./WatermarkSettings'));
const CustomerReceiptSettings = lazy(() => import('./CustomerReceiptSettings'));
const UserManagement = lazy(() => import('./UserManagement'));
const PermissionsMatrix = lazy(() => import('./PermissionsMatrix'));
const ProductsAndPricing = lazy(() => import('./ProductsAndPricing'));
const AccountSettings = lazy(() => import('./AccountSettings'));

export type SettingsTab =
    | 'account'
    | 'general'
    | 'system'
    | 'database'
    | 'cloud'
    | 'backup'
    | 'data'
    | 'products'
    | 'session-types'
    | 'categories'
    | 'photos'
    | 'ai'
    | 'print'
    | 'kiosks'
    | 'watermark'
    | 'receipts'
    | 'users'
    | 'permissions'
    | 'guide'
    | 'docs';

interface SettingsPageProps {
    currentUser: Photographer;
    onCurrentUserUpdate: (user?: Photographer) => void;
    showToast: (message: string) => void;
    features?: DestinationFeatures;
    initialTab?: SettingsTab;
}

// Loading component
const SettingsTabLoader: React.FC = () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading settings...</p>
        </div>
    </div>
);

// Navigation item component
interface NavItemProps {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    isFavorite: boolean;
    hasChanges?: boolean;
    onClick: () => void;
    onToggleFavorite: (e: React.MouseEvent) => void;
}

const NavItem: React.FC<NavItemProps> = ({
    id: _id,
    label,
    icon: Icon,
    isActive,
    isFavorite,
    hasChanges,
    onClick,
    onToggleFavorite
}) => (
    <button
        onClick={onClick}
        className={`
            group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-200 ease-out
            ${isActive 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }
        `}
    >
        <div className={`
            p-1.5 rounded-lg transition-colors
            ${isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700'}
        `}>
            <Icon className="w-4 h-4" />
        </div>
        <span className="flex-1 text-left truncate">{label}</span>
        
        <div className="flex items-center gap-1">
            {hasChanges && <span className="w-2 h-2 bg-amber-400 rounded-full" title="Unsaved changes" />}
            <button
                onClick={onToggleFavorite}
                className={`
                    p-1 rounded transition-all opacity-0 group-hover:opacity-100
                    ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}
                `}
            >
                <Star className={`
                    w-3.5 h-3.5 transition-colors
                    ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}
                `} />
            </button>
            {isActive && <ChevronRight className="w-4 h-4" />}
        </div>
    </button>
);

// Section header component
const SectionHeader: React.FC<{ title: string; icon: React.ElementType }> = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</span>
    </div>
);

// Quick action button
interface QuickActionProps {
    icon: React.ElementType;
    label: string;
    description: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
}

const QuickAction: React.FC<QuickActionProps> = ({ 
    icon: Icon, 
    label, 
    description, 
    onClick,
    variant = 'secondary'
}) => {
    const variants = {
        primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg',
        secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-300',
        danger: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
    };
    
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${variants[variant]}`}>
            <div className={`p-2 rounded-lg ${variant === 'primary' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs opacity-70 truncate">{description}</p>
            </div>
        </button>
    );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ 
    currentUser, 
    onCurrentUserUpdate, 
    showToast, 
    features = { watermark: true }, 
    initialTab = 'general'
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [favorites, setFavorites] = useState<SettingsTab[]>(['account', 'general', 'system']);
    const [hasChanges, setHasChanges] = useState<Set<SettingsTab>>(new Set());
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const { can } = usePermissions(currentUser);

    // Settings configuration - REMOVED DUPLICATES:
    // - Removed 'Kiosk Mode' (merged into Kiosks)
    // - Removed 'Branding' (merged into Watermark/Receipts)
    const SETTINGS_CONFIG: Record<SettingsTab, {
        label: string;
        icon: React.ElementType;
        component: React.ReactNode;
        permission: boolean;
        description: string;
        keywords: string[];
    }> = {
        account: {
            label: 'My Account',
            icon: UserCircle,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <AccountSettings
                        currentUser={currentUser}
                        onCurrentUserUpdate={onCurrentUserUpdate}
                        showToast={showToast}
                    />
                </Suspense>
            ),
            permission: true,
            description: 'Profile and Face ID authentication settings',
            keywords: ['account', 'profile', 'face', 'login', 'authentication', 'biometric']
        },
        general: {
            label: 'General & Network',
            icon: Settings,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <GeneralSettings 
                        currentUser={currentUser} 
                        onCurrentUserUpdate={onCurrentUserUpdate} 
                        showToast={showToast}
                        onHasChanges={(has) => setHasChanges(prev => {
                            const next = new Set(prev);
                            has ? next.add('general') : next.delete('general');
                            return next;
                        })}
                    />
                </Suspense>
            ),
            permission: true,
            description: 'Network, destination, and basic configuration',
            keywords: ['network', 'ip', 'destination', 'license', 'connection', 'currency']
        },
        system: {
            label: 'System Status',
            icon: Activity,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <SystemStatusSettings currentUser={currentUser} />
                </Suspense>
            ),
            permission: true,
            description: 'System health, diagnostics, and logs',
            keywords: ['health', 'status', 'diagnostics', 'logs', 'performance']
        },
        guide: {
            label: 'Setup Guide',
            icon: BookOpen,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <SetupGuide />
                </Suspense>
            ),
            permission: true,
            description: 'Step-by-step setup instructions',
            keywords: ['setup', 'guide', 'tutorial', 'help', 'getting started']
        },
        docs: {
            label: 'Documentation',
            icon: FileText,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <DocumentationPage />
                </Suspense>
            ),
            permission: true,
            description: 'Complete system documentation',
            keywords: ['docs', 'documentation', 'manual', 'help', 'reference']
        },
        database: {
            label: 'Database',
            icon: Database,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <DatabaseManagement />
                </Suspense>
            ),
            permission: can('viewSettings') && !isCloudMode && can('manageSystemInfrastructure'),
            description: 'Database management, migrations, and optimization',
            keywords: ['database', 'db', 'sqlite', 'migration', 'schema']
        },
        cloud: {
            label: 'Cloud Sync',
            icon: Cloud,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <CloudSettings />
                </Suspense>
            ),
            permission: can('manageSystemInfrastructure'),
            description: 'Cloud synchronization and Management Hub settings',
            keywords: ['cloud', 'sync', 'management hub', 'upload', 'backup']
        },
        backup: {
            label: 'Backup & Restore',
            icon: HardDrive,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <BackupSettings showToast={showToast} />
                </Suspense>
            ),
            permission: can('manageSystemInfrastructure'),
            description: 'Data backup, export, and recovery options',
            keywords: ['backup', 'restore', 'export', 'import', 'data']
        },
        data: {
            label: 'Data Cleanup',
            icon: Trash2,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <DataManagementSettings />
                </Suspense>
            ),
            permission: can('manageSystemInfrastructure'),
            description: 'Archive old data and free up storage',
            keywords: ['cleanup', 'archive', 'storage', 'delete', 'remove']
        },
        products: {
            label: 'Products & Pricing',
            icon: ShoppingBag,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <ProductsAndPricing />
                </Suspense>
            ),
            permission: currentUser.role === 'Admin' || currentUser.role === 'CEO',
            description: 'Product catalog, pricing, and packages',
            keywords: ['products', 'pricing', 'catalog', 'shop', 'packages', 'prints']
        },
        'session-types': {
            label: 'Session Types',
            icon: Camera,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <SessionTypesSettings />
                </Suspense>
            ),
            permission: can('manageSessionTypes'),
            description: 'Photography session types and configurations',
            keywords: ['session', 'types', 'photography', 'shoot', 'booking']
        },
        categories: {
            label: 'Categories',
            icon: Layout,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <CategoryManagement />
                </Suspense>
            ),
            permission: can('manageSessionTypes'),
            description: 'Album and photo organization categories',
            keywords: ['categories', 'tags', 'organization', 'folders']
        },
        photos: {
            label: 'Photo Processing',
            icon: Image,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <PhotoSettings />
                </Suspense>
            ),
            permission: can('manageLocalSettings'),
            description: 'Photo import, processing, and storage settings',
            keywords: ['photos', 'processing', 'import', 'exif', 'metadata', 'storage']
        },
        ai: {
            label: 'AI & Face Recognition',
            icon: Zap,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <AISettings />
                </Suspense>
            ),
            permission: can('manageLocalSettings'),
            description: 'AI features, face recognition, and smart tagging',
            keywords: ['ai', 'face', 'recognition', 'smart', 'auto', 'ml']
        },
        print: {
            label: 'Print & DNP',
            icon: Printer,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <PrintSettings />
                </Suspense>
            ),
            permission: can('manageLocalSettings'),
            description: 'Printer configuration and DNP settings',
            keywords: ['print', 'printer', 'dnp', 'queue', 'fulfillment']
        },
        kiosks: {
            label: 'Touch Kiosks',
            icon: Smartphone,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <KioskConnections />
                </Suspense>
            ),
            permission: can('manageLocalSettings'),
            description: 'Kiosk pairing, sync, and interface settings',
            keywords: ['kiosk', 'touch', 'pair', 'connection', 'sync', 'interface']
        },
        watermark: {
            label: 'Watermark & Branding',
            icon: Palette,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <WatermarkSettings />
                </Suspense>
            ),
            permission: can('manageLocalSettings') && (features?.watermark ?? false),
            description: 'Photo watermark, logo, and branding settings',
            keywords: ['watermark', 'logo', 'overlay', 'protection', 'brand', 'appearance']
        },
        receipts: {
            label: 'Customer Receipts',
            icon: Printer,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <CustomerReceiptSettings />
                </Suspense>
            ),
            permission: can('manageLocalSettings'),
            description: 'Receipt templates and customer communication',
            keywords: ['receipt', 'invoice', 'template', 'print', 'email', 'customer']
        },
        users: {
            label: 'Team & Users',
            icon: Users,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <UserManagement currentUser={currentUser} />
                </Suspense>
            ),
            permission: can('managePhotographers'),
            description: 'Manage photographers, staff, and user profiles',
            keywords: ['users', 'photographers', 'staff', 'team', 'profile', 'account']
        },
        permissions: {
            label: 'Permissions',
            icon: Shield,
            component: (
                <Suspense fallback={<SettingsTabLoader />}>
                    <PermissionsMatrix />
                </Suspense>
            ),
            permission: currentUser.role === 'Admin' || currentUser.role === 'CEO',
            description: 'Role-based access control and permissions',
            keywords: ['permissions', 'roles', 'access', 'security', 'rights', 'admin']
        }
    };

    // Streamlined groups - REMOVED 'Branding' group (merged into Operations)
    const GROUPS = [
        {
            id: 'favorites',
            title: 'Favorites',
            icon: Star,
            items: favorites.filter(tab => SETTINGS_CONFIG[tab].permission)
        },
        {
            id: 'system',
            title: 'System',
            icon: Server,
            items: ['general', 'system', 'guide', 'docs'] as SettingsTab[]
        },
        {
            id: 'data',
            title: 'Data Management',
            icon: Database,
            items: ['cloud', 'database', 'backup', 'data'] as SettingsTab[]
        },
        {
            id: 'business',
            title: 'Business Setup',
            icon: ShoppingBag,
            items: ['products', 'session-types', 'categories'] as SettingsTab[]
        },
        {
            id: 'processing',
            title: 'Processing',
            icon: Image,
            items: ['photos', 'ai', 'print'] as SettingsTab[]
        },
        {
            id: 'devices',
            title: 'Devices & Output',
            icon: Smartphone,
            items: ['kiosks', 'watermark', 'receipts'] as SettingsTab[]
        },
        {
            id: 'team',
            title: 'Team Management',
            icon: Users,
            items: ['users', 'permissions'] as SettingsTab[]
        }
    ];

    // Filter groups
    const filteredGroups = useMemo(() => {
        if (!debouncedSearchTerm) {
            return GROUPS.map(group => ({
                ...group,
                items: group.items.filter(tab => SETTINGS_CONFIG[tab].permission)
            })).filter(group => group.items.length > 0);
        }
        
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchingTabs = (Object.keys(SETTINGS_CONFIG) as SettingsTab[]).filter(tab => {
            const config = SETTINGS_CONFIG[tab];
            if (!config.permission) return false;
            return (
                config.label.toLowerCase().includes(searchLower) ||
                config.description.toLowerCase().includes(searchLower) ||
                config.keywords.some(k => k.toLowerCase().includes(searchLower))
            );
        });
        
        return [{
            id: 'search',
            title: 'Search Results',
            icon: Search,
            items: matchingTabs
        }];
    }, [debouncedSearchTerm]);

    const toggleFavorite = (tab: SettingsTab) => {
        setFavorites(prev => 
            prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]
        );
    };

    const unsavedCount = hasChanges.size;

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
    };

    const renderTabContent = () => {
        const config = SETTINGS_CONFIG[activeTab];
        if (!config || !config.permission) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Shield className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Access Restricted</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                        Contact your administrator for access to this setting.
                    </p>
                </div>
            );
        }

        return config.component;
    };

    const activeConfig = SETTINGS_CONFIG[activeTab];

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {activeConfig?.description || 'Configure your Master Portal'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {unsavedCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{unsavedCount} unsaved</span>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            title="Refresh"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className={`
                    w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
                    flex flex-col
                    ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden lg:flex'}
                `}>
                    {/* Search */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search settings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-9 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {filteredGroups.map(group => (
                            <div key={group.id}>
                                <SectionHeader title={group.title} icon={group.icon} />
                                <div className="space-y-0.5">
                                    {group.items.map(tab => (
                                        <NavItem
                                            key={tab}
                                            id={tab}
                                            label={SETTINGS_CONFIG[tab].label}
                                            icon={SETTINGS_CONFIG[tab].icon}
                                            isActive={activeTab === tab}
                                            isFavorite={favorites.includes(tab)}
                                            hasChanges={hasChanges.has(tab)}
                                            onClick={() => handleTabChange(tab)}
                                            onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(tab); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        
                        {filteredGroups.length === 0 && (
                            <div className="text-center py-8">
                                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm text-slate-500">No settings found</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <SectionHeader title="Quick Actions" icon={Zap} />
                        <div className="space-y-2">
                            <QuickAction
                                icon={Save}
                                label="Save All Changes"
                                description="Save pending settings"
                                onClick={() => showToast('Saving...')}
                                variant="primary"
                            />
                            <QuickAction
                                icon={Wifi}
                                label="Test Connection"
                                description="Verify network status"
                                onClick={() => showToast('Testing...')}
                            />
                        </div>
                    </div>
                </aside>

                {/* Mobile overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                )}

                {/* Main content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    <div className="lg:hidden p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="flex items-center gap-2 text-slate-600">
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">Settings Menu</span>
                        </button>
                    </div>

                    <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {activeConfig && <activeConfig.icon className="w-5 h-5 text-cyan-500" />}
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeConfig?.label}</h2>
                                    <p className="text-sm text-slate-500">{activeConfig?.description}</p>
                                </div>
                            </div>
                            {hasChanges.has(activeTab) && (
                                <div className="flex items-center gap-2 text-amber-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">Unsaved</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6">{renderTabContent()}</div>
                </main>
            </div>

        </div>
    );
};

export default SettingsPage;
