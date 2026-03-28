import React from 'react';
import Card from '../../../common/Card';
import { Loan } from '../../../../types';
import { useCurrency } from '../../../CurrencyContext';

interface LoanOverviewWidgetProps {
  loans: Loan[];
}

const LoanOverviewWidget: React.FC<LoanOverviewWidgetProps> = ({ loans }) => {
    const { formatCurrency } = useCurrency();

    const activeLoans = loans.filter(loan => loan.status === 'Active');
    
    const totalDebt = activeLoans.reduce((sum, loan) => {
        const totalPaid = (loan.payments || []).reduce((paymentSum, p) => paymentSum + p.amount, 0);
        const remainingBalance = loan.amount - totalPaid;
        return sum + remainingBalance;
    }, 0);

    return (
        <Card className="h-full">
            <h3 className="text-lg font-bold mb-4">Capital & Loans</h3>
            <div className="space-y-6">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Outstanding Debt</p>
                    <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">{formatCurrency(totalDebt)}</p>
                </div>
                 <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Active Loans</p>
                    <p className="text-3xl font-bold">{activeLoans.length}</p>
                </div>
            </div>
        </Card>
    );
};

export default LoanOverviewWidget;