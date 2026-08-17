// @vitest-environment jsdom
import { vi, describe, it, test, expect, beforeEach } from 'vitest';
/**
 * User Service Tests
 * 
 * Tests for user CRUD operations and face enrollment status
 */

import { userService } from '../userService';
import { mockCollection, resetPbMocks } from '../../__mocks__/pb';

vi.mock('../../pb', () => ({
    pb: {
        collection: vi.fn(() => mockCollection),
    }
}));

describe('User Service', () => {
    beforeEach(() => {
        resetPbMocks();
    });

    describe('getUser', () => {
        it('should fetch a single user with face descriptor', async () => {
            const mockUser = {
                id: 'user-123',
                name: 'Test Photographer',
                email: 'test@clickflash.ai',
                role: 'Photographer',
                specialty: 'Portrait',
                avatarUrl: 'http://example.com/avatar.jpg',
                monthlyTarget: 5000,
                dailyPhotoTarget: 50,
                payrollType: 'Commission',
                monthlySalary: 0,
                commissionRate: 0.15,
                destinationId: 'dest-123',
                workingHours: JSON.stringify({ start: '09:00', end: '17:00' }),
                faceDescriptor: JSON.stringify([0.1, 0.2, 0.3, 0.4])
            };

            mockCollection.getOne.mockResolvedValueOnce(mockUser);

            const result = await userService.getUser('user-123');

            expect(mockCollection.getOne).toHaveBeenCalledWith('user-123');
            expect(result).toMatchObject({
                id: 'user-123',
                name: 'Test Photographer',
                email: 'test@clickflash.ai',
                faceDescriptor: JSON.stringify([0.1, 0.2, 0.3, 0.4])
            });
        });

        it('should fetch user without face descriptor', async () => {
            const mockUser = {
                id: 'user-456',
                name: 'No Face User',
                email: 'noface@clickflash.ai',
                role: 'Photographer',
                faceDescriptor: null
            };

            mockCollection.getOne.mockResolvedValueOnce(mockUser);

            const result = await userService.getUser('user-456');

            expect(result.faceDescriptor).toBeNull();
        });

        it('should throw error when user not found', async () => {
            mockCollection.getOne.mockRejectedValueOnce(new Error('User not found'));

            await expect(userService.getUser('nonexistent')).rejects.toThrow('User not found');
        });
    });

    describe('getUsers', () => {
        it('should fetch all users', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    name: 'User One',
                    email: 'user1@clickflash.ai',
                    role: 'Photographer',
                    specialty: 'Portrait'
                },
                {
                    id: 'user-2',
                    name: 'User Two',
                    email: 'user2@clickflash.ai',
                    role: 'Manager',
                    specialty: 'Event'
                }
            ];

            mockCollection.getFullList.mockResolvedValueOnce(mockUsers);

            const result = await userService.getUsers();

            expect(mockCollection.getFullList).toHaveBeenCalled();
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('User One');
        });
    });

    describe('createUser', () => {
        it('should create a new user', async () => {
            const newUser = {
                name: 'New User',
                email: 'new@clickflash.ai',
                role: 'Photographer' as const,
                specialty: 'Wedding',
                password: 'secureDEFAULT_PASSWORD_PLACEHOLDER'
            };

            const mockCreatedUser = {
                id: 'user-new',
                ...newUser
            };

            mockCollection.create.mockResolvedValueOnce(mockCreatedUser);

            const result = await userService.createUser(newUser);

            expect(mockCollection.create).toHaveBeenCalledWith(newUser);
            expect(result.id).toBe('user-new');
        });
    });

    describe('updateUser', () => {
        it('should update user face descriptor', async () => {
            const updates = {
                faceDescriptor: JSON.stringify([0.5, 0.6, 0.7, 0.8])
            };

            const mockUpdatedUser = {
                id: 'user-123',
                name: 'Test User',
                faceDescriptor: updates.faceDescriptor
            };

            mockCollection.update.mockResolvedValueOnce(mockUpdatedUser);

            const result = await userService.updateUser('user-123', updates);

            expect(mockCollection.update).toHaveBeenCalledWith('user-123', updates);
            expect(result.faceDescriptor).toBe(updates.faceDescriptor);
        });

        it('should update user profile information', async () => {
            const updates = {
                name: 'Updated Name',
                specialty: 'Fashion',
                monthlyTarget: 10000
            };

            mockCollection.update.mockResolvedValueOnce({
                id: 'user-123',
                ...updates
            });

            await userService.updateUser('user-123', updates);

            expect(mockCollection.update).toHaveBeenCalledWith('user-123', updates);
        });
    });

    describe('deleteUser', () => {
        it('should delete a user with string ID', async () => {
            mockCollection.delete.mockResolvedValueOnce(true);

            await userService.deleteUser('user-123');

            expect(mockCollection.delete).toHaveBeenCalledWith('user-123');
        });

        it('should delete a user with number ID', async () => {
            mockCollection.delete.mockResolvedValueOnce(true);

            await userService.deleteUser(456);

            expect(mockCollection.delete).toHaveBeenCalledWith('456');
        });
    });

    describe('getLedger', () => {
        it('should get ledger entries for a photographer with string ID', async () => {
            const mockLedger = [
                { id: 'ledger-1', photographer_id: 'photog-1', amount: 100 },
                { id: 'ledger-2', photographer_id: 'photog-1', amount: 200 }
            ];

            mockCollection.getFullList.mockResolvedValueOnce(mockLedger);

            const result = await userService.getLedger('photog-1');

            expect(mockCollection.getFullList).toHaveBeenCalledWith(expect.objectContaining({
                filter: 'photographer_id = "photog-1"',
                sort: '-created_at'
            }));
            expect(result).toHaveLength(2);
        });

        it('should get ledger entries for a photographer with number ID', async () => {
            const mockLedger = [
                { id: 'ledger-1', photographer_id: '123', amount: 100 }
            ];

            mockCollection.getFullList.mockResolvedValueOnce(mockLedger);

            const result = await userService.getLedger(123);

            expect(mockCollection.getFullList).toHaveBeenCalledWith(expect.objectContaining({
                filter: 'photographer_id = "123"',
                sort: '-created_at'
            }));
            expect(result).toHaveLength(1);
        });

        it('should get all ledger entries when no photographer ID', async () => {
            const mockLedger = [
                { id: 'ledger-1', photographer_id: 'photog-1' },
                { id: 'ledger-2', photographer_id: 'photog-2' }
            ];

            mockCollection.getFullList.mockResolvedValueOnce(mockLedger);

            const result = await userService.getLedger();

            expect(mockCollection.getFullList).toHaveBeenCalledWith(expect.objectContaining({
                filter: '',
                sort: '-created_at'
            }));
            expect(result).toHaveLength(2);
        });

        it('should handle empty ledger', async () => {
            mockCollection.getFullList.mockResolvedValueOnce([]);

            const result = await userService.getLedger('photog-999');

            expect(result).toEqual([]);
        });

        it('should handle ledger with different entry types', async () => {
            const mockLedger = [
                { id: 'ledger-1', photographer_id: 'photog-1', type: 'commission', amount: 50 },
                { id: 'ledger-2', photographer_id: 'photog-1', type: 'bonus', amount: 100 },
                { id: 'ledger-3', photographer_id: 'photog-1', type: 'deduction', amount: -25 }
            ];

            mockCollection.getFullList.mockResolvedValueOnce(mockLedger);

            const result = await userService.getLedger('photog-1');

            expect(result).toHaveLength(3);
            expect(result[0].type).toBe('commission');
            expect(result[1].type).toBe('bonus');
            expect(result[2].type).toBe('deduction');
        });

        it('should sort ledger by created_at descending', async () => {
            const mockLedger = [
                { id: 'ledger-1', created_at: '2026-03-15' },
                { id: 'ledger-2', created_at: '2026-03-14' }
            ];

            mockCollection.getFullList.mockResolvedValueOnce(mockLedger);

            await userService.getLedger('photog-1');

            expect(mockCollection.getFullList).toHaveBeenCalledWith(
                expect.objectContaining({ sort: '-created_at' })
            );
        });
    });
});
