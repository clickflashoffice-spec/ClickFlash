import React, { useState } from 'react';
import { Order, Photographer } from '../types.ts';
import { useInfiniteOrders, useUpdateOrder } from '../hooks/useOrders';
import OrdersBoard from './orders/OrdersBoard';
import { orderService } from '../services/api/orderService';
import { OrderCardSkeleton } from './common/AppSkeletons';
import OrderEditModal from './modals/OrderEditModal';

interface FulfillmentViewProps {
    showToast: (message: string) => void;
    currentUser: Photographer;
    onPrintOrder: (order: Order) => void;
    onPrintReceipt: (order: Order) => void;
    externalFilter?: string;
}

const FulfillmentView: React.FC<FulfillmentViewProps> = ({ showToast, onPrintOrder, onPrintReceipt, externalFilter }) => {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const updateOrderMutation = useUpdateOrder();

    // Fetch orders with fulfillment-relevant statuses
    const baseFilter = 'status="Pending" || status="Processing" || status="Completed"';
    const filterString = externalFilter ? `(${baseFilter}) && ${externalFilter}` : baseFilter;

    const {
        data,
        isLoading,
        error,
        refetch
    } = useInfiniteOrders(filterString);

    const orders = data?.pages.flatMap(p => p.items) || [];

    const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
        try {
            await orderService.updateOrderStatus(orderId, newStatus);
            showToast(`Order status updated to ${newStatus}`);
            refetch();
        } catch (err) {
            showToast('Failed to update status');
        }
    };

    const handleDownloadSlip = async (orderId: string) => {
        try {
            showToast('Generating production slip...');
            await orderService.getOrderProductionSlip(orderId);
            showToast('Slip downloaded successfully.');
        } catch (err) {
            showToast('Failed to generate slip');
        }
    };

    const handleSaveOrder = async (updatedOrder: Order) => {
        try {
            await updateOrderMutation.mutateAsync({
                id: updatedOrder.id,
                data: updatedOrder
            });
            setSelectedOrder(null);
            showToast(`Order ${updatedOrder.id} saved.`);
            refetch();
        } catch (err) {
            showToast('Failed to save order');
        }
    };

    if (error) {
        return (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-red-200 dark:border-red-900/50">
                <p className="text-red-500 font-medium">Error loading fulfillment lab data.</p>
                <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Retry Connection</button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            <div className="flex-grow min-h-0 overflow-hidden">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
                    </div>
                ) : (
                    <OrdersBoard
                        orders={orders}
                        onUpdateStatus={handleStatusChange}
                        onOrderClick={setSelectedOrder}
                        onDownloadSlip={handleDownloadSlip}
                    />
                )}
            </div>

            {selectedOrder && (
                <OrderEditModal
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    order={selectedOrder}
                    onSave={handleSaveOrder}
                    showToast={showToast}
                    onPrintOrder={onPrintOrder}
                    onPrintReceipt={onPrintReceipt}
                />
            )}
        </div>
    );
};

export default FulfillmentView;
