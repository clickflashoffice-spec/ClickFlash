
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
// FIX: Changed Bonus to Adjustment as Bonus type does not exist.
import { Adjustment, Photographer } from '../../types.ts';
import AddBonusModal from './modals/AddBonusModal';
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


const BonusesPage: React.FC = () => {
    // FIX: Use Adjustment type for state.
    const [bonuses, setBonuses] = useState<Adjustment[]>([]);
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
    const { formatCurrency } = useCurrency();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // FIX: Call getAdjustments instead of getBonuses and filter for 'Bonus' type.
                const [adjustmentData, photographerData] = await Promise.all([
                    apiService.getAdjustments(),
                    apiService.getUsers()
                ]);
                const bonusData = (adjustmentData as Adjustment[]).filter(adj => adj.type === 'Bonus');
                setBonuses(bonusData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setPhotographers(photographerData);
            } catch (error) {
                console.error("Failed to load bonus data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const kpiData = useMemo(() => {
        const totalUnpaid = bonuses
            .filter(b => b.status === 'Unpaid')
            .reduce((sum, b) => sum + b.amount, 0);

        const currentYear = new Date().getFullYear();
        const totalPaidThisYear = bonuses
            .filter(b => b.status === 'Paid' && new Date(b.date).getFullYear() === currentYear)
            .reduce((sum, b) => sum + b.amount, 0);

        const bonusesByPhotographer = new Map<string, number>();
        bonuses.forEach(bonus => {
            const key = String(bonus.photographerId);
            bonusesByPhotographer.set(key, (bonusesByPhotographer.get(key) || 0) + bonus.amount);
        });

        let topRecipient = { name: 'N/A', amount: 0 };
        if (bonusesByPhotographer.size > 0) {
            const [topId, topAmount] = [...bonusesByPhotographer.entries()].reduce((max, entry) => entry[1] > max[1] ? entry : max);
            const topPhotographer = photographers.find(p => p.id === topId);
            if (topPhotographer) {
                topRecipient = { name: topPhotographer.name, amount: topAmount };
            }
        }

        return { totalUnpaid, totalPaidThisYear, topRecipient };
    }, [bonuses, photographers]);

    // FIX: Use Adjustment type and call createAdjustment.
    const handleSaveBonus = async (newBonus: Omit<Adjustment, 'id'>) => {
        const savedBonus = await apiService.createAdjustment(newBonus);
        setBonuses(prev => [savedBonus, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsModalOpen(false);
    };
    
    const filteredBonuses = bonuses.filter(b => filter === 'All' || b.status === filter);

    if (loading) return <Spinner />;

    if (bonuses.length === 0 && !loading) {
        return (
            <div>
                 <h1 className="text-3xl font-bold mb-6">Photographer Bonuses</h1>
                <div className="text-center py-20 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No Bonuses Recorded Yet</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get started by adding the first bonus for a photographer.</p>
                    <button onClick={() => setIsModalOpen(true)} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                        Add First Bonus
                    </button>
                </div>
                 <AddBonusModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveBonus}
                    photographers={photographers}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Photographer Bonuses</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Unpaid Bonuses" 
                    value={formatCurrency(kpiData.totalUnpaid)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>}
                />
                 <StatCard 
                    title={`Paid Bonuses (${new Date().getFullYear()})`} 
                    value={formatCurrency(kpiData.totalPaidThisYear)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                />
                 <StatCard 
                    title="Top Bonus Recipient" 
                    value={kpiData.topRecipient.name}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
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
                    <span>Add Bonus</span>
                </button>
            </div>

            <Card className="!p-0">
                {filteredBonuses.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[640px]">
                            <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Photographer</th>
                                    <th className="p-4">Reason</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBonuses.map((bonus) => {
                                    const photographer = photographers.find(p => p.id === String(bonus.photographerId));
                                    return (
                                    <tr key={bonus.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4">{new Date(bonus.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-semibold">{photographer?.name || 'N/A'}</td>
                                        {/* FIX: Use description instead of reason. */}
                                        <td className="p-4">{bonus.description}</td>
                                        <td className="p-4 text-right font-mono font-bold text-green-500 dark:text-green-400">{formatCurrency(bonus.amount)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bonus.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{bonus.status}</span>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No Bonuses Found</h3>
                        <p className="mt-1 text-sm">There are no bonuses matching your current filter.</p>
                        {filter !== 'All' && <button onClick={() => setFilter('All')} className="mt-4 text-sm font-semibold text-blue-500 hover:underline">Clear Filter</button>}
                    </div>
                )}
            </Card>

            <AddBonusModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveBonus}
                photographers={photographers}
            />
        </div>
    );
};

export default BonusesPage;
