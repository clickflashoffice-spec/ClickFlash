import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.tsx';
import { Booking, Photographer, SessionType } from '../../types';
import { bookingEditSchema } from '../modals/schemas';
import { z } from 'zod';

interface BookingEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (booking: Booking) => void;
    bookingToEdit: Booking | null;
    photographers: Photographer[];
    sessionTypes: SessionType[];
}

const BookingEditModal: React.FC<BookingEditModalProps> = ({ isOpen, onClose, onSave, bookingToEdit, photographers, sessionTypes }) => {
    const isNew = !bookingToEdit;
    const [booking, setBooking] = useState<Partial<Booking>>(
        bookingToEdit || { status: 'Pending' } as Partial<Booking>
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
    const errorStyles = "text-red-500 text-xs mt-1";


    useEffect(() => {
        setBooking(bookingToEdit || { status: 'Pending' } as Partial<Booking>);
        setErrors({});
    }, [bookingToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBooking(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePhotographerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setBooking(prev => ({ ...prev, photographerId: value || undefined }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            bookingEditSchema.parse(booking);
            setErrors({});
            onSave(booking as Booking);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                const issues = (error as any).issues || (error as any).errors || [];
                issues.forEach((err: any) => {
                    if (err.path && err.path[0]) {
                        newErrors[err.path[0].toString()] = err.message;
                    }
                });
                setErrors(newErrors);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Add New Booking" : "Edit Booking"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <input type="text" name="clientName" value={booking.clientName || ''} onChange={handleChange} placeholder="Client Name" required autoComplete="name" className={`${inputStyles} ${errors.clientName ? 'border-red-500' : ''}`} aria-label="Client Name" />
                        {errors.clientName && <p className={errorStyles}>{errors.clientName}</p>}
                    </div>
                    <div>
                        <input type="email" name="clientEmail" value={booking.clientEmail || ''} onChange={handleChange} placeholder="Client Email" required autoComplete="email" className={`${inputStyles} ${errors.clientEmail ? 'border-red-500' : ''}`} aria-label="Client Email" />
                        {errors.clientEmail && <p className={errorStyles}>{errors.clientEmail}</p>}
                    </div>
                </div>
                <div>
                    <input type="tel" name="clientPhone" value={booking.clientPhone || ''} onChange={handleChange} placeholder="Client Phone" required autoComplete="tel" className={`${inputStyles} ${errors.clientPhone ? 'border-red-500' : ''}`} aria-label="Client Phone" />
                    {errors.clientPhone && <p className={errorStyles}>{errors.clientPhone}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <input type="date" name="bookingDate" value={booking.bookingDate || ''} onChange={handleChange} required autoComplete="off" className={`${inputStyles} ${errors.bookingDate ? 'border-red-500' : ''}`} aria-label="Booking Date" />
                        {errors.bookingDate && <p className={errorStyles}>{errors.bookingDate}</p>}
                    </div>
                    <div>
                        <input type="time" name="bookingTime" value={booking.bookingTime || ''} onChange={handleChange} required autoComplete="off" className={`${inputStyles} ${errors.bookingTime ? 'border-red-500' : ''}`} aria-label="Booking Time" />
                        {errors.bookingTime && <p className={errorStyles}>{errors.bookingTime}</p>}
                    </div>
                </div>
                <div>
                    <select name="sessionId" value={booking.sessionId || ''} onChange={handleChange} required className={`${inputStyles} ${errors.sessionId ? 'border-red-500' : ''}`} aria-label="Session Type">
                        <option value="">Select Session Type</option>
                        {sessionTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {errors.sessionId && <p className={errorStyles}>{errors.sessionId}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <select name="photographerId" value={booking.photographerId || ''} onChange={handlePhotographerChange} className={`${inputStyles} ${errors.photographerId ? 'border-red-500' : ''}`} aria-label="Assign Photographer">
                            <option value="">Unassigned</option>
                            {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {errors.photographerId && <p className={errorStyles}>{errors.photographerId}</p>}
                    </div>
                    <div>
                        <select name="status" value={booking.status || 'Pending'} onChange={handleChange} required className={`${inputStyles} ${errors.status ? 'border-red-500' : ''}`} aria-label="Booking Status">
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        {errors.status && <p className={errorStyles}>{errors.status}</p>}
                    </div>
                </div>
                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Booking</button>
                </div>
            </form>
        </Modal>
    );
};

export default BookingEditModal;