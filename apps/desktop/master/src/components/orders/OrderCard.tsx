import React from 'react';
import { Order } from '../../types';
import { useCurrency } from '../CurrencyContext';
// @ts-ignore
import { Draggable } from '@hello-pangea/dnd';

export interface OrderCardProps {
    order: Order;
    index: number;
    onClick: () => void;
    onDownloadSlip?: (orderId: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = React.memo(({ order, index, onClick, onDownloadSlip }) => {
    const { formatCurrency } = useCurrency();

    const isOverdue = (order.status === 'Pending' || order.status === 'Processing') && (() => {
        const createdStr = order.created_at || order.created || order.date;
        if (!createdStr) return false;
        const createdTime = new Date(createdStr).getTime();
        return !isNaN(createdTime) && (Date.now() - createdTime) > 30 * 60 * 1000;
    })();

    const isHighValue = order.total > 100;

    let borderClass = 'border-slate-200 dark:border-slate-700';
    if (isOverdue) {
        borderClass = 'border-red-500 dark:border-red-500';
    } else if (isHighValue) {
        borderClass = 'border-amber-400 dark:border-amber-400';
    }

    let shadowClass = 'shadow-sm';
    if (isHighValue) {
        shadowClass = 'shadow-[0_0_12px_rgba(224,180,68,0.35)]';
    }

    return (
        <Draggable draggableId={order.id} index={index}>
// @ts-ignore
            {(provided: any, snapshot: any) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                    style={{
                        ...provided.draggableProps.style,
                        // Add some opacity when dragging
                        opacity: snapshot.isDragging ? 0.8 : 1,
                    }}
                    className={`bg-white dark:bg-slate-800 p-4 rounded-lg border cursor-grab hover:shadow-md transition-all ${
                        snapshot.isDragging ? 'shadow-xl -translate-y-1' : ''
                    } ${borderClass} ${shadowClass}`}
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

            {(isOverdue || isHighValue) && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {isOverdue && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white animate-pulse flex items-center gap-1">
                            <span className="w-1 h-1 bg-white rounded-full"></span>
                            Overdue
                        </span>
                    )}
                    {isHighValue && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-slate-900 dark:bg-amber-400 dark:text-slate-950 flex items-center gap-1">
                            ★ VIP
                        </span>
                    )}
                </div>
            )}

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
            )}
        </Draggable>
    );
}, (prevProps, nextProps) => {
    return prevProps.order.id === nextProps.order.id &&
        prevProps.order.status === nextProps.order.status &&
        prevProps.order.total === nextProps.order.total &&
        prevProps.order.clientName === nextProps.order.clientName &&
        prevProps.order.created_at === nextProps.order.created_at &&
        prevProps.order.created === nextProps.order.created &&
        prevProps.order.date === nextProps.order.date;
});

OrderCard.displayName = 'OrderCard';
