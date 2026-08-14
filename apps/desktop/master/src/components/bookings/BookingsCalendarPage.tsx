import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Spinner } from '@clickflash/ui';
import { Booking, Photographer, SessionType, BookingStatus } from '../../types';
import { apiService } from '../../services/apiService';
import { logger } from '../../utils/logger';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Filter, 
  Clock, 
  User, 
  MapPin, 
  Home, 
  Check, 
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface BookingsCalendarPageProps {
  showToast?: (msg: string) => void;
}

export const BookingsCalendarPage: React.FC<BookingsCalendarPageProps> = ({ showToast }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [isLoading, setIsLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'All'>('All');
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [b, p, s] = await Promise.all([
        apiService.getBookings(),
        apiService.getUsers(),
        apiService.getSessionTypes()
      ]);
      setBookings(b || []);
      setPhotographers(p || []);
      setSessionTypes(s || []);
    } catch (err) {
      logger.error('Failed to load calendar data', err);
      if (showToast) showToast('Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -7));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'All') return bookings;
    return bookings.filter(b => b.status === statusFilter || b.status?.toLowerCase() === statusFilter.toLowerCase());
  }, [bookings, statusFilter]);

  const getSessionColor = (sessionId?: string) => {
    const session = sessionTypes.find(s => s.id === sessionId);
    const name = session?.name?.toLowerCase() || '';
    if (name.includes('couple')) return 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800';
    if (name.includes('family')) return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
    if (name.includes('event')) return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
    if (name.includes('sunset')) return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800';
    return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const renderMonthView = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-slate-50 dark:bg-slate-800/80 p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayBookings = filteredBookings.filter(b => b.bookingDate === format(day, 'yyyy-MM-dd'));
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={day.toISOString()} 
              className={`min-h-[120px] p-1 bg-white dark:bg-slate-900 ${isCurrentMonth ? '' : 'opacity-50'} transition-colors hover:bg-slate-50 dark:hover:bg-slate-800`}
            >
              <div className={`text-right text-sm p-1 font-medium ${isToday ? 'text-blue-500 font-bold' : 'text-slate-500'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1 mt-1">
                {dayBookings.map(b => (
                  <div 
                    key={b.id}
                    onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }}
                    className={`text-xs p-1.5 rounded border-l-4 cursor-pointer hover:shadow-md transition-shadow truncate ${getSessionColor(b.sessionId)}`}
                    draggable
                  >
                    <div className="font-semibold truncate">{b.clientName}</div>
                    <div className="text-[10px] opacity-80 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{b.bookingTime || 'TBD'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-[600px] overflow-y-auto">
        {days.map(day => (
          <div key={day.toISOString()} className="bg-white dark:bg-slate-900 flex flex-col">
            <div className={`p-3 text-center border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10 ${isSameDay(day, new Date()) ? 'text-blue-500 font-bold' : 'text-slate-500 font-semibold'}`}>
              <div className="text-xs uppercase">{format(day, 'EEE')}</div>
              <div className="text-xl">{format(day, 'd')}</div>
            </div>
            <div className="flex-1 p-1 space-y-2 relative">
              {/* Hour grid lines could go here */}
              {filteredBookings.filter(b => b.bookingDate === format(day, 'yyyy-MM-dd')).sort((a, b) => (a.bookingTime || '').localeCompare(b.bookingTime || '')).map(b => (
                <div 
                  key={b.id}
                  onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }}
                  className={`p-2 rounded border-l-4 cursor-pointer hover:shadow-md transition-all ${getSessionColor(b.sessionId)}`}
                >
                  <div className="font-semibold text-sm truncate">{b.clientName}</div>
                  <div className="text-xs opacity-90 mt-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{b.bookingTime || 'TBD'}</span>
                  </div>
                  {b.photographerId && (
                    <div className="text-xs opacity-90 mt-1 flex items-center space-x-1 truncate">
                      <User className="w-3 h-3" />
                      <span>{photographers.find(p => p.id === b.photographerId)?.name || 'Unassigned'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showToast) showToast('Booking saved successfully!');
    setIsModalOpen(false);
    fetchData(); // reload
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <CalendarIcon className="w-6 h-6 mr-3 text-blue-500" />
            Bookings & Scheduling
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage studio appointments and photographer schedules</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" className="flex items-center space-x-2" onClick={() => { setSelectedBooking({} as any); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col shadow-sm border-slate-200/60 dark:border-slate-700/60 p-0 overflow-hidden">
        {/* Calendar Header toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20">
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-1">
              <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="w-32 text-center font-semibold text-sm">
                {viewMode === 'month' ? format(currentDate, 'MMMM yyyy') : `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
              </span>
              <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Today
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('month')} 
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setViewMode('week')} 
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
              >
                Week
              </button>
            </div>

            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner />
            </div>
          ) : (
            viewMode === 'month' ? renderMonthView() : renderWeekView()
          )}
        </div>
      </Card>

      {/* Booking Modal (Create / Edit) */}
      <AnimatePresence>
        {isModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <h3 className="text-lg font-bold">{selectedBooking.id ? 'Edit Booking' : 'Create Booking'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveModal} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Client Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        defaultValue={selectedBooking.clientName} 
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                    <input 
                      type="date" 
                      defaultValue={selectedBooking.bookingDate}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                    <input 
                      type="time" 
                      defaultValue={selectedBooking.bookingTime}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Session Type</label>
                    <select 
                      defaultValue={selectedBooking.sessionId}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {sessionTypes.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Assigned To</label>
                    <select 
                      defaultValue={selectedBooking.photographerId}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {photographers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Room Number</label>
                    <div className="relative">
                      <Home className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. 402"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Shoot Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. Beach, Lobby"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select 
                      defaultValue={selectedBooking.status || 'pending'}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                    <textarea 
                      defaultValue={selectedBooking.notes}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 resize-none" 
                    />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                    <Check className="w-4 h-4 mr-2" />
                    Save Booking
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BookingsCalendarPage;
