import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MobileTransferBLEModal } from './MobileTransferBLEModal';

interface ThankYouScreenProps {
    orderId: string;
    name: string;
    email: string;
    onFinish: () => void;
    isOffline?: boolean;
    magicLinkUrl?: string;
}

const ThankYouScreen: React.FC<ThankYouScreenProps> = ({ orderId, name, email, onFinish, isOffline = false, magicLinkUrl }) => {
    const [showMobileQR, setShowMobileQR] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!showMobileQR) {
                onFinish();
            }
        }, 12000); // Redirect after 12 seconds unless interacting

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showMobileQR]);

    const bgColor = isOffline ? 'bg-orange-600' : 'bg-blue-600';
    const textColor = isOffline ? 'text-orange-200' : 'text-blue-200';

    return (
        <div className={`fixed inset-0 ${bgColor} z-50 flex flex-col items-center justify-center text-white text-center p-8 overflow-y-auto`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="text-5xl md:text-6xl font-bold">Thank You, {name}!</h1>
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

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                {/* Apple Wallet / NFC (No QR) */}
                {!isOffline && (
                    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-2xl max-w-xs">
                        <p className="text-gray-800 font-bold mb-2 text-lg">Apple Wallet Pass</p>
                        <p className="text-gray-500 text-sm mb-4">Tap your phone here (NFC) to add your pass.</p>
                        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Magic Link QR Code */}
                {!isOffline && magicLinkUrl && (
                    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-2xl max-w-xs">
                        <p className="text-gray-800 font-bold mb-2 text-lg text-center">Scan to instantly view your gallery on your phone!</p>
                        <div className="bg-white p-2 rounded-xl">
                            <QRCodeSVG value={magicLinkUrl} size={160} />
                        </div>
                    </div>
                )}

                {/* Mobile BLE Transfer Button */}
                <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-2xl max-w-xs">
                    <p className="text-white font-bold mb-2 text-lg">Instant Mobile Handoff</p>
                    <p className="text-white/80 text-sm mb-4">Send full photo gallery directly to your phone right now</p>
                    <button
                        onClick={() => setShowMobileQR(true)}
                        className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-base transition-all shadow-lg hover:scale-105"
                    >
                        Send Photos to Phone
                    </button>
                </div>
            </div>

            <MobileTransferBLEModal
                isOpen={showMobileQR}
                onClose={() => setShowMobileQR(false)}
                orderId={orderId}
            />

            <p className={`text-lg mt-12 ${textColor}`}>This screen will reset automatically for the next guest.</p>
        </div>
    );
};

export default ThankYouScreen;