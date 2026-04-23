
import React from 'react';
import { Order } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';

interface OrdersBoardProps {
    orders: Order[];
    onUpdateStatus: (orderId: string, newStatus: Order['status']) => void;
    onOrderClick: (order: Order) => void;
    onDownloadSlip?: (orderId: string) => void;
}

const STATUS_COLUMNS: { id: Order['status'], label: string, color: string }[] = [
    { id: 'Pending', label: 'Pending', color: 'bg-yellow-500' },
    { id: 'Processing', label: 'Processing', color: 'bg-blue-500' },
    { id: 'Completed', label: 'Completed', color: 'bg-green-500' },
    { id: 'Delivered', label: 'Delivered', color: 'bg-purple-500' }
];

const OrderCard: React.FC<{ order: Order; onClick: () => void; onDownloadSlip?: (orderId: string) => void }> = React.memo(({ order, onClick, onDownloadSlip }) => {
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
            className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:-translate-y-1"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {order.id}
                    </span>
                    {order.source && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide ${order.source === 'kiosk'
                                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                            }`} title={order.source === 'kiosk' ? 'Order from Touch Kiosk' : 'Manual order created by staff'}>
                            {order.source === 'kiosk' ? 'K' : 'M'}
                        </span>
                    )}
                </div>
                <span className="text-xs font-medium text-slate-400">
                    {new Date(order.date).toLocaleDateString()}
                </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white truncate mb-1">{order.clientName || 'N/A'}</h4>
            {order.email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2" title={order.email}>{order.email}</p>
            )}
            <div className="flex justify-between items-end mt-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                </div>
                <div className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {formatCurrency(order.total)}
                </div>
            </div>

            {onDownloadSlip && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownloadSlip(order.id);
                    }}
                    className="mt-3 w-full py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Slip
                </button>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.order.id === nextProps.order.id &&
        prevProps.order.status === nextProps.order.status &&
        prevProps.order.total === nextProps.order.total &&
        prevProps.order.clientName === nextProps.order.clientName;
});

OrderCard.displayName = 'OrderCard';

const OrdersBoard: React.FC<OrdersBoardProps> = ({ orders, onUpdateStatus, onOrderClick, onDownloadSlip }) => {
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
                        className="flex-1 min-w-[280px] max-w-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col"
                    >
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">{col.label}</h3>
                                </div>
                                <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                    {colOrders.length}
                                </span>
                            </div>
                            <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                                {formatCurrency(totalValue)}
                            </div>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                            {colOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onClick={() => onOrderClick(order)}
                                    onDownloadSlip={onDownloadSlip}
                                />
                            ))}
                            {colOrders.length === 0 && (
                                <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 00-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="text-xs font-medium">No {col.label.toLowerCase()} orders</p>
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
