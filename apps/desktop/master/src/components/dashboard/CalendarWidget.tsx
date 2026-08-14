import { Card, Spinner } from "@clickflash/ui";
import React, { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { bookingService } from '../../services/api/bookingService';
import { Booking } from '../../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getWeekDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const CalendarWidget: React.FC = memo(() => {
  const { data: bookings = [], isLoading, isError } = useQuery<Booking[]>({
    queryKey: ['bookings', 'calendar'],
    queryFn: () => bookingService.getBookings(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const weekDays = useMemo(getWeekDays, []);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    weekDays.forEach(d => map.set(d.toDateString(), []));
    bookings.forEach(b => {
      if (!b.bookingDate) return;
      const bd = new Date(b.bookingDate);
      if (isNaN(bd.getTime())) return;
      const key = bd.toDateString();
      if (map.has(key)) {
        map.get(key)!.push(b);
      }
    });
    return map;
  }, [bookings, weekDays]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Upcoming Bookings
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {MONTHS[today.getMonth()]} {today.getFullYear()}
        </span>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {isError && (
        <p className="text-xs text-red-500 dark:text-red-400 text-center py-4">
          Failed to load bookings
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase pb-1">
              {d}
            </div>
          ))}

          {/* Day cells */}
          {weekDays.map(day => {
            const dayBookings = bookingsByDay.get(day.toDateString()) ?? [];
            const isToday = isSameDay(day, today);
            const hasPending = dayBookings.some(b => b.status === 'pending');
            const hasConfirmed = dayBookings.some(b => b.status === 'confirmed');

            return (
              <div
                key={day.toDateString()}
                title={dayBookings.map(b => `${b.clientName} — ${b.bookingTime || 'TBD'}`).join('\n') || 'No bookings'}
                className={`
                  relative flex flex-col items-center justify-center p-1 rounded-lg text-center min-h-[52px] transition-colors
                  ${isToday
                    ? 'bg-cyan-500 dark:bg-cyan-600 text-white shadow-md'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                  }
                `}
              >
                <span className={`text-xs font-bold ${isToday ? 'text-white' : ''}`}>
                  {day.getDate()}
                </span>
                {dayBookings.length > 0 && (
                  <div className="flex gap-0.5 mt-1 justify-center flex-wrap">
                    {hasConfirmed && (
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    )}
                    {hasPending && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </div>
                )}
                {dayBookings.length > 1 && (
                  <span className={`text-[9px] mt-0.5 font-medium ${isToday ? 'text-cyan-100' : 'text-slate-400'}`}>
                    {dayBookings.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Pending</span>
          </div>
          <div className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">
            {bookings.length} total booked
          </div>
        </div>
      )}
    </Card>
  );
});

CalendarWidget.displayName = 'CalendarWidget';
export default CalendarWidget;
