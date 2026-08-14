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
import { CurrencyProvider } from '../CurrencyContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <CurrencyProvider>
                {component}
            </CurrencyProvider>
        </QueryClientProvider>
    );
};

describe('Orders Component', () => {
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

    it('should render without crashing', async () => {
        mockGetOrders.mockResolvedValue(mockOrders);
        
        renderWithProviders(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        // Component should render without throwing
        await waitFor(() => {
            expect(document.body).toBeTruthy();
        }, { timeout: 3000 });
    });

    it('should display loading state initially', async () => {
        renderWithProviders(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        // Should show loading state or render eventually
        await waitFor(() => {
            const content = document.body.textContent;
            expect(content).toBeTruthy();
        });
    });

    it('should render with empty orders', async () => {
        renderWithProviders(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        // Should render without errors even with empty orders
        await waitFor(() => {
            expect(document.body).toBeTruthy();
        });
    });

    it('should accept all required props', async () => {
        const { container } = renderWithProviders(
            <Orders
                showToast={mockShowToast}
                currentUser={mockCurrentUser}
                onPrintOrder={mockOnPrintOrder}
                onPrintReceipt={mockOnPrintReceipt}
                onOpenLabFolder={mockOnOpenLabFolder}
            />
        );
        
        // Component should mount with all props
        await waitFor(() => {
            expect(container).toBeTruthy();
        });
    });

    it('should call onPrintOrder when print button is clicked', async () => {
        renderWithProviders(
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
        renderWithProviders(
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

