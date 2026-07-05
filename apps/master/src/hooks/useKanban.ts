import { useCallback } from 'react';
import { Order } from '../types';

export const useKanban = (onUpdateStatus: (orderId: string, newStatus: Order['status']) => void) => {
    const handleDragStart = useCallback((e: React.DragEvent, orderId: string) => {
        e.dataTransfer.setData('orderId', orderId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, status: Order['status']) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('orderId');
        if (orderId) {
            onUpdateStatus(orderId, status);
        }
    }, [onUpdateStatus]);

    return {
        handleDragStart,
        handleDragOver,
        handleDrop
    };
};
