/**
 * User/Photographer Service
 * 
 * Handles all CRUD operations for users/photographers
 */

import { pb } from '../pb';
import { PocketRecord } from '../pbTypes';
import { Photographer } from '../../types';

export const userService = {
    /**
     * Get a single user by ID
     */
    async getUser(id: string): Promise<Photographer & { faceDescriptor?: string }> {
        const record = await pb.collection('users').getOne(id);
        return {
            id: record.id,
            name: record.name,
            email: record.email,
            role: record.role,
            specialty: record.specialty,
            avatarUrl: record.avatarUrl,
            monthlyTarget: record.monthlyTarget,
            dailyPhotoTarget: record.dailyPhotoTarget,
            payrollType: record.payrollType,
            monthlySalary: record.monthlySalary,
            commissionRate: record.commissionRate,
            destinationId: record.destinationId,
            workingHours: record.workingHours,
            faceDescriptor: record.faceDescriptor
        } as Photographer & { faceDescriptor?: string };
    },

    /**
     * Get all users/photographers
     */
    async getUsers(): Promise<Photographer[]> {
        const records = await pb.collection('users').getFullList();
        return records.map((r: PocketRecord) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password,
            role: r.role,
            specialty: r.specialty,
            avatarUrl: r.avatarUrl,
            monthlyTarget: r.monthlyTarget,
            dailyPhotoTarget: r.dailyPhotoTarget,
            payrollType: r.payrollType,
            monthlySalary: r.monthlySalary,
            commissionRate: r.commissionRate,
            destinationId: r.destinationId,
            workingHours: r.workingHours,
            faceDescriptor: r.faceDescriptor
        }));
    },

    /**
     * Create a new user/photographer
     */
    async createUser(data: Partial<Photographer>): Promise<Photographer> {
        const record = await pb.collection('users').create(data);
        return record as Photographer;
    },

    /**
     * Update an existing user/photographer
     */
    async updateUser(id: string | number, data: Partial<Photographer>): Promise<Photographer> {
        const record = await pb.collection('users').update(String(id), data);
        return record as Photographer;
    },

    /**
     * Delete a user/photographer
     */
    async deleteUser(id: string | number): Promise<void> {
        await pb.collection('users').delete(String(id));
    },

    /**
     * Get ledger entries for a photographer (or all if no ID provided)
     */
    async getLedger(photographerId?: string | number): Promise<any[]> {
        const filter = photographerId ? `photographer_id = "${photographerId}"` : '';
        const records = await pb.collection('photographer_ledger').getFullList({
            filter,
            sort: '-created_at'
        });
        return records;
    }
};

