/**
 * Booking Service
 * 
 * Handles all CRUD operations for bookings
 */

import { pb } from '../pb';
import { PocketRecord } from '../pbTypes';
import { Booking } from '../../types';

export const bookingService = {
    /**
     * Get all bookings
     */
    async getBookings(): Promise<Booking[]> {
        const records = await pb.collection('bookings').getFullList();
        return records.map((r: PocketRecord) => ({
            id: r.id,
            clientName: r.clientName || '',
            clientEmail: r.clientEmail || '',
            clientPhone: r.clientPhone || '',
            bookingDate: r.bookingDate || '',
            bookingTime: r.bookingTime || '',
            sessionId: r.sessionId || '',
            photographerId: r.photographerId || '',
            status: r.status || 'Pending',
            notes: r.notes || ''
        }));
    },

    /**
     * Create a new booking
     */
    async createBooking(data: Partial<Booking>): Promise<Booking> {
        const record = await pb.collection('bookings').create(data);
        return record as Booking;
    },

    /**
     * Update an existing booking
     */
    async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
        const record = await pb.collection('bookings').update(id, data);
        return record as Booking;
    },

    /**
     * Delete a booking
     */
    async deleteBooking(id: string): Promise<void> {
        await pb.collection('bookings').delete(id);
    }
};

