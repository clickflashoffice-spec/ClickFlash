import React, { useState, useMemo, useEffect } from 'react';
import Card from '../common/Card.tsx';
import Spinner from '../common/Spinner.tsx';
import { apiService } from '../../services/apiService.ts';
import { Order, Expense, Photographer, Destination } from '../../types.ts';
import SalesLineChart from './reports/SalesLineChart';
import ExpensePieChart from './reports/ExpensePieChart';
import ReportDisplay from './reports/ReportDisplay';

type ReportType = 'Sales Summary' | 'Expense Breakdown' | 'Profit & Loss';

const ReportsPage: React.FC = () => {
    const [reportType, setReportType] = useState<ReportType>('Sales Summary');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ orders: Order[], expenses: Expense[], photographers: Photographer[], destinations: Destination[] } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [orders, expenses, photographers, destinations] = await Promise.all([
                    apiService.getOrders(),
                    apiService.getExpenses(),
                    apiService.getUsers(),
                    apiService.getDestinations()
                ]);
                setData({ orders, expenses, photographers, destinations });
            } catch (error) {
                console.error("Failed to load report data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        if (!data) return null;

        const filteredOrders = data.orders.filter(o => {
            if (startDate && o.date < startDate) return false;
            if (endDate && o.date > endDate) return false;
            return o.status === 'Completed';
        });

        const filteredExpenses = data.expenses.filter(e => {
            if (startDate && e.date < startDate) return false;
            if (endDate && e.date > endDate) return false;
            return true;
        });

        return { ...data, orders: filteredOrders, expenses: filteredExpenses };
    }, [data, startDate, endDate]);
    
    const handleExportCSV = (dataType: 'orders' | 'expenses') => {
        if (!filteredData) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        let filename = "";

        if (dataType === 'orders') {
            filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
            csvContent += "ID,Date,Client,Email,Total,Status,Photographer\n";
            filteredData.orders.forEach(o => {
                const row = `${o.id},${o.date},"${o.clientName}","${o.email}",${o.total},${o.status},${o.photographerId}`;
                csvContent += row + "\n";
            });
        } else {
            filename = `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;
            csvContent += "Date,Description,Category,Cost,Destination\n";
            filteredData.expenses.forEach(e => {
                const row = `${e.date},"${e.description}",${e.category},${e.cost},${e.destinationId}`;
                csvContent += row + "\n";
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderReport = () => {
        if (loading || !filteredData) return <Spinner />;

        switch (reportType) {
            case 'Sales Summary':
                return <SalesLineChart orders={filteredData.orders} />;
            case 'Expense Breakdown':
                return <ExpensePieChart expenses={filteredData.expenses} />;
            case 'Profit & Loss':
                return <ReportDisplay orders={filteredData.orders} expenses={filteredData.expenses} />;
            default:
                return <p>Select a report type to get started.</p>;
        }
    };
    
    const reportOptions: ReportType[] = ['Sales Summary', 'Expense Breakdown', 'Profit & Loss'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reports & Analytics</h1>
                <div className="space-x-3">
                     <button onClick={() => handleExportCSV('orders')} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm">
                        Export Sales CSV
                    </button>
                     <button onClick={() => handleExportCSV('expenses')} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm">
                        Export Expenses CSV
                    </button>
                </div>
            </div>
            
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2">
                            {reportOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2" />
                    </div>
                </div>
            </Card>
            
            <Card>
                {renderReport()}
            </Card>
        </div>
    );
};

export default ReportsPage;