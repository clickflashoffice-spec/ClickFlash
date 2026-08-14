import { pb } from '../pb';
import { CollectionOptions } from '../pbTypes';
import { DailyObjective } from '../../types';
import { logger } from '@/utils/logger';

export const objectiveService = {
    // Get all objectives (optionally filtered by photographer)
    async getAll(photographerId?: string): Promise<DailyObjective[]> {
        try {
            const params: CollectionOptions = { sort: '-date', perPage: 100 }; // Reasonable limit
            if (photographerId) {
                // Backend supports simple single-field filtering
                params.filter = `photographer_id = "${photographerId}"`;
            }
            const records = await pb.collection('daily_objectives').getFullList(params);
            return records as unknown as DailyObjective[];
        } catch (error) {
            logger.error('Error fetching objectives:', error);
            return [];
        }
    },

    // Get objective for specific date
    async getObjectiveForDate(photographerId: string, date: string): Promise<DailyObjective | undefined> {
        // Fetch all (latest first) and find match client-side
        // This avoids backend limitation with complex AND queries
        const all = await this.getAll(photographerId);
        return all.find(obj => obj.date === date);
    },

    // Create or Update an objective
    async setObjective(photographerId: string, target: number, date: string): Promise<DailyObjective> {
        try {
            // Check if one exists for this date/photographer using robust client-side check
            const existing = await this.getObjectiveForDate(photographerId, date);

            if (existing) {
                // Update
                return await pb.collection('daily_objectives').update(existing.id, {
                    target,
                    status: existing.status
                }) as unknown as DailyObjective;
            } else {
                // Create
                return await pb.collection('daily_objectives').create({
                    photographer_id: photographerId,
                    date,
                    target,
                    status: 'Pending'
                }) as unknown as DailyObjective;
            }
        } catch (err) {
            logger.error('Set objective error:', err);
            throw err;
        }
    },

    async updateStatus(id: string, status: 'Pending' | 'Completed'): Promise<DailyObjective> {
        return await pb.collection('daily_objectives').update(id, { status });
    }
};
