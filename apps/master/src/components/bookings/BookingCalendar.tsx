import { Card } from "@clickflash/ui";
import React, { useState } from 'react';
import { Booking, Photographer, SessionType, BookingStatus } from '../../types';

interface BookingCalendarProps {
    bookings: Booking[];
    photographers: Photographer[];
    sessionTypes: SessionType[];
    onBookingClick: (booking: Booking) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ bookings, photographers, sessionTypes, onBookingClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days: (Date | null)[] = [];
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        
        const startDayOfWeek = firstDay.getDay();
        const daysToPadStart = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1;
        for (let i = 0; i < daysToPadStart; i++) {
            days.unshift(null);
        }

        return days;
    };

    const days = getDaysInMonth(currentDate);
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const getBookingsForDay = (day: Date | null) => {
        if (!day) return [];
        return bookings.filter(b => b.bookingDate === day.toISOString().split('T')[0]);
    };

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-l-4 border-green-500';
            case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border-l-4 border-yellow-500';
            case 'cancelled': return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-l-4 border-red-500';
            default: return 'bg-slate-100 dark:bg-slate-700/50';
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">&larr;</button>
                <h2 className="text-xl font-bold">{monthName} {year}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">&rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                {weekdays.map(day => (
                    <div key={day} className="text-center font-bold p-2 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">{day}</div>
                ))}
                {days.map((day, index) => {
                    const dayBookings = getBookingsForDay(day);
                    const isToday = day && day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                    return (
                    <div key={index} className="bg-white dark:bg-slate-800 p-1 min-h-[120px]">
                        {day && (
                            <>
                                <div className={`text-right font-semibold text-sm pr-1 ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>{day.getDate()}</div>
                                <div className="space-y-1 mt-1">
                                    {dayBookings.map(booking => {
                                        const session = sessionTypes.find(s => s.id === booking.sessionId);
                                        const photographer = photographers.find(p => p.id === booking.photographerId);
                                        return (
                                        <div key={booking.id} onClick={() => onBookingClick(booking)} className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-80 ${getStatusColor(booking.status)}`}>
                                            <p className="font-bold truncate">{booking.clientName}</p>
                                            <p className="truncate text-slate-600 dark:text-slate-400">{session?.name}</p>
                                            <p className="truncate font-medium">{photographer?.name || <span className="text-yellow-500">Unassigned</span>}</p>
                                        </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default BookingCalendar;
