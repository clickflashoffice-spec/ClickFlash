import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { Destination, Order, Expense } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import { useCurrency } from '../CurrencyContext.tsx';
import AddDestinationModal from './modals/AddDestinationModal';
import { useDebounce } from '../../hooks/useDebounce.ts';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </Card>
);


const DestinationsPage: React.FC = () => {
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'profit' | 'profitMargin'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const { formatCurrency } = useCurrency();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [destinationToEdit, setDestinationToEdit] = useState<Destination | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [destData, orderData, expenseData] = await Promise.all([
                apiService.getDestinations(),
                apiService.getOrders(),
                apiService.getExpenses(),
            ]);
            setDestinations(destData);
            setOrders(orderData);
            setExpenses(expenseData);
        } catch (error) {
            console.error("Failed to load destinations data", error);
            setError('Failed to load destinations. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const destinationPerformance = useMemo(() => {
        return destinations.map(dest => {
            const revenue = orders
                .filter(o => o.destinationId === dest.id && o.status === 'Completed')
                .reduce((sum, o) => sum + o.total, 0);
            const costs = expenses
                .filter(e => e.destinationId === dest.id)
                .reduce((sum, e) => sum + e.cost, 0);
            const profit = revenue - costs;
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
            return { ...dest, profit, revenue, costs, profitMargin };
        });
    }, [destinations, orders, expenses]);

    const filteredAndSorted = useMemo(() => {
        let filtered = destinationPerformance;
        
        if (debouncedSearchTerm) {
            const searchLower = debouncedSearchTerm.toLowerCase();
            filtered = filtered.filter(d => 
                d.name.toLowerCase().includes(searchLower) ||
                d.country?.toLowerCase().includes(searchLower) ||
                d.type?.toLowerCase().includes(searchLower) ||
                d.licenseKey?.toLowerCase().includes(searchLower)
            );
        }
        
        const sorted = [...filtered].sort((a, b) => {
            let aVal: string | number;
            let bVal: string | number;
            
            switch (sortBy) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'revenue':
                    aVal = a.revenue;
                    bVal = b.revenue;
                    break;
                case 'profit':
                    aVal = a.profit;
                    bVal = b.profit;
                    break;
                case 'profitMargin':
                    aVal = a.profitMargin;
                    bVal = b.profitMargin;
                    break;
                default:
                    return 0;
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                return sortOrder === 'asc' 
                    ? (aVal as number) - (bVal as number)
                    : (bVal as number) - (aVal as number);
            }
        });
        
        return sorted;
    }, [destinationPerformance, debouncedSearchTerm, sortBy, sortOrder]);

    const totalRevenue = useMemo(() => destinationPerformance.reduce((sum, d) => sum + d.revenue, 0), [destinationPerformance]);
    const totalCosts = useMemo(() => destinationPerformance.reduce((sum, d) => sum + d.costs, 0), [destinationPerformance]);
    const totalProfit = totalRevenue - totalCosts;

    
    const openModal = (destination: Destination | null) => {
        setDestinationToEdit(destination);
        setIsModalOpen(true);
    };
    
    const handleSave = async (destination: Omit<Destination, 'id'> | Destination) => {
        if ('id' in destination) {
            await apiService.updateDestination(destination.id, destination);
        } else {
            await apiService.createDestination(destination);
        }
        setIsModalOpen(false);
        fetchData();
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            try {
                await apiService.deleteDestination(id);
                fetchData();
            } catch (error) {
                console.error("Failed to delete destination", error);
                alert('Failed to delete destination. Please try again.');
            }
        }
    };

    const handleCopyKey = async (key: string) => {
        try {
            await navigator.clipboard.writeText(key);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (error) {
            console.error("Failed to copy key", error);
        }
    };

    const handleSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    if (error && destinations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error Loading Destinations</h3>
                <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                <button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Destinations</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage locations, track performance, and monitor revenue across all destinations</p>
                </div>
                <button 
                    onClick={() => openModal(null)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Destination
                </button>
            </div>

            {error && destinations.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                 <StatCard 
                    title="Total Destinations" 
                    value={destinations.length.toString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                />
                 <StatCard 
                    title="Total Revenue" 
                    value={formatCurrency(totalRevenue)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134.635l-.417.417a1 1 0 001.414 1.414l.417-.417a2.5 2.5 0 00.635-1.134h1.698c-.07.221-.164.41-.267.567l-4.217 4.217a1 1 0 01-1.414 0l-4.217-4.217A1 1 0 013.933 6.002L8.15 1.785c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134.635l-.417.417a1 1 0 001.414 1.414l.417-.417a2.5 2.5 0 00.635-1.134h1.698c-.07.221-.164.41-.267.567L15.93 6.002a1 1 0 11-1.414 1.414l-4.217-4.217z" /></svg>}
                />
                 <StatCard 
                    title="Total Costs" 
                    value={formatCurrency(totalCosts)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>}
                />
                 <StatCard 
                    title="Total Profit" 
                    value={formatCurrency(totalProfit)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428a1 1 0 00.475 0l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                />
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative w-full md:max-w-md group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search destinations by name, country, type, or license key..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                {debouncedSearchTerm && (
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Found <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredAndSorted.length}</span> {filteredAndSorted.length === 1 ? 'destination' : 'destinations'}
                    </div>
                )}
            </div>
            
            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                            <tr>
                                <th className="p-4">
                                    <button 
                                        onClick={() => handleSort('name')}
                                        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        Name
                                        {sortBy === 'name' && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        )}
                                    </button>
                                </th>
                                <th className="p-4">Sync Key</th>
                                <th className="p-4 text-right">
                                    <button 
                                        onClick={() => handleSort('revenue')}
                                        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                                    >
                                        Revenue
                                        {sortBy === 'revenue' && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        )}
                                    </button>
                                </th>
                                <th className="p-4 text-right">Costs</th>
                                <th className="p-4 text-right">
                                    <button 
                                        onClick={() => handleSort('profit')}
                                        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                                    >
                                        Profit
                                        {sortBy === 'profit' && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        )}
                                    </button>
                                </th>
                                <th className="p-4 text-right">
                                    <button 
                                        onClick={() => handleSort('profitMargin')}
                                        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                                    >
                                        Margin
                                        {sortBy === 'profitMargin' && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        )}
                                    </button>
                                </th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSorted.length > 0 ? filteredAndSorted.map(d => (
                                <tr key={d.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{d.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{d.country || 'N/A'} • {d.type || 'N/A'}</div>
                                    </td>
                                    <td className="p-4">
                                        {d.licenseKey ? (
                                            <button 
                                                onClick={() => handleCopyKey(d.licenseKey!)}
                                                className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                                    copiedKey === d.licenseKey
                                                        ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300'
                                                }`}
                                                title={copiedKey === d.licenseKey ? "Copied!" : "Click to copy"}
                                            >
                                                {copiedKey === d.licenseKey ? '✓ Copied!' : d.licenseKey}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Not generated</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right font-mono text-green-600 dark:text-green-400 font-semibold">{formatCurrency(d.revenue || 0)}</td>
                                    <td className="p-4 text-right font-mono text-red-600 dark:text-red-400">{formatCurrency(d.costs || 0)}</td>
                                    <td className={`p-4 text-right font-bold font-mono ${ (d.profit || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                        {formatCurrency(d.profit || 0)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            d.profitMargin >= 30 
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                : d.profitMargin >= 15
                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                                : d.profitMargin > 0
                                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        }`}>
                                            {d.profitMargin.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-center space-x-2">
                                        <button 
                                            onClick={() => openModal(d)} 
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(d.id, d.name)} 
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 w-20 h-20 mb-4 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                                {debouncedSearchTerm ? "No Destinations Found" : "No Destinations Yet"}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                                                {debouncedSearchTerm 
                                                    ? `No destinations match "${debouncedSearchTerm}". Try adjusting your search.`
                                                    : "Get started by creating your first destination using the 'Add Destination' button above."}
                                            </p>
                                            {!debouncedSearchTerm && (
                                                <button
                                                    onClick={() => openModal(null)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Create First Destination
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            <AddDestinationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                destinationToEdit={destinationToEdit}
            />
        </div>
    );
};

export default DestinationsPage;