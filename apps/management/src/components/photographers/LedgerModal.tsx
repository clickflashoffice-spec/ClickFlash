import React, { useMemo } from "react";
import { Photographer } from "../../types";
import { useOrders } from "../../hooks/useOrders";
import { useCurrency } from "../CurrencyContext";
import Modal from "../common/Modal";

interface LedgerModalProps {
  photographer: Photographer;
  onClose: () => void;
}

const LedgerModal: React.FC<LedgerModalProps> = ({ photographer, onClose }) => {
  const { data: orders = [] } = useOrders();
  const { formatCurrency } = useCurrency();

  const photographerOrders = useMemo(() => {
    return orders.filter(
      (o) => Number(o.photographerId) === Number(photographer.id) && o.status === "Completed"
    );
  }, [orders, photographer.id]);

  const cashOrders = photographerOrders.filter((o) => o.paymentMethod === "Cash" || o.paymentMethod?.toLowerCase() === "cash");
  const cardOrders = photographerOrders.filter((o) => o.paymentMethod === "Card" || o.paymentMethod?.toLowerCase() === "stripe" || o.paymentMethod?.toLowerCase() === "card");

  const cashTotal = cashOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const cardTotal = cardOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const total = cashTotal + cardTotal;

  return (
    <Modal isOpen={true} onClose={onClose} title={`${photographer.name}'s Digital Ledger`}>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Cash Collected</p>
            <p className="text-2xl font-mono font-bold text-emerald-300">{formatCurrency(cashTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">{cashOrders.length} orders</p>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl text-center">
            <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1">Digital / Card</p>
            <p className="text-2xl font-mono font-bold text-sky-300">{formatCurrency(cardTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">{cardOrders.length} orders</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-mono font-bold text-white">{formatCurrency(total)}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-3 bg-white/5 border-b border-white/10">
            <h4 className="text-sm font-bold text-white">Recent Transactions</h4>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {photographerOrders.length === 0 ? (
              <p className="text-center text-slate-400 py-4 text-sm">No completed orders found.</p>
            ) : (
              photographerOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50).map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 border-b border-white/5 hover:bg-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">{order.orderNumber || order.id.substring(0, 8)}</p>
                    <p className="text-xs text-slate-400">{new Date(order.date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-white">{formatCurrency(order.total)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                      order.paymentMethod?.toLowerCase() === "cash" ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400"
                    }`}>
                      {order.paymentMethod || "Card"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LedgerModal;
