import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ThankYouScreenProps {
    orderId: string;
    name: string;
    email: string;
    onFinish: () => void;
    isOffline?: boolean;
}

const ThankYouScreen: React.FC<ThankYouScreenProps> = ({ orderId, name, email, onFinish, isOffline = false }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 8000); // Redirect after 8 seconds

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bgColor = isOffline ? 'bg-orange-600' : 'bg-blue-600';
    const textColor = isOffline ? 'text-orange-200' : 'text-blue-200';

    return (
        <div className={`fixed inset-0 ${bgColor} z-50 flex flex-col items-center justify-center text-white text-center p-8`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 mb-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="text-6xl font-bold">Thank You, {name}!</h1>
            {isOffline ? (
                <>
                    <p className="text-2xl mt-4">Your order has been saved locally.</p>
                    <p className="text-xl mt-2">It will be processed automatically when the kiosk reconnects.</p>
                    <p className="text-lg mt-1">Your temporary Order ID is <span className="font-bold">{orderId}</span>.</p>
                </>
            ) : (
                <>
                    <p className="text-2xl mt-4">Your order <span className="font-bold">{orderId}</span> has been placed.</p>
                    <p className="text-xl mt-2">A confirmation has been sent to <span className="font-bold">{email}</span>.</p>
                </>
            )}
            
            {/* Apple Wallet QR Code */}
            {!isOffline && (
                <div className="mt-8 flex flex-col items-center bg-white p-4 rounded-2xl shadow-2xl">
                    <p className="text-gray-800 font-bold mb-2">Scan to add to Apple Wallet</p>
                    <QRCodeSVG
                        value={`${window.location.origin}/api/gallery/wallet-pass?orderId=${orderId}`}
                        size={150}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"L"}
                    />
                </div>
            )}

            <p className={`text-lg mt-12 ${textColor}`}>This screen will reset automatically for the next guest.</p>
        </div>
    );
};

export default ThankYouScreen;