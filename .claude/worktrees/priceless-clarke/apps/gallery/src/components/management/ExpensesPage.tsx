import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { Expense, Destination, Photographer, ExpenseCategory } from '../../types.ts';
import AddExpenseModal from './modals/AddExpenseModal';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import ExpensePieChart from './reports/ExpensePieChart';

const StatCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
    <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
    </Card>
);

const ExpensesPage: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { formatCurrency } = useCurrency();

    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDestination, setSelectedDestination] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedPhotographer, setSelectedPhotographer] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [expData, destData, photographerData, catData] = await Promise.all([
                    apiService.getExpenses(), 
                    apiService.getDestinations(),
                    apiService.getUsers(),
                    apiService.getExpenseCategories(),
                ]);
                setExpenses(expData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setDestinations(destData);
                setPhotographers(photographerData);
                setExpenseCategories(catData);
            } catch (error) {
                console.error("Failed to load expense data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            if (startDate && exp.date < startDate) return false;
            if (endDate && exp.date > endDate) return false;
            if (selectedDestination !== 'All' && exp.destinationId !== selectedDestination) return false;
            if (selectedCategory !== 'All' && exp.category !== selectedCategory) return false;
            if (selectedPhotographer !== 'All' && exp.photographerId !== Number(selectedPhotographer)) return false;
            return true;
        });
    }, [expenses, startDate, endDate, selectedDestination, selectedCategory, selectedPhotographer]);

    const kpiData = useMemo(() => {
        const total = filteredExpenses.reduce((sum, exp) => sum + exp.cost, 0);
        const count = filteredExpenses.length;
        const average = count > 0 ? total / count : 0;
        return { total, count, average };
    }, [filteredExpenses]);


    const handleSaveExpense = async (newExpense: Omit<Expense, 'id'>) => {
        const savedExpense = await apiService.createExpense(newExpense);
        setExpenses(prev => [savedExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsModalOpen(false);
    };
    
    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSelectedDestination('All');
        setSelectedCategory('All');
        setSelectedPhotographer('All');
    };

    if (loading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Expense Management</h1>
                 <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    <span>Add Expense</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Expenses" value={formatCurrency(kpiData.total)} />
                <StatCard title="Expense Count" value={kpiData.count.toLocaleString()} />
                <StatCard title="Average Expense" value={formatCurrency(kpiData.average)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <h3 className="text-lg font-bold mb-4">Filters</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">From</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">To</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Destination</label>
                             <select value={selectedDestination} onChange={e => setSelectedDestination(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2">
                                <option value="All">All Destinations</option>
                                {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                             </select>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Category</label>
                             <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2">
                                <option value="All">All Categories</option>
                                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Photographer</label>
                             <select value={selectedPhotographer} onChange={e => setSelectedPhotographer(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2">
                                <option value="All">All Photographers</option>
                                {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                        </div>
                        <button onClick={resetFilters} className="w-full mt-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 font-semibold py-2 px-3 rounded-md text-sm">Reset Filters</button>
                    </div>
                </Card>
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <h3 className="text-lg font-bold mb-4">Expenses by Category</h3>
                        <ExpensePieChart expenses={filteredExpenses} />
                    </Card>
                </div>
            </div>

            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                        <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Description</th>
                                <th className="p-4">Assigned To</th>
                                <th className="p-4">Destination</th>
                                <th className="p-4 text-right">Cost</th>
                                <th className="p-4 text-center">Invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map((exp) => {
                                const photographerName = photographers.find(p => exp.photographerId != null && p.id === String(exp.photographerId))?.name;
                                const destinationName = destinations.find(d => d.id === exp.destinationId)?.name || 'N/A';
                                return (
                                <tr key={exp.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4 font-mono whitespace-nowrap">{new Date(exp.date).toLocaleDateString()}</td>
                                    <td className="p-4 font-semibold">{exp.description}</td>
                                    <td className="p-4">{photographerName || <span className="text-slate-500 dark:text-slate-600">-</span>}</td>
                                    <td className="p-4 text-slate-500 dark:text-slate-400">{destinationName}</td>
                                    <td className="p-4 text-right font-mono font-bold text-red-500 dark:text-red-400">{formatCurrency(exp.cost)}</td>
                                    <td className="p-4 text-center">
                                        {exp.invoiceUrl ? (
                                            <a href={exp.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">View</a>
                                        ) : (
                                            <span className="text-slate-500 dark:text-slate-600">-</span>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AddExpenseModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveExpense}
            />
        </div>
    );
};

export default ExpensesPage;