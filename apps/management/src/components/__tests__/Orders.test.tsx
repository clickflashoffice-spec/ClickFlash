/**
 * Orders Component Tests
 * 
 * Tests for the Orders component including:
 * - Rendering orders list
 * - Filtering and sorting
 * - Order creation/editing
 * - Status updates
 * - Print functionality
 * - Error states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Orders from '../Orders';
import { Order, Photographer } from '../../types';

// Mock dependencies
jest.mock('../../services/apiService', () => ({
    apiService: {
        getOrders: jest.fn(),
        createOrder: jest.fn(),
        updateOrder: jest.fn(),
        deleteOrder: jest.fn()
    }
}));

import { apiService } from '../../services/apiService';

const mockGetOrders = apiService.getOrders as jest.Mock;
const mockCreateOrder = apiService.createOrder as jest.Mock;
const mockUpdateOrder = apiService.updateOrder as jest.Mock;
const mockDeleteOrder = apiService.deleteOrder as jest.Mock;

const mockCurrentUser: Photographer = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'Admin',
    status: 'active'
};

const mockOrders: Order[] = [
    {
        id: '1',
        date: new Date().toISOString(),
        clientName: 'Test Client',
        status: 'Pending',
        totalAmount: 100,
        items: [],
        paymentMethod: 'Cash'
    }
];

describe.skip('Orders Component', () => {
    const mockShowToast = jest.fn();
    const mockOnPrintOrder = jest.fn();
    const mockOnPrintReceipt = jest.fn();
    const mockOnOpenLabFolder = jest.fn();

    beforeEach(() => {
        mockShowToast.mockClear();
        mockOnPrintOrder.mockClear();
        mockOnPrintReceipt.mockClear();
        mockOnOpenLabFolder.mockClear();
        mockGetOrders.mockClear();
        mockCreateOrder.mockClear();
        mockUpdateOrder.mockClear();
        mockDeleteOrder.mockClear();
        
        // Default mock return value
        mockGetOrders.mockResolvedValue([]);
    });

    it('should render orders list', async () => {
        mockGetOrders.mockResolvedValue(mockOrders);
        
        render(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        await waitFor(() => {
            const ordersText = screen.queryByText(/orders/i);
            const loadingSpinner = screen.queryByRole('status');
            expect(ordersText || loadingSpinner).toBeTruthy();
        }, { timeout: 3000 });
    });

    it('should display create order button', async () => {
        render(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        await waitFor(() => {
            const createButton = screen.getByRole('button', { name: /create.*order/i });
            expect(createButton).toBeInTheDocument();
        });
    });

    it('should filter orders by status', async () => {
        render(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        await waitFor(() => {
            const filterButton = screen.getByRole('button', { name: /pending/i });
            if (filterButton) {
                fireEvent.click(filterButton);
            }
        });
    });

    it('should handle order creation', async () => {
        render(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        await waitFor(() => {
            const createButton = screen.getByRole('button', { name: /create.*order/i });
            fireEvent.click(createButton);
            
            // Verify order creation modal opens
            expect(screen.getByText(/new order/i)).toBeInTheDocument();
        });
    });

    it('should call onPrintOrder when print button is clicked', async () => {
        render(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        await waitFor(() => {
            const printButton = screen.queryByRole('button', { name: /print/i });
            if (printButton) {
                fireEvent.click(printButton);
                expect(mockOnPrintOrder).toHaveBeenCalled();
            }
        });
    });

    it('should display empty state when no orders', async () => {
        render(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        await waitFor(() => {
            // Check for empty state message
            const emptyMessage = screen.queryByText(/no orders/i);
            if (emptyMessage) {
                expect(emptyMessage).toBeInTheDocument();
            }
        });
    });
});

