import React from 'react';
import { Order } from '../../types';
import { useCurrency } from '../CurrencyContext';
import { OrderCard } from './OrderCard';
// @ts-ignore
import { Droppable } from '@hello-pangea/dnd';

export interface OrderColumnProps {
    id: Order['status'];
    label: string;
    color: string;
    orders: Order[];
    onOrderClick: (order: Order) => void;
    onDownloadSlip?: (orderId: string) => void;
}

export const OrderColumn: React.FC<OrderColumnProps> = React.memo(({
    id,
    label,
    color,
    orders,
    onOrderClick,
    onDownloadSlip
}) => {
    const { formatCurrency } = useCurrency();
    const totalValue = orders.reduce((sum, o) => sum + o.total, 0);

    return (
        <Droppable droppableId={id}>
// @ts-ignore
            {(provided: any, snapshot: any) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-w-[280px] max-w-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl border flex flex-col transition-colors ${
                        snapshot.isDraggingOver 
                            ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-500' 
                            : 'border-slate-200 dark:border-slate-700'
                    }`}
                >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                                <h3 className="font-bold text-slate-800 dark:text-white">{label}</h3>
                            </div>
                            <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                {orders.length}
                            </span>
                        </div>
                        <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                            {formatCurrency(totalValue)}
                        </div>
                    </div>
                    <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                        {orders.map((order, index) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                index={index}
                                onClick={() => onOrderClick(order)}
                                onDownloadSlip={onDownloadSlip}
                            />
                        ))}
                        {provided.placeholder}
                        {orders.length === 0 && !snapshot.isDraggingOver && (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 00-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p className="text-xs font-medium">No {label.toLowerCase()} orders</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Droppable>
    );
});

OrderColumn.displayName = 'OrderColumn';
