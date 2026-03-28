/**
 * Face Service Tests
 * 
 * Tests for face enrollment, face login, and face search functionality
 */

import { faceService } from '../faceService';
import { pb } from '../../pb';

// Mock the pb module
jest.mock('../../pb', () => ({
    pb: {
        request: jest.fn(),
        baseUrlValue: 'http://localhost:8090',
        authStore: {
            token: 'mock-token',
            isValid: true
        }
    }
}));

describe('Face Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerFace', () => {
        it('should successfully register a face', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            await faceService.registerFace(mockBlob);

            expect(pb.request).toHaveBeenCalledWith(
                '/api/faces/register',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );
        });

        it('should register face with userId', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            await faceService.registerFace(mockBlob, 'user-123');

            expect(pb.request).toHaveBeenCalledWith(
                '/api/faces/register',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );
        });

        it('should throw error when registration fails with error object', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: async () => ({ error: 'No face detected' })
            });

            await expect(faceService.registerFace(mockBlob)).rejects.toThrow('No face detected');
        });

        it('should throw error when registration fails with message', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: async () => ({ message: 'Face already registered' })
            });

            await expect(faceService.registerFace(mockBlob)).rejects.toThrow('Face already registered');
        });

        it('should throw error with statusText when JSON parse fails', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Internal Server Error',
                json: async () => { throw new Error('Parse error'); } // Force catch block
            });

            await expect(faceService.registerFace(mockBlob)).rejects.toThrow('Internal Server Error');
        });

        it('should throw generic error when no error info available', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: '',
                json: async () => ({}) // Empty object
            });

            await expect(faceService.registerFace(mockBlob)).rejects.toThrow('Failed to register face');
        });

        it('should throw network error when request fails', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            await expect(faceService.registerFace(mockBlob)).rejects.toThrow('Network error');
        });
    });

    describe('loginWithFace', () => {
        it('should successfully login with face', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            const mockResponse = {
                user: {
                    id: 'user-123',
                    name: 'Test User',
                    email: 'test@clickflash.ai',
                    role: 'Photographer'
                },
                token: 'jwt-token-123'
            };

            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await faceService.loginWithFace(mockBlob);

            expect(result).toEqual(mockResponse);
            expect(pb.request).toHaveBeenCalledWith(
                '/api/faces/login',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );
        });

        it('should throw error when face not recognized', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Unauthorized',
                json: async () => ({ error: 'Face not recognized' })
            });

            await expect(faceService.loginWithFace(mockBlob)).rejects.toThrow('Face not recognized');
        });

        it('should throw error for non-staff users', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Forbidden',
                json: async () => ({ error: 'Face recognition is restricted to staff only' })
            });

            await expect(faceService.loginWithFace(mockBlob)).rejects.toThrow('restricted to staff');
        });

        it('should throw error with message property', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: async () => ({ message: 'Camera access denied' })
            });

            await expect(faceService.loginWithFace(mockBlob)).rejects.toThrow('Camera access denied');
        });

        it('should throw error with statusText when JSON parse fails', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Service Unavailable',
                json: async () => { throw new Error('Parse error'); }
            });

            await expect(faceService.loginWithFace(mockBlob)).rejects.toThrow('Service Unavailable');
        });

        it('should throw generic error when no error info available', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: '',
                json: async () => ({}) // Empty object
            });

            await expect(faceService.loginWithFace(mockBlob)).rejects.toThrow('Failed to login with face');
        });

        it('should throw network error when request fails', async () => {
            const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' });
            
            (pb.request as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

            await expect(faceService.loginWithFace(mockBlob)).rejects.toThrow('Connection refused');
        });
    });
});
