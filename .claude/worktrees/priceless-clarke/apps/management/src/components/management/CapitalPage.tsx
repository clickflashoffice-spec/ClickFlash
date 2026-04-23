import React, { useState, useEffect, useMemo } from "react";
import Card from "../common/Card.tsx";
import { Loan, Destination, LoanPayment } from "../../types.ts";
import AddLoanModal from "./modals/AddLoanModal.tsx";
import AddLoanPaymentModal from "./modals/AddLoanPaymentModal.tsx";
import { useCurrency } from "../CurrencyContext.tsx";
import { apiService } from "../../services/apiService.ts";
import Spinner from "../common/Spinner.tsx";
import StatCard from "../common/StatCard.tsx";
import { DollarSign, AlertCircle, CreditCard, Plus } from "lucide-react";

interface CapitalPageProps {
  context?: string;
}

const CapitalPage: React.FC<CapitalPageProps> = ({ context }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [selectedLoanIdForPayment, setSelectedLoanIdForPayment] = useState<
    string | null
  >(null);

  const { formatCurrency } = useCurrency();

  const fetchData = async () => {
    try {
      const [loansData, destData] = await Promise.all([
        apiService.getLoans(),
        apiService.getDestinations(),
      ]);
      setLoans(
        loansData.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
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

  const handleSaveLoan = async (newLoan: Omit<Loan, "id">) => {
    await apiService.createLoan(newLoan);
    setIsLoanModalOpen(false);
    fetchData(); // Refetch all data
  };

  const handleSavePayment = async (
    newPayment: Omit<LoanPayment, "id" | "loanId">,
  ) => {
    if (!selectedLoanIdForPayment) return;
    await apiService.createLoanPayment(selectedLoanIdForPayment, newPayment);
    setIsPaymentModalOpen(false);
    setSelectedLoanIdForPayment(null);
    fetchData(); // Refetch all data
  };

  const toggleExpandLoan = (loanId: string) => {
    setExpandedLoanId((prev) => (prev === loanId ? null : loanId));
  };

  const openPaymentModal = (loanId: string) => {
    setSelectedLoanIdForPayment(loanId);
    setIsPaymentModalOpen(true);
  };

  const filteredLoans = useMemo(() => {
    if (!context || context === "all" || context === "global") {
      return loans;
    }
    return loans.filter((loan) => {
      // Assuming loans are linked to destinations or photographers who have destinations
      // For now, if loan has destinationId, filter by it
      return (loan as any).destinationId === context;
    });
  }, [loans, context]);

  const activeLoans = filteredLoans.filter((loan) => loan.status === "Active");
  const totalCapital = filteredLoans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalDebt = activeLoans.reduce((sum, loan) => {
    const totalPaid = (loan.payments || []).reduce(
      (paymentSum, p) => paymentSum + p.amount,
      0,
    );
    const remainingBalance = loan.amount - totalPaid;
    return sum + remainingBalance;
  }, 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Finance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Capital & Loans</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage business loans and capital injections</p>
        </div>
        <button
          onClick={() => setIsLoanModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Add Loan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Capital"
          value={formatCurrency(totalCapital)}
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatCard
          title="Total Outstanding Debt"
          value={formatCurrency(totalDebt)}
          icon={<AlertCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Active Loans"
          value={activeLoans.length.toString()}
          icon={<CreditCard className="h-6 w-6" />}
        />
      </div>

      <div className="bg-white/4 rounded-2xl border border-white/8 overflow-hidden">
        {loans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[960px]">
              <thead className="border-b border-white/8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
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
                    <tbody className="border-b border-white/5 hover:bg-white/4 transition-colors">
                      <tr>
                        <td className="p-4 text-slate-400 text-sm whitespace-nowrap">
                          {new Date(loan.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold text-white text-sm">{loan.source}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(loan.amount)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400 text-sm">
                          {(loan.interestRate * 100).toFixed(2)}%
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400 text-sm">
                          {formatCurrency(totalPaid)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-amber-400">
                          {formatCurrency(remainingBalance)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            loan.status === "Active"
                              ? "bg-amber-400/10 text-amber-400 border-amber-400/20"
                              : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                          }`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleExpandLoan(loan.id)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                          >
                            {expandedLoanId === loan.id ? "Hide" : "Payments"}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                    {expandedLoanId === loan.id && (
                      <tbody className="bg-black/20">
                        <tr>
                          <td colSpan={8} className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-black text-white text-xs uppercase tracking-widest">Payment History</h4>
                              <button
                                onClick={() => openPaymentModal(loan.id)}
                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all"
                              >
                                Add Payment
                              </button>
                            </div>
                            {loan.payments && loan.payments.length > 0 ? (
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-white/8">
                                    <th className="p-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">Date</th>
                                    <th className="p-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">Notes</th>
                                    <th className="p-2 text-right text-[10px] font-black text-slate-600 uppercase tracking-widest">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loan.payments
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((p) => (
                                      <tr key={p.id} className="border-b border-white/5 last:border-0">
                                        <td className="p-2 text-slate-400">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="p-2 italic text-slate-600">{p.notes || "—"}</td>
                                        <td className="p-2 text-right font-mono text-white">{formatCurrency(p.amount)}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-center text-sm text-slate-600 py-4">No payments recorded for this loan.</p>
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
          <div className="text-center py-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
            </svg>
            <h3 className="mt-2 text-lg font-black text-white">No Loans Recorded</h3>
            <p className="mt-1 text-sm text-slate-500">Click the button to add your first loan or capital injection.</p>
            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="mt-6 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider"
            >
              Add Loan
            </button>
          </div>
        )}
      </div>

      <AddLoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        onSave={handleSaveLoan}
      />
      {selectedLoanIdForPayment && (
        <AddLoanPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedLoanIdForPayment(null);
          }}
          onSave={handleSavePayment}
          loanId={selectedLoanIdForPayment}
        />
      )}
    </div>
  );
};

export default CapitalPage;

