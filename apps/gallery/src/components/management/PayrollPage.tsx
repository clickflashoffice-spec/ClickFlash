import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { Photographer, Order, Adjustment } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import PayrollDetailsModal from './modals/PayrollDetailsModal';
import { usePermissions } from '../../hooks/usePermissions.ts';
import AddAdjustmentModal from './modals/AddAdjustmentModal';

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
    </Card>
);

// Define a more specific type for the enriched payroll data
type PayrollRowData = Photographer & {
    totalSales: number;
    basePay: number;
    commissionPay: number;
    adjustmentsTotal: number;
    adjustmentsForPeriod: Adjustment[];
    totalPay: number;
    isPaid: boolean;
};

interface PayrollPageProps {
    currentUser: Photographer;
}

const PayrollPage: React.FC<PayrollPageProps> = ({ currentUser }) => {
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatCurrency } = useCurrency();
    const [payrollPeriod, setPayrollPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
    const [paymentStatus, setPaymentStatus] = useState<Record<string, boolean>>({}); // key: photographerId-period
    const [detailsModalData, setDetailsModalData] = useState<PayrollRowData | null>(null);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [photographerForAdjustment, setPhotographerForAdjustment] = useState<Photographer | null>(null);
    const { can } = usePermissions(currentUser);


    const fetchData = async () => {
        setLoading(true);
        try {
            const [users, ordersData, adjustmentsData] = await Promise.all([
                apiService.getUsers(),
                apiService.getOrders(),
                apiService.getAdjustments(),
            ]);
            setPhotographers(users);
            setOrders(ordersData);
            setAdjustments(adjustmentsData);
        } catch (err) {
            console.error("Failed to load payroll data", err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const payrollData: PayrollRowData[] = useMemo(() => {
        const filteredOrders = orders.filter(o => o.date.startsWith(payrollPeriod) && o.status === 'Completed');
        
        return photographers.map(p => {
            const adjustmentsForPeriod = adjustments.filter(adj =>
                String(adj.photographerId) === p.id && adj.date.startsWith(payrollPeriod)
            );

            const unpaidAdjustments = adjustmentsForPeriod.filter(adj => adj.status === 'Unpaid');
            
            const totalSales = filteredOrders
                .filter(o => String(o.photographerId) === p.id)
                .reduce((sum, o) => sum + o.total, 0);

            const adjustmentsTotal = unpaidAdjustments.reduce((sum, adj) => {
                return sum + (adj.type === 'Bonus' ? adj.amount : -adj.amount);
            }, 0);

            let basePay = 0;
            let commissionPay = 0;

            if (p.payrollType === 'Salary') {
                basePay = p.monthlySalary || 0;
            } else {
                commissionPay = totalSales * (p.commissionRate || 0);
            }

            const totalPay = basePay + commissionPay + adjustmentsTotal;
            const isPaid = paymentStatus[`${p.id}-${payrollPeriod}`] || false;

            return {
                ...p,
                totalSales,
                basePay,
                commissionPay,
                adjustmentsTotal,
                adjustmentsForPeriod,
                totalPay,
                isPaid,
            };
        });
    }, [photographers, orders, adjustments, payrollPeriod, paymentStatus]);

    const kpiData = useMemo(() => {
        const unpaidPayroll = payrollData.filter(p => !p.isPaid);
        return {
            totalPayrollDue: unpaidPayroll.reduce((sum, p) => sum + p.totalPay, 0),
            totalSalaries: unpaidPayroll.reduce((sum, p) => sum + p.basePay, 0),
            totalCommission: unpaidPayroll.reduce((sum, p) => sum + p.commissionPay, 0),
            totalAdjustments: unpaidPayroll.reduce((sum, p) => sum + p.adjustmentsTotal, 0),
        };
    }, [payrollData]);

    const handleTogglePaymentStatus = (photographerId: string, isCurrentlyPaid: boolean) => {
        const confirmationMessage = isCurrentlyPaid
            ? "Are you sure you want to revert this payment and mark as UNPAID?"
            : "Are you sure you want to mark this photographer as PAID for this period?";

        if (window.confirm(confirmationMessage)) {
            const newStatus = !isCurrentlyPaid;
            const key = `${photographerId}-${payrollPeriod}`;
            setPaymentStatus(prev => ({ ...prev, [key]: newStatus }));

            setAdjustments(prevAdjustments =>
                prevAdjustments.map(adj => {
                    if (String(adj.photographerId) === photographerId && adj.date.startsWith(payrollPeriod)) {
                        return { ...adj, status: newStatus ? 'Paid' : 'Unpaid' };
                    }
                    return adj;
                })
            );
        }
    };
    
    const handlePayAll = () => {
        const unpaidCount = payrollData.filter(p => !p.isPaid).length;
        if (unpaidCount === 0) {
            alert("All photographers have already been paid for this period.");
            return;
        }

         if (window.confirm(`Are you sure you want to mark all ${unpaidCount} pending photographers as paid for this period?`)) {
            const newStatuses: Record<string, boolean> = {};
            const adjustmentIdsToUpdate = new Set<string>();

            payrollData.forEach(p => {
                if (!p.isPaid) {
                    newStatuses[`${p.id}-${payrollPeriod}`] = true;
                    const adjustmentsToPay = adjustments.filter(adj => String(adj.photographerId) === p.id && adj.date.startsWith(payrollPeriod));
                    adjustmentsToPay.forEach(adj => adjustmentIdsToUpdate.add(adj.id));
                }
            });
            setPaymentStatus(prev => ({...prev, ...newStatuses}));
            setAdjustments(prevAdjustments => prevAdjustments.map(adj => adjustmentIdsToUpdate.has(adj.id) ? { ...adj, status: 'Paid' } : adj));
        }
    };

    const handleAddAdjustment = (photographer: Photographer) => {
        setPhotographerForAdjustment(photographer);
        setIsAdjustmentModalOpen(true);
    };

    const handleSaveAdjustment = async (newAdjustment: Omit<Adjustment, 'id'>) => {
        await apiService.createAdjustment(newAdjustment);
        fetchData(); // Refetch all data to update payroll
        setIsAdjustmentModalOpen(false);
    };


    if (loading) return <Spinner />;
    
    const unpaidPhotographersCount = payrollData.filter(p => !p.isPaid).length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold">Payroll</h1>
                <div className="flex items-center gap-4">
                    <input 
                        type="month"
                        value={payrollPeriod}
                        onChange={e => setPayrollPeriod(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                    />
                    <button onClick={handlePayAll} disabled={unpaidPhotographersCount === 0 || !can('runPayroll')} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-500">
                        {`Pay All (${unpaidPhotographersCount})`}
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Payroll Due" value={formatCurrency(kpiData.totalPayrollDue)} />
                <StatCard title="Total Salaries Due" value={formatCurrency(kpiData.totalSalaries)} />
                <StatCard title="Total Commission Due" value={formatCurrency(kpiData.totalCommission)} />
                <StatCard title="Total Adjustments Due" value={formatCurrency(kpiData.totalAdjustments)} />
            </div>

            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-4">Photographer</th>
                                <th className="p-4">Type</th>
                                <th className="p-4 text-right">Base/Commission</th>
                                <th className="p-4 text-right">Adjustments</th>
                                <th className="p-4 text-right">Total Pay</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollData.map(p => (
                                <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                    <td className="p-4 font-semibold flex items-center space-x-3">
                                         <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full" />
                                        <span>{p.name}</span>
                                    </td>
                                    <td className="p-4 text-slate-500 dark:text-slate-400">{p.payrollType}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(p.basePay + p.commissionPay)}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(p.adjustmentsTotal)}</td>
                                    <td className="p-4 text-right font-mono font-bold text-blue-500 dark:text-blue-400">{formatCurrency(p.totalPay)}</td>
                                    <td className="p-4 text-center">
                                         <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {p.isPaid ? 'Paid' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center space-x-2">
                                        <button onClick={() => setDetailsModalData(p)} className="text-blue-400 hover:text-blue-300 font-semibold text-sm">View</button>
                                        {can('manageAdjustments') && <button onClick={() => handleAddAdjustment(p)} className="text-green-400 hover:text-green-300 font-semibold text-sm">Adjustment</button>}
                                        <button 
                                            onClick={() => handleTogglePaymentStatus(p.id, p.isPaid)} 
                                            disabled={!can('runPayroll')}
                                            className={`font-semibold py-1 px-3 rounded-md text-sm transition-colors
                                                ${p.isPaid 
                                                    ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' 
                                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`
                                            }
                                        >
                                            {p.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            {detailsModalData && (
                <PayrollDetailsModal
                    isOpen={!!detailsModalData}
                    onClose={() => setDetailsModalData(null)}
                    payrollData={detailsModalData}
                    payrollPeriod={payrollPeriod}
                />
            )}
            {isAdjustmentModalOpen && photographerForAdjustment && (
                <AddAdjustmentModal
                    isOpen={isAdjustmentModalOpen}
                    onClose={() => setIsAdjustmentModalOpen(false)}
                    onSave={handleSaveAdjustment}
                    photographers={photographers}
                    preselectedPhotographerId={Number(photographerForAdjustment.id)}
                />
            )}
        </div>
    );
};

export default PayrollPage;