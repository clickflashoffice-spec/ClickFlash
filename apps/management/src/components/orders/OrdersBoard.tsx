
import React from 'react';
import { Order } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';

interface OrdersBoardProps {
    orders: Order[];
    onUpdateStatus: (orderId: string, newStatus: Order['status']) => void;
    onOrderClick: (order: Order) => void;
}

const STATUS_COLUMNS: { id: Order['status'], label: string, color: string }[] = [
    { id: 'Pending', label: 'Pending', color: 'bg-yellow-500' },
    { id: 'Processing', label: 'Processing', color: 'bg-blue-500' },
    { id: 'Completed', label: 'Completed', color: 'bg-green-500' },
    { id: 'Delivered', label: 'Delivered', color: 'bg-purple-500' }
];

const OrderCard: React.FC<{ order: Order; onClick: () => void }> = ({ order, onClick }) => {
    const { formatCurrency } = useCurrency();
    
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('orderId', order.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div 
            draggable 
            onDragStart={handleDragStart}
            onClick={onClick}
            className="bg-white/5 p-4 rounded-xl shadow-sm border border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/10 hover:shadow-lg transition-all hover:-translate-y-1 backdrop-blur-md"
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                    {order.id}
                </span>
                <span className="text-xs font-medium text-slate-400">
                    {new Date(order.date).toLocaleDateString()}
                </span>
            </div>
            <h4 className="font-bold text-white truncate mb-1">{order.clientName || 'N/A'}</h4>
            {order.email && (
                <p className="text-xs text-slate-400 truncate mb-2" title={order.email}>{order.email}</p>
            )}
            <div className="flex justify-between items-end mt-3">
                <div className="text-xs font-medium text-slate-400">
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                </div>
                <div className="font-bold text-white font-mono text-sm">
                    {formatCurrency(order.total)}
                </div>
            </div>
        </div>
    );
};

const OrdersBoard: React.FC<OrdersBoardProps> = ({ orders, onUpdateStatus, onOrderClick }) => {
    const { formatCurrency } = useCurrency();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, status: Order['status']) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('orderId');
        if (orderId) {
            onUpdateStatus(orderId, status);
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-h-[500px]">
            {STATUS_COLUMNS.map(col => {
                const colOrders = orders.filter(o => o.status === col.id);
                const totalValue = colOrders.reduce((sum, o) => sum + o.total, 0);

                return (
                    <div 
                        key={col.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        className="flex-1 min-w-[280px] max-w-xs bg-black/20 rounded-xl border border-white/5 flex flex-col backdrop-blur-3xl"
                    >
                        <div className="p-4 border-b border-white/5 bg-white/5 rounded-t-xl sticky top-0 z-10 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${col.color} shadow-[0_0_8px_currentColor]`}></div>
                                    <h3 className="font-bold text-white">{col.label}</h3>
                                </div>
                                <span className="text-xs font-bold text-slate-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full">
                                    {colOrders.length}
                                </span>
                            </div>
                            <div className="text-right text-xs font-mono font-medium text-slate-400">
                                {formatCurrency(totalValue)}
                            </div>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                            {colOrders.map(order => (
                                <OrderCard key={order.id} order={order} onClick={() => onOrderClick(order)} />
                            ))}
                            {colOrders.length === 0 && (
                                <div className="h-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/10 rounded-xl p-4 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 00-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="text-xs font-medium text-slate-500">No {col.label.toLowerCase()} orders</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default OrdersBoard;
