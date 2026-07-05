
import React, { useState, useMemo, useCallback } from 'react';
import { Photographer, Order } from '../types.ts';
import { useCurrency } from './CurrencyContext';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useDebounce } from '../hooks/useDebounce.ts';
import {
    Users,
    Camera,
    TrendingUp,
    DollarSign,
    Award,
    Search,
    Target,
    Shield,
    X,
    Download,
    Image as ImageIcon,
    Star
} from 'lucide-react';
import FaceEnrollmentSection from './settings/FaceEnrollmentSection';

interface PhotographersProps {
    currentUser: Photographer;
    photographers: Photographer[];
    orders: Order[];
    refreshData: () => void;
}

// Memoized stat card
const StatCard = React.memo<{ 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    trend?: string;
    color?: 'blue' | 'green' | 'purple' | 'amber';
}>(({ title, value, icon: Icon, trend, color = 'blue' }) => {
    const colors = {
        blue: 'from-blue-500 to-cyan-500',
        green: 'from-emerald-500 to-green-500',
        purple: 'from-purple-500 to-violet-500',
        amber: 'from-amber-500 to-orange-500'
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                    {trend && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {trend}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} text-white shadow-lg`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
});

// Memoized photographer card
const PhotographerCard = React.memo<{
    photographer: Photographer & { 
        totalSales: number; 
        orderCount: number; 
        photoCount: number;
        earned: number;
        progress: number;
    };
    onClick: () => void;
    isSelected: boolean;
}>(({ photographer, onClick, isSelected }) => {
    const { formatCurrency } = useCurrency();
    const progressColor = photographer.progress >= 100 ? 'bg-emerald-500' : 
                         photographer.progress >= 75 ? 'bg-blue-500' : 
                         photographer.progress >= 50 ? 'bg-amber-500' : 'bg-red-500';
    
    return (
        <div 
            onClick={onClick}
            className={`
                bg-white dark:bg-slate-800 rounded-2xl border-2 p-5 cursor-pointer
                transition-all duration-200 hover:shadow-lg
                ${isSelected 
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/10' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'}
            `}
        >
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                    <img
                        src={photographer.avatarUrl || '/default-avatar.png'}
                        alt={photographer.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-600"
                        loading="lazy"
                    />
                    {photographer.progress >= 100 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Award className="w-3.5 h-3.5 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{photographer.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{photographer.specialty || 'Photographer'}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`
                            px-2 py-0.5 rounded-full text-xs font-medium
                            ${photographer.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' : 
                              photographer.role === 'Team Leader' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}
                        `}>
                            {photographer.role}
                        </span>
                        {photographer.payrollType && (
                            <span className="text-xs text-slate-400">
                                {photographer.payrollType}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{photographer.orderCount}</p>
                    <p className="text-xs text-slate-500">Orders</p>
                </div>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{photographer.photoCount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Photos</p>
                </div>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-lg font-bold text-cyan-600">{formatCurrency(photographer.totalSales)}</p>
                    <p className="text-xs text-slate-500">Sales</p>
                </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" /> Monthly Target
                    </span>
                    <span className="font-medium">{photographer.progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${progressColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(photographer.progress, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>{formatCurrency(photographer.totalSales)}</span>
                    <span>{formatCurrency(photographer.monthlyTarget || 0)}</span>
                </div>
            </div>

            {/* Commission Info */}
            {photographer.totalSales > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">
                            {photographer.payrollType === 'Salary' ? 'Fixed Salary' : `Commission (${((photographer.commissionRate || 0) * 100).toFixed(0)}%)`}
                        </span>
                        <span className="font-bold text-emerald-600">{formatCurrency(photographer.earned)}</span>
                    </div>
                </div>
            )}
        </div>
    );
});

// Detailed photographer modal
const PhotographerDetailModal: React.FC<{
    photographer: Photographer & { totalSales: number; orderCount: number; photoCount: number; earned: number; progress: number } | null;
    onClose: () => void;
    orders: Order[];
    currentUser: Photographer;
    onRefresh: () => void;
}> = ({ photographer, onClose, orders, currentUser, onRefresh }) => {
    const { formatCurrency } = useCurrency();
    const { can } = usePermissions(currentUser);

    const photographerOrders = useMemo(() => 
        photographer ? orders.filter(o => o.photographerId === photographer.id).slice(0, 10) : [],
    [orders, photographer]);
    
    if (!photographer) return null;
    
    const canManageFace = can('viewSettings') && (currentUser.role === 'Admin' || currentUser.role === 'Team Leader');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img 
                            src={photographer.avatarUrl || '/default-avatar.png'} 
                            alt={photographer.name}
                            className="w-16 h-16 rounded-2xl object-cover"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{photographer.name}</h2>
                            <p className="text-slate-500">{photographer.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        aria-label="Close details"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Orders', value: photographer.orderCount },
                            { label: 'Photos', value: photographer.photoCount.toLocaleString() },
                            { label: 'Total Sales', value: formatCurrency(photographer.totalSales) },
                            { label: 'Earned', value: formatCurrency(photographer.earned) },
                        ].map(stat => (
                            <div key={stat.label} className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                                <p className="text-xs text-slate-500">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Face Enrollment (Admin/TL Only) */}
                    {canManageFace && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-5 h-5 text-cyan-500" />
                                <h3 className="font-bold text-slate-900 dark:text-white">Security & Identity</h3>
                            </div>
                            <FaceEnrollmentSection
                                userId={String(photographer.id)}
                                userName={photographer.name}
                                hasFaceRegistered={!!photographer.faceDescriptor}
                                onEnrollmentComplete={onRefresh}
                            />
                        </div>
                    )}
                    
                    {/* Recent Orders */}
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-3">Recent Orders</h3>
                        <div className="space-y-2">
                            {photographerOrders.map(order => (
                                <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <div>
                                        <p className="font-medium text-sm">{order.clientName}</p>
                                        <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className="font-bold text-cyan-600">{formatCurrency(order.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Photographers: React.FC<PhotographersProps> = ({ currentUser, photographers, orders, refreshData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('All');
    const [selectedPhotographer, setSelectedPhotographer] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const { can: _can } = usePermissions(currentUser);
    const { formatCurrency } = useCurrency();

    // Calculate enriched photographer data - memoized
    const enrichedPhotographers = useMemo(() => {
        return photographers.map(p => {
            const photographerOrders = orders.filter(o => o.photographerId === p.id && o.status === 'Completed');
            const totalSales = photographerOrders.reduce((sum, o) => sum + o.total, 0);
            const orderCount = photographerOrders.length;
            const photoCount = Math.floor(totalSales / 50); // Estimated
            const earned = p.payrollType === 'Salary' 
                ? (p.monthlySalary || 0)
                : totalSales * (p.commissionRate || 0);
            const target = p.monthlyTarget || 1;
            const progress = (totalSales / target) * 100;
            
            return { ...p, totalSales, orderCount, photoCount, earned, progress };
        }).sort((a, b) => b.totalSales - a.totalSales);
    }, [photographers, orders]);

    // Filter photographers - memoized
    const filteredPhotographers = useMemo(() => {
        return enrichedPhotographers.filter(p => {
            const matchesSearch = !debouncedSearch || 
                p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                p.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                p.specialty?.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesRole = roleFilter === 'All' || p.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [enrichedPhotographers, debouncedSearch, roleFilter]);

    // Calculate totals - memoized
    const totals = useMemo(() => ({
        totalSales: enrichedPhotographers.reduce((sum, p) => sum + p.totalSales, 0),
        totalOrders: enrichedPhotographers.reduce((sum, p) => sum + p.orderCount, 0),
        totalPhotos: enrichedPhotographers.reduce((sum, p) => sum + p.photoCount, 0),
        topPerformer: enrichedPhotographers[0]
    }), [enrichedPhotographers]);

    // Handlers - memoized
    const handlePhotographerClick = useCallback((id: string) => {
        setSelectedPhotographer(id);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedPhotographer(null);
    }, []);

    const selectedPhotographerData = useMemo(() => 
        enrichedPhotographers.find(p => p.id === selectedPhotographer) || null,
    [enrichedPhotographers, selectedPhotographer]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-cyan-500" />
                        Photographers
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {filteredPhotographers.length} of {photographers.length} photographers
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={refreshData}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Refresh data"
                        title="Refresh data"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Sales" 
                    value={formatCurrency(totals.totalSales)} 
                    icon={DollarSign} 
                    color="green"
                    trend="This month"
                />
                <StatCard 
                    title="Total Orders" 
                    value={totals.totalOrders} 
                    icon={Camera} 
                    color="blue"
                />
                <StatCard 
                    title="Photos Taken" 
                    value={totals.totalPhotos.toLocaleString()} 
                    icon={ImageIcon} 
                    color="purple"
                />
                <StatCard 
                    title="Top Performer" 
                    value={totals.topPerformer?.name || '-'} 
                    icon={Star} 
                    color="amber"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search photographers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="All">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="Team Leader">Team Leader</option>
                        <option value="Photographer">Photographer</option>
                    </select>
                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                        >
                            List
                        </button>
                    </div>
                </div>
            </div>

            {/* Photographers Grid */}
            {filteredPhotographers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No photographers found</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredPhotographers.map(photographer => (
                        <PhotographerCard
                            key={photographer.id}
                            photographer={photographer}
                            onClick={() => handlePhotographerClick(photographer.id)}
                            isSelected={selectedPhotographer === photographer.id}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Photographer</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Role</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500">Orders</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500">Sales</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500">Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPhotographers.map(p => (
                                <tr 
                                    key={p.id} 
                                    onClick={() => handlePhotographerClick(p.id)}
                                    className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={p.avatarUrl || '/default-avatar.png'} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.specialty}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                            {p.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">{p.orderCount}</td>
                                    <td className="px-6 py-4 text-right font-mono text-cyan-600">{formatCurrency(p.totalSales)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${p.progress >= 100 ? 'bg-emerald-500' : p.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${Math.min(p.progress, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 w-10 text-right">{p.progress.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal */}
            {selectedPhotographer && (
                <PhotographerDetailModal
                    photographer={selectedPhotographerData}
                    onClose={handleCloseModal}
                    orders={orders}
                    currentUser={currentUser}
                    onRefresh={refreshData}
                />
            )}
        </div>
    );
};

Photographers.displayName = 'Photographers';
export default React.memo(Photographers);
