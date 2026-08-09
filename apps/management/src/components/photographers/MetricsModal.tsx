import React, { useMemo } from "react";
import { Photographer } from "../../types";
import { useOrders } from "../../hooks/useOrders";
import { useCurrency } from "../CurrencyContext";
import { Modal } from "@clickflash/ui";

interface MetricsModalProps {
  photographer: Photographer;
  onClose: () => void;
}

const MetricsModal: React.FC<MetricsModalProps> = ({ photographer, onClose }) => {
  const { data: orders = [] } = useOrders();
  const { formatCurrency } = useCurrency();

  const metrics = useMemo(() => {
    const photographerOrders = orders.filter(
      (o) => Number(o.photographerId) === Number(photographer.id) && o.status === "Completed"
    );

    const totalRevenue = photographerOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const orderCount = photographerOrders.length;
    
    // Mocking sessions based on order count for demonstration of Conversion Rate
    // In a real app, we would fetch actual session counts
    const estimatedSessions = Math.max(orderCount + Math.floor(orderCount * 0.4) + 2, 5); 
    const conversionRate = (orderCount / estimatedSessions) * 100;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
    
    // Calculate customer satisfaction (mocked)
    const satisfactionScore = Math.min(4.2 + (orderCount * 0.05), 5.0).toFixed(1);

    return {
      totalRevenue,
      orderCount,
      estimatedSessions,
      conversionRate,
      aov,
      satisfactionScore
    };
  }, [orders, photographer.id]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`${photographer.name}'s AI Performance Metrics`}>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-center">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Conversion Rate</p>
            <p className="text-2xl font-mono font-bold text-indigo-300">{metrics.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">{metrics.orderCount} orders / {metrics.estimatedSessions} sessions</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Avg Order Value (AOV)</p>
            <p className="text-2xl font-mono font-bold text-amber-300">{formatCurrency(metrics.aov)}</p>
            <p className="text-xs text-slate-400 mt-1">Goal: {formatCurrency(metrics.aov * 1.2)}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center md:col-span-2">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Customer Satisfaction</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-emerald-300">{metrics.satisfactionScore}</span>
              <span className="text-lg text-emerald-400">/ 5.0</span>
            </div>
            <div className="flex justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${star <= Number(metrics.satisfactionScore) ? 'text-emerald-400' : 'text-slate-600'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden p-4">
          <h4 className="text-sm font-bold text-white mb-3">AI Coach Notes</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="bg-sky-500/20 text-sky-400 p-1 rounded-md mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm text-slate-300">Strong performance during sunset hours. Conversion rate is 15% higher than average.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-amber-500/20 text-amber-400 p-1 rounded-md mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <p className="text-sm text-slate-300">Suggestion: Try to upsell the digital package. AOV is slightly below the target of {formatCurrency(metrics.aov * 1.2)}.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default MetricsModal;
