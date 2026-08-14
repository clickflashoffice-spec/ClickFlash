import { Spinner, Card } from "@clickflash/ui";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce.ts';
import { Order, Photographer } from '../types';
import { apiService } from '../services/apiService';

import { TableRowSkeleton, StatCardSkeleton } from './common/AppSkeletons';

import { useCurrency } from './CurrencyContext';
import ClientDetailsModal from './modals/ClientDetailsModal';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from './common/PageHeader';
import { logger } from '../utils/logger.ts';

interface Client {
    email: string;
    name: string;
    orders: Order[];
    totalSpent: number;
    lastVisit: string;
    firstVisit: string;
}

interface ClientsProps {
    currentUser?: Photographer;
    refreshTrigger?: number;
}

type SortOption = 'name' | 'totalSpent' | 'lastVisit' | 'orderCount' | 'firstVisit';
type ClientStatus = 'all' | 'vip' | 'returning' | 'new';

/**
 * Clients Component
 * 
 * Displays client information aggregated from orders.
 * 
 * Features:
 * - Client aggregation from order data
 * - Search and filtering by status (VIP, Returning, New)
 * - Sorting by name, total spent, last visit, order count, first visit
 * - CSV export functionality
 * - Permission-based filtering
 * - Client details modal with full history
 * - Responsive design with dark mode support
 */
const Clients: React.FC<ClientsProps> = ({ currentUser, refreshTrigger }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [sortBy, setSortBy] = useState<SortOption>('lastVisit');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [statusFilter, setStatusFilter] = useState<ClientStatus>('all');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const { formatCurrency } = useCurrency();
    const { can } = usePermissions(currentUser || null);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiService.getOrders();
                setOrders(response.data);
                logger.info('Clients data loaded', { count: response.data.length });
            } catch (error) {
                logger.error('Failed to load orders for clients view', error instanceof Error ? error : undefined);
                setError('Failed to load client data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [refreshTrigger]);

    const clients = useMemo(() => {
        let visibleOrders = orders;
        if (currentUser && !can('viewAllOrders')) {
            visibleOrders = orders.filter(o => o.photographerId === currentUser.id);
        }

        const clientsMap = new Map<string, Client>();

        visibleOrders.forEach(order => {
            if (!order.email) return;
            const email = order.email.toLowerCase();

            if (!clientsMap.has(email)) {
                clientsMap.set(email, {
                    email: order.email,
                    name: order.clientName,
                    orders: [],
                    totalSpent: 0,
                    lastVisit: '',
                    firstVisit: order.date
                });
            }

            const client = clientsMap.get(email)!;
            client.orders.push(order);
            
            if (order.status === 'Completed' || order.status === 'Delivered') {
                client.totalSpent += order.total;
            }

            // Update first visit if earlier
            if (new Date(order.date) < new Date(client.firstVisit)) {
                client.firstVisit = order.date;
            }

            // Update last visit if later
            if (!client.lastVisit || new Date(order.date) > new Date(client.lastVisit)) {
                client.lastVisit = order.date;
                client.name = order.clientName;
            }
        });

        return Array.from(clientsMap.values());
    }, [orders, currentUser, can]);

    const filteredAndSortedClients = useMemo(() => {
        const result = clients.filter(c => {
            // Status filter
            if (statusFilter !== 'all') {
                const orderCount = c.orders.length;
                if (statusFilter === 'vip' && orderCount < 5) return false;
                if (statusFilter === 'returning' && orderCount <= 1) return false;
                if (statusFilter === 'new' && orderCount > 1) return false;
            }

            // Search filter
            const searchLower = debouncedSearchTerm.toLowerCase();
            return (
                c.name.toLowerCase().includes(searchLower) ||
                c.email.toLowerCase().includes(searchLower)
            );
        });

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'totalSpent':
                    comparison = a.totalSpent - b.totalSpent;
                    break;
                case 'lastVisit':
                    comparison = new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();
                    break;
                case 'firstVisit':
                    comparison = new Date(a.firstVisit).getTime() - new Date(b.firstVisit).getTime();
                    break;
                case 'orderCount':
                    comparison = a.orders.length - b.orders.length;
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [clients, debouncedSearchTerm, statusFilter, sortBy, sortDirection]);

    const kpiData = useMemo(() => {
        const totalClients = clients.length;
        const returningClients = clients.filter(c => c.orders.length > 1).length;
        const totalRevenue = clients.reduce((sum, c) => sum + c.totalSpent, 0);
        const avgValue = totalClients > 0 ? totalRevenue / totalClients : 0;
        const vipClients = clients.filter(c => c.orders.length >= 5).length;
        const newClients = clients.filter(c => c.orders.length === 1).length;

        return { totalClients, returningClients, avgValue, vipClients, newClients, totalRevenue };
    }, [clients]);

    const handleSort = useCallback((column: SortOption) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('desc');
        }
    }, [sortBy, sortDirection]);

    const handleExportCSV = useCallback(async () => {
        setIsExporting(true);
        try {
            const headers = ['Name', 'Email', 'Status', 'Orders', 'Total Spent', 'First Visit', 'Last Visit'];
            const rows = filteredAndSortedClients.map(c => [
                c.name,
                c.email,
                c.orders.length >= 5 ? 'VIP' : c.orders.length > 1 ? 'Returning' : 'New',
                c.orders.length,
                c.totalSpent.toFixed(2),
                new Date(c.firstVisit).toLocaleDateString(),
                new Date(c.lastVisit).toLocaleDateString()
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            logger.info('Clients exported to CSV', { count: filteredAndSortedClients.length });
        } catch (error) {
            logger.error('Failed to export clients', error instanceof Error ? error : undefined);
            alert('Failed to export clients. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }, [filteredAndSortedClients]);

    const getClientStatus = (orderCount: number): { label: string; className: string } => {
        if (orderCount >= 5) {
            return {
                label: 'VIP',
                className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
            };
        }
        if (orderCount > 1) {
            return {
                label: 'Returning',
                className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            };
        }
        return {
            label: 'New',
            className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600'
        };
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-4 text-slate-300">Client Details</th>
                                <th className="px-6 py-4 text-slate-300">Contact</th>
                                <th className="px-6 py-4 text-slate-300">Status</th>
                                <th className="px-6 py-4 text-right text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[...Array(5)].map((_, i) => (
                                <TableRowSkeleton key={i} columns={4} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-4">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error Loading Clients</h3>
                <p className="text-red-500 dark:text-red-400 mb-4 text-center max-w-md">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-8">
            <PageHeader
                title="Client Relationship Management"
                subtitle="View client history, track spending, and manage relationships"
                actions={
                    <button
                        onClick={handleExportCSV}
                        disabled={isExporting || filteredAndSortedClients.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        {isExporting ? (
                            <Spinner size="small" className="border-white" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                        {isExporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                }
            />

            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Total Clients</p>
                        <p className="text-2xl font-bold">{kpiData.totalClients}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-green-500/10 text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Returning</p>
                        <p className="text-2xl font-bold">{kpiData.returningClients}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">VIP Clients</p>
                        <p className="text-2xl font-bold">{kpiData.vipClients}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">New</p>
                        <p className="text-2xl font-bold">{kpiData.newClients}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Avg. Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(kpiData.avgValue)}</p>
                    </div>
                </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap gap-2">
                    {(['all', 'vip', 'returning', 'new'] as ClientStatus[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                                statusFilter === status
                                    ? 'bg-blue-600/80 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/50'
                                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            {status !== 'all' && (
                                <span className="ml-2 text-xs opacity-75">
                                    ({status === 'vip' ? kpiData.vipClients : status === 'returning' ? kpiData.returningClients : kpiData.newClients})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="relative w-full lg:w-auto min-w-[300px]">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search clients by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all backdrop-blur-md shadow-inner"
                    />
                </div>
            </div>

            {/* Results Count */}
            {debouncedSearchTerm && (
                <div className="text-sm text-slate-500">
                    Found <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredAndSortedClients.length}</span> of {clients.length} clients
                </div>
            )}

            {/* Clients Table */}
            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                {[
                                    { key: 'name', label: 'Client' },
                                    { key: 'orderCount', label: 'Orders', align: 'center' },
                                    { key: 'totalSpent', label: 'Total Spent', align: 'right' },
                                    { key: 'firstVisit', label: 'First Visit' },
                                    { key: 'lastVisit', label: 'Last Visit' },
                                ].map((col) => (
                                    <th
                                        key={col.key}
                                        className={`p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                                        }`}
                                    >
                                        <button
                                            onClick={() => handleSort(col.key as SortOption)}
                                            className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                                        >
                                            {col.label}
                                            {sortBy === col.key && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            )}
                                        </button>
                                    </th>
                                ))}
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredAndSortedClients.map((client) => {
                                const status = getClientStatus(client.orders.length);
                                return (
                                    <tr
                                        key={client.email}
                                        className="hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => setSelectedClient(client)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{client.name}</p>
                                                    <p className="text-sm text-slate-500">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-mono">{client.orders.length}</td>
                                        <td className="p-4 text-right font-mono font-semibold text-green-600 dark:text-green-400">
                                            {formatCurrency(client.totalSpent)}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">{new Date(client.firstVisit).toLocaleDateString()}</td>
                                        <td className="p-4 text-sm text-slate-500">{new Date(client.lastVisit).toLocaleDateString()}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setSelectedClient(client)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredAndSortedClients.length === 0 && (
                    <div className="text-center py-16">
                        <div className="bg-white/5 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            {debouncedSearchTerm ? 'No Clients Found' : 'No Clients Yet'}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            {debouncedSearchTerm
                                ? `No clients match "${debouncedSearchTerm}". Try adjusting your search.`
                                : 'Clients will appear here once orders are created with email addresses.'}
                        </p>
                    </div>
                )}
            </Card>

            {selectedClient && (
                <ClientDetailsModal
                    isOpen={!!selectedClient}
                    onClose={() => setSelectedClient(null)}
                    client={selectedClient}
                />
            )}
        </div>
    );
};

export default Clients;
