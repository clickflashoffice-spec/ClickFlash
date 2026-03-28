import React, { useState } from 'react';
import { apiService } from '../../services/apiService.ts';
import { MOCK_SESSION_TYPES } from '../../constants.ts';
import OnScreenKeyboard from './OnScreenKeyboard';
import BookingSuccessScreen from './BookingSuccessScreen';
import { useCurrency } from '../CurrencyContext.tsx';

interface BookingScreenProps {
    onBack: () => void;
    onBookingSuccess: () => void;
}

const BookingScreen: React.FC<BookingScreenProps> = ({ onBack, onBookingSuccess }) => {
    const [details, setDetails] = useState({ name: '', email: '', phone: '', date: '', time: '', sessionId: '' });
    const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'phone' | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [bookingId, setBookingId] = useState('');
    const { formatCurrency } = useCurrency();

    const handleInputChange = (field: 'name' | 'email' | 'phone', value: string) => {
        setDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newBooking = await apiService.createBooking({
                clientName: details.name,
                clientEmail: details.email,
                clientPhone: details.phone,
                bookingDate: details.date,
                bookingTime: details.time,
                sessionId: details.sessionId,
                photographerId: 0, // Unassigned for now
                destinationId: 'dest1',
                status: 'Pending',
            });
            setBookingId(newBooking.id);
            setIsComplete(true);
        } catch (error) {
            console.error("Failed to create booking:", error);
            alert("There was an error creating your booking. Please try again.");
        }
    };
    
    if (isComplete) {
        return <BookingSuccessScreen bookingId={bookingId} onFinish={onBookingSuccess} />;
    }
    
    const inputClass = "w-full text-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none";

    return (
         <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
             <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-xl">Back to Home</span>
                </button>
                <h1 className="text-3xl font-bold">Book a Photo Session</h1>
                <div className="w-48"></div>
            </header>
            <main className="flex-1 p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto w-full">
                {/* Form on the left */}
                <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
                    <div>
                        <h2 className="text-2xl font-bold">Your Details</h2>
                        <div className="space-y-4 mt-4">
                             <input type="text" id="name" name="name" value={details.name} onFocus={() => setFocusedInput('name')} placeholder="Full Name" required readOnly autoComplete="name" className={inputClass} />
                             <input type="email" id="email" name="email" value={details.email} onFocus={() => setFocusedInput('email')} placeholder="Email Address" required readOnly autoComplete="email" className={inputClass} />
                             <input type="tel" id="phone" name="phone" value={details.phone} onFocus={() => setFocusedInput('phone')} placeholder="Phone Number" required readOnly autoComplete="tel" className={inputClass} />
                        </div>
                    </div>
                    
                    <div className="pt-4 flex-grow flex flex-col">
                        <h2 className="text-2xl font-bold mb-4">Session Details</h2>
                         <div className="space-y-3 flex-grow overflow-y-auto pr-2">
                             {MOCK_SESSION_TYPES.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setDetails(prev => ({ ...prev, sessionId: s.id }))}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${details.sessionId === s.id ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg">{s.name}</span>
                                        <span className="font-semibold text-lg">{formatCurrency(s.price)}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{s.numberOfPhotos} photos included</p>
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <input type="date" id="date" name="date" value={details.date} onChange={handleSelectChange} required autoComplete="off" className={inputClass} />
                            <input type="time" id="time" name="time" value={details.time} onChange={handleSelectChange} required autoComplete="off" className={inputClass} />
                        </div>
                    </div>

                    <button type="submit" className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-lg text-2xl">
                        Confirm Booking
                    </button>
                </form>
                
                {/* Keyboard on the right */}
                <div className="pt-8">
                    {focusedInput && (
                        <OnScreenKeyboard 
                            value={details[focusedInput]}
                            onChange={(val) => handleInputChange(focusedInput, val)}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default BookingScreen;