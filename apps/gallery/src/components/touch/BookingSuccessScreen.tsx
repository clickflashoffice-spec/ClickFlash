
import React, { useEffect } from 'react';

interface BookingSuccessScreenProps {
    bookingId: string;
    onFinish: () => void;
}

const BookingSuccessScreen: React.FC<BookingSuccessScreenProps> = ({ bookingId, onFinish }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 8000); // Redirect after 8 seconds

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white text-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 mb-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="text-6xl font-bold">Booking Confirmed!</h1>
            <p className="text-2xl mt-4">Your Booking ID is <span className="font-bold">{bookingId}</span>.</p>
            <p className="text-xl mt-2">We look forward to your photo session!</p>
            <p className="text-lg mt-12 text-green-200">This screen will reset automatically.</p>
        </div>
    );
};

export default BookingSuccessScreen;
