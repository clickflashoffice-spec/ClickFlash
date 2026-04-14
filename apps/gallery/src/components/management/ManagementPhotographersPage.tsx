
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { Photographer, Destination, Order } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import { useCurrency } from '../CurrencyContext.tsx';

const ManagementPhotographersPage: React.FC = () => {
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDestination, setSelectedDestination] = useState('All');
    const { formatCurrency } = useCurrency();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [usersData, destData, ordersData] = await Promise.all([
                    apiService.getUsers(),
                    apiService.getDestinations(),
                    apiService.getOrders()
                ]);
                setPhotographers(usersData);
                setDestinations(destData);
                setOrders(ordersData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredPhotographers = useMemo(() => {
        if (selectedDestination === 'All') return photographers;
        return photographers.filter(p => p.destinationId === selectedDestination);
    }, [photographers, selectedDestination]);

    const enrichedPhotographers = useMemo(() => {
        return filteredPhotographers.map(p => {
            const photographerOrders = orders.filter(o => String(o.photographerId) === p.id && o.status === 'Completed');
            const totalSales = photographerOrders.reduce((sum, o) => sum + o.total, 0);
            const destinationName = destinations.find(d => d.id === p.destinationId)?.name || 'Unassigned';
            return { ...p, totalSales, destinationName, orderCount: photographerOrders.length };
        }).sort((a, b) => b.totalSales - a.totalSales);
    }, [filteredPhotographers, orders, destinations]);

    if (loading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold">Global Photographer Directory</h1>
                <select 
                    value={selectedDestination} 
                    onChange={e => setSelectedDestination(e.target.value)} 
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2"
                >
                    <option value="All">All Destinations</option>
                    {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-4">Photographer</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Destination</th>
                                <th className="p-4">Monthly Target</th>
                                <th className="p-4 text-right">Total Sales</th>
                                <th className="p-4 text-center">Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedPhotographers.map(p => {
                                const target = p.monthlyTarget || 1;
                                const progress = Math.min((p.totalSales / target) * 100, 100);
                                return (
                                    <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 flex items-center space-x-3">
                                            <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full" />
                                            <div>
                                                <p className="font-semibold">{p.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{p.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.role === 'Team Leader' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {p.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{p.destinationName}</td>
                                        <td className="p-4 font-mono">{formatCurrency(p.monthlyTarget)}</td>
                                        <td className="p-4 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(p.totalSales)}</td>
                                        <td className="p-4 w-48">
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <p className="text-xs text-right mt-1 text-slate-500">{progress.toFixed(0)}% of target</p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ManagementPhotographersPage;
