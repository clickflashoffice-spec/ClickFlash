import React, { useState, useEffect } from 'react';
import Card from '../common/Card.tsx';
import { Loan, Destination, LoanPayment } from '../../types.ts';
import AddLoanModal from './modals/AddLoanModal';
import AddLoanPaymentModal from './modals/AddLoanPaymentModal';
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

const CapitalPage: React.FC = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
    const [selectedLoanIdForPayment, setSelectedLoanIdForPayment] = useState<string | null>(null);

    const { formatCurrency } = useCurrency();

    const fetchData = async () => {
        try {
            const [loansData, destData] = await Promise.all([apiService.getLoans(), apiService.getDestinations()]);
            setLoans(loansData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setDestinations(destData);
        } catch (error) {
            console.error("Failed to load capital data", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveLoan = async (newLoan: Omit<Loan, 'id'>) => {
        await apiService.createLoan(newLoan);
        setIsLoanModalOpen(false);
        fetchData(); // Refetch all data
    };

    const handleSavePayment = async (newPayment: Omit<LoanPayment, 'id' | 'loanId'>) => {
        if (!selectedLoanIdForPayment) return;
        await (apiService as any).createLoanPayment(selectedLoanIdForPayment, newPayment);
        setIsPaymentModalOpen(false);
        setSelectedLoanIdForPayment(null);
        fetchData(); // Refetch all data
    };

    const toggleExpandLoan = (loanId: string) => {
        setExpandedLoanId(prev => (prev === loanId ? null : loanId));
    };

    const openPaymentModal = (loanId: string) => {
        setSelectedLoanIdForPayment(loanId);
        setIsPaymentModalOpen(true);
    };
    
    const activeLoans = loans.filter(loan => loan.status === 'Active');
    const totalCapital = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalDebt = activeLoans.reduce((sum, loan) => {
        const totalPaid = (loan.payments || []).reduce((paymentSum, p) => paymentSum + p.amount, 0);
        const remainingBalance = loan.amount - totalPaid;
        return sum + remainingBalance;
    }, 0);


    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Capital & Loans</h1>
                <button
                    onClick={() => setIsLoanModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    <span>Add Loan</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard 
                    title="Total Capital" 
                    value={formatCurrency(totalCapital)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134.635l-.417.417a1 1 0 001.414 1.414l.417-.417a2.5 2.5 0 00.635-1.134h1.698c-.07.221-.164.41-.267.567l-4.217 4.217a1 1 0 01-1.414 0l-4.217-4.217A1 1 0 013.933 6.002L8.15 1.785c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134.635l-.417.417a1 1 0 001.414 1.414l.417-.417a2.5 2.5 0 00.635-1.134h1.698c-.07.221-.164.41-.267.567L15.93 6.002a1 1 0 11-1.414 1.414l-4.217-4.217z" /></svg>}
                />
                 <StatCard 
                    title="Total Outstanding Debt" 
                    value={formatCurrency(totalDebt)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>}
                />
                 <StatCard 
                    title="Active Loans" 
                    value={activeLoans.length.toString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
                />
            </div>

            <Card className="!p-0">
                {loans.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[960px]">
                            <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Source</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-right">Interest</th>
                                    <th className="p-4 text-right">Total Paid</th>
                                    <th className="p-4 text-right">Remaining</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            {loans.map((loan) => {
                                const totalPaid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                const remainingBalance = loan.amount - totalPaid;

                                return (
                                    <React.Fragment key={loan.id}>
                                        <tbody className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <tr>
                                                <td className="p-4 whitespace-nowrap">{new Date(loan.date).toLocaleDateString()}</td>
                                                <td className="p-4 font-semibold">{loan.source}</td>
                                                <td className="p-4 text-right font-mono font-bold text-green-500 dark:text-green-400">{formatCurrency(loan.amount)}</td>
                                                <td className="p-4 text-right font-mono">{(loan.interestRate * 100).toFixed(2)}%</td>
                                                <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400">{formatCurrency(totalPaid)}</td>
                                                <td className="p-4 text-right font-mono font-bold text-orange-500 dark:text-orange-400">{formatCurrency(remainingBalance)}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${loan.status === 'Active' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{loan.status}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => toggleExpandLoan(loan.id)} className="text-blue-400 hover:text-blue-300">
                                                        {expandedLoanId === loan.id ? 'Hide' : 'Payments'}
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                        {expandedLoanId === loan.id && (
                                            <tbody className="bg-slate-100 dark:bg-slate-800/50">
                                                <tr>
                                                    <td colSpan={8} className="p-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-bold">Payment History</h4>
                                                            <button onClick={() => openPaymentModal(loan.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1 px-3 rounded-md">Add Payment</button>
                                                        </div>
                                                        {(loan.payments && loan.payments.length > 0) ? (
                                                            <table className="w-full text-left text-sm">
                                                                <thead>
                                                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                                                        <th className="p-2">Date</th><th className="p-2">Notes</th><th className="p-2 text-right">Amount Paid</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {loan.payments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                                                                        <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                                                            <td className="p-2">{new Date(p.date).toLocaleDateString()}</td>
                                                                            <td className="p-2 italic text-slate-500 dark:text-slate-400">{p.notes || '-'}</td>
                                                                            <td className="p-2 text-right font-mono">{formatCurrency(p.amount)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No payments recorded for this loan.</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        )}
                                    </React.Fragment>
                                    );
                            })}
                        </table>
                    </div>
                ) : (
                     <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No Loans Recorded</h3>
                        <p className="mt-1 text-sm">Click the button below to add your first loan or capital injection.</p>
                         <button onClick={() => setIsLoanModalOpen(true)} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                            Add Loan
                        </button>
                    </div>
                )}
            </Card>

            <AddLoanModal 
                isOpen={isLoanModalOpen}
                onClose={() => setIsLoanModalOpen(false)}
                onSave={handleSaveLoan}
            />
            {selectedLoanIdForPayment && (
                 <AddLoanPaymentModal 
                    isOpen={isPaymentModalOpen}
                    onClose={() => { setIsPaymentModalOpen(false); setSelectedLoanIdForPayment(null); }}
                    onSave={handleSavePayment}
                    loanId={selectedLoanIdForPayment}
                />
            )}
        </div>
    );
};

export default CapitalPage;