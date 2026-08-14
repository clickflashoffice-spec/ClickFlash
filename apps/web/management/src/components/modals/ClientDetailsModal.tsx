
import React from 'react';
import { Modal } from "@clickflash/ui";
import { Order } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';

interface Client {
    email: string;
    name: string;
    orders: Order[];
    totalSpent: number;
    lastVisit: string;
}

interface ClientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, onClose, client }) => {
    const { formatCurrency } = useCurrency();

    // Sort orders by date descending
    const sortedOrders = [...client.orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Client Details" size="lg">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{client.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-sm">{client.email}</p>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Lifetime Value</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(client.totalSpent)}</p>
                </div>
            </div>

            <h4 className="text-lg font-semibold mb-3">Order History ({client.orders.length})</h4>
            <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {sortedOrders.map(order => (
                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-3 font-mono">{order.id}</td>
                                <td className="p-3">{new Date(order.date).toLocaleDateString()}</td>
                                <td className="p-3">
                                     <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        order.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        order.status === 'Delivered' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right font-medium">{formatCurrency(order.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 flex justify-end border-t border-slate-200 dark:border-slate-700 pt-4">
                 <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Close</button>
            </div>
        </Modal>
    );
};

export default ClientDetailsModal;
