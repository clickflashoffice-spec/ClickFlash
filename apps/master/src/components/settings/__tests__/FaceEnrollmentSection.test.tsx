/**
 * Face Enrollment Section Component Tests
 * 
 * Tests for the Face Enrollment UI component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FaceEnrollmentSection from '../FaceEnrollmentSection';
import { faceService } from '../../../services/api/faceService';

// Mock the face service
jest.mock('../../../services/api/faceService', () => ({
    faceService: {
        registerFace: jest.fn()
    }
}));

// Mock the logger
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

// Mock FaceScanModal
jest.mock('../../modals/FaceScanModal', () => {
    return function MockFaceScanModal({ isOpen, onClose, onScan, title }: any) {
        if (!isOpen) return null;
        return (
            <div data-testid="face-scan-modal">
                <h3>{title}</h3>
                <button onClick={() => onScan(new Blob(['test']))} data-testid="capture-btn">
                    Capture
                </button>
                <button onClick={onClose} data-testid="close-btn">Close</button>
            </div>
        );
    };
});

describe('FaceEnrollmentSection', () => {
    const defaultProps = {
        userId: 'user-123',
        userName: 'Test Photographer',
        hasFaceRegistered: false,
        onEnrollmentComplete: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders enrollment prompt when no face is registered', () => {
        render(<FaceEnrollmentSection {...defaultProps} />);

        expect(screen.getByText('Face ID Not Registered')).toBeInTheDocument();
        expect(screen.getByText(/Register Test Photographer's face to enable Face ID login/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enroll face/i })).toBeInTheDocument();
    });

    it('renders registered state when face is already enrolled', () => {
        render(<FaceEnrollmentSection {...defaultProps} hasFaceRegistered={true} />);

        expect(screen.getByText('Face ID Registered')).toBeInTheDocument();
        expect(screen.getByText(/Test Photographer can log in using face recognition/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /re-enroll face/i })).toBeInTheDocument();
    });

    it('opens face scan modal when enroll button is clicked', async () => {
        render(<FaceEnrollmentSection {...defaultProps} />);

        const enrollButton = screen.getByRole('button', { name: /enroll face/i });
        fireEvent.click(enrollButton);

        expect(screen.getByTestId('face-scan-modal')).toBeInTheDocument();
        expect(screen.getByText('Enroll Face for Test Photographer')).toBeInTheDocument();
    });

    it('successfully enrolls face and shows success message', async () => {
        (faceService.registerFace as jest.Mock).mockResolvedValueOnce(undefined);

        render(<FaceEnrollmentSection {...defaultProps} />);

        // Open modal
        fireEvent.click(screen.getByRole('button', { name: /enroll face/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('capture-btn'));

        await waitFor(() => {
            expect(screen.getByText(/Face registered successfully/)).toBeInTheDocument();
        });

        expect(faceService.registerFace).toHaveBeenCalled();
        expect(defaultProps.onEnrollmentComplete).toHaveBeenCalled();
    });

    it('shows error message when enrollment fails', async () => {
        (faceService.registerFace as jest.Mock).mockRejectedValueOnce(
            new Error('No face detected in image')
        );

        render(<FaceEnrollmentSection {...defaultProps} />);

        // Open modal
        fireEvent.click(screen.getByRole('button', { name: /enroll face/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('capture-btn'));

        await waitFor(() => {
            expect(screen.getByText(/No face detected in image/)).toBeInTheDocument();
        });
    });

    it('closes modal when close button is clicked', async () => {
        render(<FaceEnrollmentSection {...defaultProps} />);

        // Open modal
        fireEvent.click(screen.getByRole('button', { name: /enroll face/i }));
        expect(screen.getByTestId('face-scan-modal')).toBeInTheDocument();

        // Close modal
        fireEvent.click(screen.getByTestId('close-btn'));
        expect(screen.queryByTestId('face-scan-modal')).not.toBeInTheDocument();
    });

    it('disables button while processing', async () => {
        (faceService.registerFace as jest.Mock).mockImplementation(
            () => new Promise(resolve => setTimeout(resolve, 100))
        );

        render(<FaceEnrollmentSection {...defaultProps} />);

        // Open modal
        fireEvent.click(screen.getByRole('button', { name: /enroll face/i }));

        // Capture face
        fireEvent.click(screen.getByTestId('capture-btn'));

        // Button should show loading state
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
        });
    });

    it('displays security information', () => {
        render(<FaceEnrollmentSection {...defaultProps} />);

        expect(screen.getByText(/Face data is stored securely/)).toBeInTheDocument();
    });
});
