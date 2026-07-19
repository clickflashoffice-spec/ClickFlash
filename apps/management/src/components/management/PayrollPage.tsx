import React, { useState, useEffect, useMemo } from "react";
import { Photographer, Order, Adjustment } from "../../types.ts";
import { useCurrency } from "../CurrencyContext.tsx";
import { useManagement } from "../../context/ManagementContext.tsx";
import { apiService } from "../../services/apiService.ts";
import Spinner from "../common/Spinner.tsx";
import StatCard from "../common/StatCard.tsx";
import PayrollDetailsModal from "./modals/PayrollDetailsModal.tsx";
import { usePermissions } from "../../hooks/usePermissions.ts";
import AddAdjustmentModal from "./modals/AddAdjustmentModal.tsx";
import { logger } from "@/utils/logger";

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
  const { selectedContext: context } = useManagement();
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();
  const [payrollPeriod, setPayrollPeriod] = useState(
    new Date().toISOString().slice(0, 7),
  ); // YYYY-MM format
  // For cross-browser compatibility with input[type=month], we use a standard text input with a fallback or a custom picker if needed.
  // For now, we'll keep it as 'month' but ensure the label is clear, as Tailwind UI often uses this.
  // However, to fix the lint, we can use a standard input and a helper.
  // Actually, I will replace it with a more robust pattern if the user wants, but for now I'll just fix the lint by using a custom component or a standard date input if preferred.

  const [paymentStatus, setPaymentStatus] = useState<Record<string, boolean>>(
    {},
  ); // key: photographerId-period
  const [detailsModalData, setDetailsModalData] =
    useState<PayrollRowData | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [photographerForAdjustment, setPhotographerForAdjustment] =
    useState<Photographer | null>(null);
  const { can } = usePermissions(currentUser);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [users, ordersData, adjustmentsData] = await Promise.all([
        apiService.getUsers(),
        apiService.getOrders(`date ~ '${payrollPeriod}' && status = 'Completed'`),
        apiService.getAdjustments(), // We still need all adjustments for YYYY and all-time KPIs, though this could be optimized later
      ]);
      setPhotographers(users);
      setOrders(ordersData);
      setAdjustments(adjustmentsData);
    } catch (err) {
      logger.error("Failed to load payroll data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [payrollPeriod]); // Refetch when period changes

  const payrollData: PayrollRowData[] = useMemo(() => {
    // Orders are already filtered by the backend for this period and 'Completed' status
    const filteredOrders = orders;

    const filteredPhotographers = photographers.filter((p) => {
      if (!context || context === "all" || context === "global") return true;
      return p.destinationId === context;
    });

    return filteredPhotographers.map((p) => {
      const adjustmentsForPeriod = adjustments.filter(
        (adj) =>
          adj.photographerId === p.id && adj.date.startsWith(payrollPeriod),
      );

      const unpaidAdjustments = adjustmentsForPeriod.filter(
        (adj) => adj.status === "Unpaid",
      );

      const totalSales = filteredOrders
        .filter((o) => o.photographerId === p.id)
        .reduce((sum, o) => sum + o.total, 0);

      const adjustmentsTotal = unpaidAdjustments.reduce((sum, adj) => {
        return sum + (adj.type === "Bonus" ? adj.amount : -adj.amount);
      }, 0);

      let basePay = 0;
      let commissionPay = 0;

      if (p.payrollType === "Salary") {
        basePay = p.monthlySalary || 0;
      } else {
        let activeRate = p.commissionRate || 0.1;
        if (useTieredCommissions) {
          if (totalSales > 2000) activeRate = 0.20;
          else if (totalSales > 1000) activeRate = 0.15;
        }
        commissionPay = totalSales * activeRate;
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
  }, [
    photographers,
    orders,
    adjustments,
    payrollPeriod,
    paymentStatus,
    context,
    useTieredCommissions,
  ]);

  const kpiData = useMemo(() => {
    const unpaidPayroll = payrollData.filter((p) => !p.isPaid);

    const totalUnpaidAdjustmentsAllTime = adjustments
      .filter((adj) => adj.status === "Unpaid")
      .reduce(
        (sum, adj) => sum + (adj.type === "Bonus" ? adj.amount : -adj.amount),
        0,
      );

    const currentYear = new Date().getFullYear();
    const totalPaidAdjustmentsThisYear = adjustments
      .filter(
        (adj) =>
          adj.status === "Paid" && adj.date.startsWith(currentYear.toString()),
      )
      .reduce(
        (sum, adj) => sum + (adj.type === "Bonus" ? adj.amount : -adj.amount),
        0,
      );

    return {
      totalPayrollDue: unpaidPayroll.reduce((sum, p) => sum + p.totalPay, 0),
      totalSalaries: unpaidPayroll.reduce((sum, p) => sum + p.basePay, 0),
      totalCommission: unpaidPayroll.reduce(
        (sum, p) => sum + p.commissionPay,
        0,
      ),
      totalAdjustments: unpaidPayroll.reduce(
        (sum, p) => sum + p.adjustmentsTotal,
        0,
      ),
      totalUnpaidAdjustmentsAllTime,
      totalPaidAdjustmentsThisYear,
    };
  }, [payrollData, adjustments]);

  const handleTogglePaymentStatus = (
    photographerId: string,
    isCurrentlyPaid: boolean,
  ) => {
    const confirmationMessage = isCurrentlyPaid
      ? "Are you sure you want to revert this payment and mark as UNPAID?"
      : "Are you sure you want to mark this photographer as PAID for this period?";

    if (window.confirm(confirmationMessage)) {
      const newStatus = !isCurrentlyPaid;
      const key = `${photographerId}-${payrollPeriod}`;
      setPaymentStatus((prev) => ({ ...prev, [key]: newStatus }));

      setAdjustments((prevAdjustments) =>
        prevAdjustments.map((adj) => {
          if (
            adj.photographerId === photographerId &&
            adj.date.startsWith(payrollPeriod)
          ) {
            return { ...adj, status: newStatus ? "Paid" : "Unpaid" };
          }
          return adj;
        }),
      );
    }
  };

  const handlePayAll = () => {
    const unpaidCount = payrollData.filter((p) => !p.isPaid).length;
    if (unpaidCount === 0) {
      alert("All photographers have already been paid for this period.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to mark all ${unpaidCount} pending photographers as paid for this period?`,
      )
    ) {
      const newStatuses: Record<string, boolean> = {};
      const adjustmentIdsToUpdate = new Set<string>();

      payrollData.forEach((p) => {
        if (!p.isPaid) {
          newStatuses[`${p.id}-${payrollPeriod}`] = true;
          const adjustmentsToPay = adjustments.filter(
            (adj) =>
              adj.photographerId === p.id && adj.date.startsWith(payrollPeriod),
          );
          adjustmentsToPay.forEach((adj) => adjustmentIdsToUpdate.add(adj.id));
        }
      });
      setPaymentStatus((prev) => ({ ...prev, ...newStatuses }));
      setAdjustments((prevAdjustments) =>
        prevAdjustments.map((adj) =>
          adjustmentIdsToUpdate.has(adj.id) ? { ...adj, status: "Paid" } : adj,
        ),
      );
    }
  };

  const handleAddAdjustment = (photographer: Photographer) => {
    setPhotographerForAdjustment(photographer);
    setIsAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = async (
    newAdjustment: Omit<Adjustment, "id">,
  ) => {
    await apiService.createAdjustment(newAdjustment);
    fetchData(); // Refetch all data to update payroll
    setIsAdjustmentModalOpen(false);
  };

  const [useTieredCommissions, setUseTieredCommissions] = useState(false);

  const handleExport = (format: 'ach' | 'sepa' | 'csv') => {
    const content = payrollData.map(p => `${p.id},${p.name},${p.totalPay},${format.toUpperCase()}`).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-clearing-${payrollPeriod}.${format === 'csv' ? 'csv' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Spinner />;

  const unpaidPhotographersCount = payrollData.filter((p) => !p.isPaid).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Finance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Payroll</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <select
              value={payrollPeriod.split("-")[1]}
              onChange={(e) => {
                const year = payrollPeriod.split("-")[0];
                setPayrollPeriod(`${year}-${e.target.value}`);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              {[
                "01",
                "02",
                "03",
                "04",
                "05",
                "06",
                "07",
                "08",
                "09",
                "10",
                "11",
                "12",
              ].map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, parseInt(m) - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
            <select
              value={payrollPeriod.split("-")[0]}
              onChange={(e) => {
                const month = payrollPeriod.split("-")[1];
                setPayrollPeriod(`${e.target.value}-${month}`);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - 2 + i,
              ).map((y) => (
                <option key={y} value={y.toString()}>
                  {y}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 ml-4 text-xs font-bold text-slate-300 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={useTieredCommissions}
                onChange={e => setUseTieredCommissions(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer" 
              />
              Tiered Commissions
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('ach')}
              className="px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider"
            >
              Export ACH
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2.5 bg-white/5 text-slate-300 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-black uppercase tracking-wider"
            >
              CSV
            </button>
            <button
              onClick={handlePayAll}
              disabled={unpaidPhotographersCount === 0 || !can("runPayroll")}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {`Pay All (${unpaidPhotographersCount})`}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Next Monthly Payroll"
          value={formatCurrency(kpiData.totalPayrollDue)}
        />
        <StatCard
          title="Pending Base/Comm"
          value={formatCurrency(
            kpiData.totalSalaries + kpiData.totalCommission,
          )}
        />
        <StatCard
          title="Unpaid Adj. (All Time)"
          value={formatCurrency(kpiData.totalUnpaidAdjustmentsAllTime)}
        />
        <StatCard
          title={`Paid Adj. (YTD ${new Date().getFullYear()})`}
          value={formatCurrency(kpiData.totalPaidAdjustmentsThisYear)}
        />
      </div>

      <div className="bg-white/4 rounded-2xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
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
              {payrollData.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                  <td className="p-4 font-semibold flex items-center space-x-3">
                    <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full ring-2 ring-white/10" />
                    <span className="text-white text-sm">{p.name}</span>
                  </td>
                  <td className="p-4 text-slate-400 text-sm">{p.payrollType}</td>
                  <td className="p-4 text-right font-mono text-sm text-slate-300">
                    {formatCurrency(p.basePay + p.commissionPay)}
                  </td>
                  <td className="p-4 text-right font-mono text-sm text-slate-300">
                    {formatCurrency(p.adjustmentsTotal)}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-blue-400">
                    {formatCurrency(p.totalPay)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      p.isPaid
                        ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                        : "bg-amber-400/10 text-amber-400 border-amber-400/20"
                    }`}>
                      {p.isPaid ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() => setDetailsModalData(p)}
                      className="text-blue-400 hover:text-blue-300 font-bold text-xs transition-colors"
                    >
                      View
                    </button>
                    {can("manageAdjustments") && (
                      <button
                        onClick={() => handleAddAdjustment(p)}
                        className="text-emerald-400 hover:text-emerald-300 font-bold text-xs transition-colors"
                      >
                        Adjust
                      </button>
                    )}
                    <button
                      onClick={() => handleTogglePaymentStatus(p.id, p.isPaid)}
                      disabled={!can("runPayroll")}
                      className={`font-bold py-1 px-2.5 rounded-lg text-xs transition-all ${
                        p.isPaid
                          ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {p.isPaid ? "Revert" : "Mark Paid"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
          preselectedPhotographerId={photographerForAdjustment.id}
        />
      )}
    </div>
  );
};

export default PayrollPage;

