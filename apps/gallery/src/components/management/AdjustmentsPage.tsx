import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { Adjustment, Photographer } from '../../types.ts';
import AddAdjustmentModal from './modals/AddAdjustmentModal';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';

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


const AdjustmentsPage: React.FC = () => {
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
    const { formatCurrency } = useCurrency();

    const fetchData = async () => {
        try {
            const [adjustmentData, photographerData] = await Promise.all([
                apiService.getAdjustments(),
                apiService.getUsers()
            ]);
            setAdjustments(adjustmentData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setPhotographers(photographerData);
        } catch (error) {
            console.error("Failed to load adjustment data", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);
    
    const kpiData = useMemo(() => {
        const totalUnpaid = adjustments
            .filter(b => b.status === 'Unpaid')
            .reduce((sum, b) => sum + (b.type === 'Bonus' ? b.amount : -b.amount), 0);

        const currentYear = new Date().getFullYear();
        const totalPaidThisYear = adjustments
            .filter(b => b.status === 'Paid' && new Date(b.date).getFullYear() === currentYear)
            .reduce((sum, b) => sum + (b.type === 'Bonus' ? b.amount : -b.amount), 0);
        
        return { totalUnpaid, totalPaidThisYear };
    }, [adjustments]);

    const handleSaveAdjustment = async (newAdjustment: Omit<Adjustment, 'id'>) => {
        await apiService.createAdjustment(newAdjustment);
        setIsModalOpen(false);
        fetchData();
    };
    
    const filteredAdjustments = adjustments.filter(b => filter === 'All' || b.status === filter);

    if (loading) return <Spinner />;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Payroll Adjustments</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Total Unpaid Adjustments" 
                    value={formatCurrency(kpiData.totalUnpaid)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>}
                />
                 <StatCard 
                    title={`Net Adjustments (${new Date().getFullYear()})`} 
                    value={formatCurrency(kpiData.totalPaidThisYear)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                />
            </div>

            <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {(['All', 'Unpaid', 'Paid'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md font-semibold text-sm ${filter === f ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>{f}</button>
                    ))}
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
                >
                    <span>Add Adjustment</span>
                </button>
            </div>

            <Card className="!p-0">
                {filteredAdjustments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[720px]">
                            <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Photographer</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAdjustments.map((adj) => {
                                    const photographer = photographers.find(p => p.id === adj.photographerId);
                                    const isBonus = adj.type === 'Bonus';
                                    return (
                                    <tr key={adj.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4">{new Date(adj.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-semibold">{photographer?.name || 'N/A'}</td>
                                        <td className="p-4">{adj.description}</td>
                                        <td className="p-4">
                                            <span className={`font-semibold ${isBonus ? 'text-green-500' : 'text-red-500'}`}>{adj.type}</span>
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold ${isBonus ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                            {isBonus ? '+' : '-'}{formatCurrency(adj.amount)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${adj.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{adj.status}</span>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No Adjustments Found</h3>
                        <p className="mt-1 text-sm">There are no adjustments matching your current filter.</p>
                        {filter !== 'All' && <button onClick={() => setFilter('All')} className="mt-4 text-sm font-semibold text-blue-500 hover:underline">Clear Filter</button>}
                    </div>
                )}
            </Card>

            <AddAdjustmentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAdjustment}
                photographers={photographers}
            />
        </div>
    );
};

export default AdjustmentsPage;