import React, { useState, useRef, useEffect } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { Order, Photographer } from '../../types';
import { useCurrency } from '../CurrencyContext';

type PaymentStatus = 'Paid' | 'Pending' | 'Refunded';

interface OrdersListProps {
    orders: Order[];
    photographers: Photographer[];
    isLoading: boolean;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    onFetchNextPage: () => void;
    onOrderClick: (order: Order) => void;
    onStatusChange: (orderId: string, status: Order['status']) => void;
    onPrintOrder: (order: Order) => void;
    onPrintReceipt: (order: Order) => void;
    onOpenLabFolder: (order: Order) => void;
    /** Set of selected order IDs for bulk actions */
    selectedOrderIds?: Set<string>;
    /** Callback when an order selection changes */
    onSelectOrder?: (orderId: string, selected: boolean) => void;
    /** Payment status filter for highlighting */
    paymentStatusFilter?: 'All' | PaymentStatus;
}

/**
 * Get payment status from order
 */
const getPaymentStatus = (order: Order): PaymentStatus => {
    if (order.status === 'Cancelled') return 'Refunded';
    if (order.status === 'Completed' || order.status === 'Delivered') return 'Paid';
    return 'Pending';
};

/**
 * Get payment status badge styling
 */
const getPaymentStatusStyle = (status: PaymentStatus): string => {
    switch (status) {
        case 'Paid':
            return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
        case 'Refunded':
            return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
        default:
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
    }
};

const OrdersList: React.FC<OrdersListProps> = ({
    orders,
    photographers,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
    onOrderClick,
    onStatusChange,
    onPrintOrder,
    onPrintReceipt,
    onOpenLabFolder,
    selectedOrderIds = new Set(),
    onSelectOrder,
    paymentStatusFilter = 'All'
}) => {
    const { formatCurrency } = useCurrency();
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openActionMenu]);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-full flex flex-col overflow-hidden">
                <div className="p-4 space-y-4 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-xl h-full flex flex-col shadow-lg overflow-hidden">
            <div className="flex-grow min-h-[300px] relative h-full">
                {orders.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <p className="text-lg font-medium">No orders found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filters</p>
                        </div>
                    </div>
                ) : (
                    <TableVirtuoso
                        data={orders}
                        endReached={() => {
                            if (hasNextPage && !isFetchingNextPage) {
                                onFetchNextPage();
                            }
                        }}
                        fixedHeaderContent={() => (
                            <tr>
                                {onSelectOrder && (
                                    <th className="p-3 md:p-4 w-10 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80">
                                        <span className="sr-only">Select</span>
                                    </th>
                                )}
                                <th className="p-3 md:p-4 whitespace-nowrap text-xs md:text-sm font-semibold border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80">Order ID</th>
                                <th className="p-3 md:p-4 text-xs md:text-sm font-semibold border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80">Client</th>
                                <th className="p-3 md:p-4 hidden md:table-cell text-xs md:text-sm font-semibold border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80">Photographer</th>
                                <th className="p-3 md:p-4 text-xs md:text-sm font-semibold border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80">Status</th>
                                <th className="p-3 md:p-4 hidden sm:table-cell text-xs md:text-sm font-semibold border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80">Payment</th>
                                <th className="p-3 md:p-4 text-right text-xs md:text-sm font-semibold border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80">Total</th>
                                <th className="p-3 md:p-4 text-center text-xs md:text-sm font-semibold border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80">Actions</th>
                            </tr>
                        )}
                        itemContent={(_index: number, order: Order) => {
                            const photographer = photographers.find(p => p.id === order.photographerId);
                            const isMenuOpen = openActionMenu === order.id;
                            const isSelected = selectedOrderIds.has(order.id);
                            const paymentStatus = getPaymentStatus(order);

                            const isOverdue = (order.status === 'Pending' || order.status === 'Processing') && (() => {
                                const createdStr = order.created_at || order.created || order.date;
                                if (!createdStr) return false;
                                const createdTime = new Date(createdStr).getTime();
                                return !isNaN(createdTime) && (Date.now() - createdTime) > 30 * 60 * 1000;
                            })();
                            const isHighValue = order.total > 100;

                            return (
                                <>
                                    {/* Checkbox */}
                                    {onSelectOrder && (
                                        <td className="p-3 md:p-4 border-b border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => onSelectOrder(order.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                aria-label={`Select order ${order.orderNumber || order.id}`}
                                            />
                                        </td>
                                    )}
                                    {/* Order ID & Source */}
                                    <td className="p-3 md:p-4 cursor-pointer" onClick={() => onOrderClick(order)}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-mono font-semibold text-sm md:text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {order.orderNumber || order.id}
                                            </p>
                                            {order.source && (
                                                <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${order.source === 'kiosk'
                                                    ? 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-slate-100/50 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
                                                    }`}>
                                                    {order.source === 'kiosk' ? 'Kiosk' : 'Manual'}
                                                </span>
                                            )}
                                            {isOverdue && (
                                                <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-red-600 text-white animate-pulse">
                                                    Overdue
                                                </span>
                                            )}
                                            {isHighValue && (
                                                <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-500 text-slate-900 dark:bg-amber-400 dark:text-slate-950">
                                                    ★ VIP
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">
                                            {new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </td>

                                    {/* Client Info */}
                                    <td className="p-3 md:p-4 cursor-pointer" onClick={() => onOrderClick(order)}>
                                        <p className="font-semibold text-sm md:text-base text-slate-900 dark:text-white">{order.clientName || 'N/A'}</p>
                                        {order.email && (
                                            <p className="text-xs text-slate-500 truncate max-w-[150px]" title={order.email}>{order.email}</p>
                                        )}
                                    </td>

                                    {/* Photographer */}
                                    <td className="p-3 md:p-4 hidden md:table-cell cursor-pointer" onClick={() => onOrderClick(order)}>
                                        {photographer ? (
                                            <div className="flex items-center space-x-2">
                                                <img
                                                    src={photographer.avatarUrl || 'https://i.imgur.com/3Y2j2s2.png'}
                                                    alt={photographer.name}
                                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://i.imgur.com/3Y2j2s2.png';
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{photographer.name}</span>
                                            </div>
                                        ) : <span className="text-slate-400 text-sm italic">Unassigned</span>}
                                    </td>

                                    {/* Status */}
                                    <td className="p-3 md:p-4 cursor-pointer" onClick={() => onOrderClick(order)}>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${order.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            order.status === 'Delivered' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                order.status === 'Processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {order.status === 'Pending' && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>}
                                            {order.status}
                                        </span>
                                    </td>

                                    {/* Payment Status */}
                                    <td className="p-3 md:p-4 hidden sm:table-cell cursor-pointer" onClick={() => onOrderClick(order)}>
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getPaymentStatusStyle(paymentStatus)}`}>
                                            {paymentStatus}
                                        </span>
                                        {order.paymentMethod && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">{order.paymentMethod}</p>
                                        )}
                                    </td>

                                    {/* Total */}
                                    <td className="p-3 md:p-4 text-right font-bold font-mono text-sm md:text-base text-slate-900 dark:text-white cursor-pointer" onClick={() => onOrderClick(order)}>
                                        {formatCurrency(order.total)}
                                    </td>

                                    {/* Actions */}
                                    <td className="p-3 md:p-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenLabFolder(order);
                                                }}
                                                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                title="Open Lab Folder"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="hidden xl:inline">Lab Folder</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenActionMenu(isMenuOpen ? null : order.id);
                                                }}
                                                className={`p-2 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                                                aria-label="More options"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Dropdown Menu */}
                                        {isMenuOpen && (
                                            <div ref={actionMenuRef} className="absolute right-12 top-0 z-50 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl text-left overflow-hidden ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in duration-200">
                                                <div className="py-1">
                                                    <button onClick={(e) => { e.stopPropagation(); onOrderClick(order); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View Details
                                                    </button>

                                                    {order.status === 'Pending' && (
                                                        <button onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, 'Completed'); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-green-600 dark:text-green-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            Mark as Completed
                                                        </button>
                                                    )}

                                                    {order.status === 'Completed' && (
                                                        <button onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, 'Delivered'); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            Mark as Delivered
                                                        </button>
                                                    )}

                                                    <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>

                                                    {order.albumId && (
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            const galleryBase = import.meta.env.VITE_GALLERY_URL || 'https://gallery.clickflash.com';
                                                            const galleryLink = order.magic_link_token
                                                                ? `${galleryBase}/gallery/?token=${order.magic_link_token}`
                                                                : `${galleryBase}/gallery/?albumId=${order.albumId}`;
                                                            const message = encodeURIComponent(
                                                                `Hi ${order.clientName}! Your photos from ClickFlash are ready.\n\nView & download here:\n${galleryLink}`
                                                            );
                                                            window.open(`https://wa.me/?text=${message}`, '_blank');
                                                            setOpenActionMenu(null);
                                                        }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-green-600 dark:text-green-400">
                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                            Send via WhatsApp
                                                        </button>
                                                    )}

                                                    <button onClick={(e) => { e.stopPropagation(); onPrintOrder(order); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                        Print Worksheet
                                                    </button>

                                                    <button onClick={(e) => { e.stopPropagation(); onPrintReceipt(order); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        Print Receipt
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </>
                            );
                        }}
                        components={{
                            Table: (props: any) => <table {...props} className="w-full text-left border-collapse" style={{ ...props.style, width: '100%' }} />,
                            // eslint-disable-next-line no-undef
                            TableHead: React.forwardRef<HTMLTableSectionElement, any>((props, ref) => <thead {...props} ref={ref} className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm" />),
                            // eslint-disable-next-line no-undef
                            TableBody: React.forwardRef<HTMLTableSectionElement, any>((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-slate-200 dark:divide-slate-700" />),
                            TableRow: (props: any) => {
                                const order = props.item as Order;
                                const isSelected = order && selectedOrderIds && selectedOrderIds.has(order.id);
                                const paymentStatus = order ? getPaymentStatus(order) : 'Pending';
                                const shouldHighlight = paymentStatusFilter !== 'All' && paymentStatus === paymentStatusFilter;

                                const isOverdue = order && (order.status === 'Pending' || order.status === 'Processing') && (() => {
                                    const createdStr = order.created_at || order.created || order.date;
                                    if (!createdStr) return false;
                                    const createdTime = new Date(createdStr).getTime();
                                    return !isNaN(createdTime) && (Date.now() - createdTime) > 30 * 60 * 1000;
                                })();
                                const isHighValue = order && order.total > 100;

                                let rowClass = 'hover:bg-slate-50 dark:hover:bg-slate-700/50';
                                if (isSelected) {
                                    rowClass = 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30';
                                } else if (isOverdue) {
                                    rowClass = 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-100/40 dark:hover:bg-red-950/30';
                                } else if (isHighValue) {
                                    rowClass = 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-100/30 dark:hover:bg-amber-950/20';
                                }

                                return (
                                    <tr
                                        {...props}
                                        className={`transition-colors cursor-pointer group ${rowClass} ${shouldHighlight ? 'ring-1 ring-inset ring-blue-400 dark:ring-blue-500' : ''}`}
                                        tabIndex={0}
                                        role="button"
                                        onClick={(e) => {
                                            if (order) onOrderClick(order);
                                            if (props.onClick) props.onClick(e);
                                        }}
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Enter' || e.key === ' ') && order) {
                                                e.preventDefault();
                                                onOrderClick(order);
                                            }
                                        }}
                                    />
                                );
                            }
                        }}
                    />
                )}
            </div>

            {/* Pagination Footer */}
            {hasNextPage && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-center bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                    <button
                        onClick={onFetchNextPage}
                        disabled={isFetchingNextPage}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-all transform active:scale-95 flex items-center gap-2"
                    >
                        {isFetchingNextPage ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                            </>
                        ) : 'Load More Orders'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrdersList;
