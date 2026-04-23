/**
 * Login Component Face Login Tests
 * 
 * Tests for Face ID login functionality in the Login component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import { apiService } from '../../services/apiService';

// Mock the API service
jest.mock('../../services/apiService', () => ({
    apiService: {
        loginWithFace: jest.fn(),
        getLogoUrl: jest.fn(() => 'http://localhost/logo.png')
    }
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

// Mock FaceScanModal
jest.mock('../modals/FaceScanModal', () => {
    return function MockFaceScanModal({ isOpen, onClose, onScan, title }: any) {
        if (!isOpen) return null;
        return (
            <div data-testid="face-scan-modal">
                <h3>{title}</h3>
                <button onClick={() => onScan(new Blob(['test']))} data-testid="face-capture-btn">
                    Capture Face
                </button>
                <button onClick={onClose} data-testid="face-close-btn">Cancel</button>
            </div>
        );
    };
});

describe('Login Component - Face Login', () => {
    const defaultProps = {
        portalName: 'Master Portal',
        onLoginSuccess: jest.fn(),
        authService: {
            getUsers: jest.fn(),
            loginUser: jest.fn()
        },
        onBack: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Face ID login button', () => {
        render(<Login {...defaultProps} />);

        expect(screen.getByRole('button', { name: /sign in with face id/i })).toBeInTheDocument();
    });

    it('opens face scan modal when Face ID button is clicked', () => {
        render(<Login {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /sign in with face id/i }));

        expect(screen.getByTestId('face-scan-modal')).toBeInTheDocument();
        expect(screen.getByText('Login with Face ID')).toBeInTheDocument();
    });

    it('successfully logs in with face for authorized staff', async () => {
        const mockUser = {
            id: 'user-123',
            name: 'Test Photographer',
            email: 'test@clickflash.ai',
            role: 'Photographer'
        };

        (apiService.loginWithFace as jest.Mock).mockResolvedValueOnce({
            user: mockUser,
            token: 'jwt-token'
        });

        render(<Login {...defaultProps} />);

        // Open face login modal
        fireEvent.click(screen.getByRole('button', { name: /sign in with face id/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('face-capture-btn'));

        await waitFor(() => {
            expect(defaultProps.onLoginSuccess).toHaveBeenCalledWith(mockUser);
        });
    });

    it('shows error for staff without portal permissions', async () => {
        const mockUser = {
            id: 'user-123',
            name: 'Unauthorized User',
            email: 'unauthorized@clickflash.ai',
            role: 'Customer' // Not a staff role
        };

        (apiService.loginWithFace as jest.Mock).mockResolvedValueOnce({
            user: mockUser,
            token: 'jwt-token'
        });

        render(<Login {...defaultProps} portalName="Master Portal" />);

        // Open face login modal
        fireEvent.click(screen.getByRole('button', { name: /sign in with face id/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('face-capture-btn'));

        await waitFor(() => {
            expect(screen.getByText(/Access Denied: Insufficient permissions/)).toBeInTheDocument();
        });

        expect(defaultProps.onLoginSuccess).not.toHaveBeenCalled();
    });

    it('shows error when face is not recognized', async () => {
        (apiService.loginWithFace as jest.Mock).mockRejectedValueOnce(
            new Error('Face not recognized')
        );

        render(<Login {...defaultProps} />);

        // Open face login modal
        fireEvent.click(screen.getByRole('button', { name: /sign in with face id/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('face-capture-btn'));

        await waitFor(() => {
            expect(screen.getByText(/Face not recognized/)).toBeInTheDocument();
        });
    });

    it('allows Management Portal access for management roles only', async () => {
        const mockManager = {
            id: 'user-123',
            name: 'Manager',
            email: 'manager@clickflash.ai',
            role: 'Manager'
        };

        (apiService.loginWithFace as jest.Mock).mockResolvedValueOnce({
            user: mockManager,
            token: 'jwt-token'
        });

        render(<Login {...defaultProps} portalName="Management Portal" />);

        // Open face login modal
        fireEvent.click(screen.getByRole('button', { name: /sign in with face id/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('face-capture-btn'));

        await waitFor(() => {
            expect(defaultProps.onLoginSuccess).toHaveBeenCalledWith(mockManager);
        });
    });

    it('denies Management Portal access for Photographer role', async () => {
        const mockPhotographer = {
            id: 'user-123',
            name: 'Photographer',
            email: 'photographer@clickflash.ai',
            role: 'Photographer' // Not allowed in Management Portal
        };

        (apiService.loginWithFace as jest.Mock).mockResolvedValueOnce({
            user: mockPhotographer,
            token: 'jwt-token'
        });

        render(<Login {...defaultProps} portalName="Management Portal" />);

        // Open face login modal
        fireEvent.click(screen.getByRole('button', { name: /sign in with face id/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('face-capture-btn'));

        await waitFor(() => {
            expect(screen.getByText(/Access Denied: Insufficient permissions/)).toBeInTheDocument();
        });
    });
});
