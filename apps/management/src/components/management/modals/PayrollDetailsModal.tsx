import React from 'react';
import { Modal } from "@clickflash/ui";
import { Photographer, Adjustment } from '../../../types';
import { useCurrency } from '../../CurrencyContext';

type PayrollRowData = Photographer & {
    totalSales: number;
    basePay: number;
    commissionPay: number;
    adjustmentsTotal: number;
    adjustmentsForPeriod: Adjustment[];
    totalPay: number;
    isPaid: boolean;
};

interface PayrollDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    payrollData: PayrollRowData;
    payrollPeriod: string;
}

const PayrollDetailsModal: React.FC<PayrollDetailsModalProps> = ({ isOpen, onClose, payrollData, payrollPeriod }) => {
    const { formatCurrency } = useCurrency();

    const handlePrint = () => {
        window.print();
    };

    const periodDate = new Date(`${payrollPeriod}-02`); // Use 2nd day to avoid timezone issues
    const periodDisplay = periodDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Payslip for ${payrollData.name}`} size="lg">
            <div className="printable-area p-4">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">{payrollData.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">Payslip for {periodDisplay}</p>
                </div>
                
                <div className="space-y-4">
                    {/* Earnings */}
                    <div>
                        <h3 className="font-bold text-lg mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Earnings & Adjustments</h3>
                        <div className="space-y-1 text-slate-800 dark:text-slate-200">
                             {payrollData.payrollType === 'Salary' ? (
                                <DetailRow label="Base Salary" amount={payrollData.basePay} />
                            ) : (
                                <DetailRow 
                                    label={`Commission (${(payrollData.commissionRate || 0) * 100}%)`} 
                                    amount={payrollData.commissionPay} 
                                    note={`on ${formatCurrency(payrollData.totalSales)} sales`}
                                />
                            )}
                            {payrollData.adjustmentsForPeriod.map(adj => (
                                <DetailRow
                                    key={adj.id}
                                    label={adj.description}
                                    amount={adj.type === 'Bonus' ? adj.amount : -adj.amount}
                                    note={adj.type}
                                    isAdjustment={true}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                         <DetailRow label="Gross Earnings" amount={payrollData.basePay + payrollData.commissionPay + payrollData.adjustmentsForPeriod.reduce((sum, adj) => sum + (adj.type === 'Bonus' ? adj.amount : 0), 0)} isBold={true}/>
                         <DetailRow label="Total Deductions" amount={payrollData.adjustmentsForPeriod.reduce((sum, adj) => sum + (adj.type === 'Deduction' ? adj.amount : 0), 0)} isBold={true}/>
                         <div className="flex justify-between items-center font-bold text-xl mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span>Net Pay</span>
                            <span className="font-mono">{formatCurrency(payrollData.totalPay)}</span>
                         </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 mt-6 no-print">
                <span className={`px-2 py-1 rounded-full text-sm font-semibold ${payrollData.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    Status: {payrollData.isPaid ? 'Paid' : 'Pending'}
                </span>
                <div className="space-x-3">
                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Close</button>
                    <button type="button" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Print</button>
                </div>
            </div>
        </Modal>
    );
};


const DetailRow: React.FC<{label: string, amount: number, note?: string, isBold?: boolean, isAdjustment?: boolean}> = ({ label, amount, note, isBold=false, isAdjustment=false }) => {
    const { formatCurrency } = useCurrency();
    const amountColor = amount >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
    return (
        <div className={`flex justify-between items-center ${isBold ? 'font-bold' : ''} ${isAdjustment ? 'pl-4' : ''}`}>
            <div>
                <span>{label}</span>
                {note && <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({note})</span>}
            </div>
            <span className={`font-mono ${isAdjustment ? amountColor : ''}`}>{isAdjustment && amount > 0 ? '+' : ''}{formatCurrency(amount)}</span>
        </div>
    );
};


export default PayrollDetailsModal;