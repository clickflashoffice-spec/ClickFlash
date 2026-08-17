import React, { useState, useEffect } from 'react';
import { CartItem } from '../../types';
import { useCurrency } from '../CurrencyContext';
import { analytics } from '../../utils/telemetry';

export interface AIUpsellModalProps {
    isOpen: boolean;
    cart: CartItem[];
    onAccept: () => void;
    onDecline: () => void;
}

const AIUpsellModal: React.FC<AIUpsellModalProps> = ({ isOpen, cart, onAccept, onDecline }) => {
    const { formatCurrency } = useCurrency();
    const [timeLeft, setTimeLeft] = useState(60);
    const [upsellMessage, setUpsellMessage] = useState("");
    const [savings, setSavings] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setTimeLeft(60);
            analytics.trackUserFlow('UPSELL_MODAL', 'OPENED');
            
            // Dynamic deal generation based on cart
            const digitalCount = cart.filter(item => item.size === 'Digital' || item.size === '4K Digital').length;
            const printCount = cart.filter(item => item.size !== 'Digital' && item.size !== '4K Digital').length;
            
            if (digitalCount >= 3) {
                setUpsellMessage(`Upgrade your ${digitalCount} digital photos to the Full Album + Canvas Print for only €20 more!`);
                setSavings(35);
            } else if (printCount > 0) {
                setUpsellMessage(`Add the digital versions of your ${printCount} prints for just €10 more!`);
                setSavings(15);
            } else {
                setUpsellMessage(`Upgrade to the Full Digital Album + Canvas Print for only €20 more!`);
                setSavings(35);
            }
        }
    }, [isOpen, cart]);

    useEffect(() => {
        if (!isOpen) return;

        if (timeLeft <= 0) {
            handleDecline();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, timeLeft]);

    const handleAccept = () => {
        analytics.trackUserFlow('UPSELL_MODAL', 'ACCEPTED', { savings });
        onAccept();
    };

    const handleDecline = () => {
        analytics.trackUserFlow('UPSELL_MODAL', 'DECLINED');
        onDecline();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center relative">
                    <h2 className="text-3xl font-bold text-white mb-2">Wait! Special One-Time Offer</h2>
                    <p className="text-blue-100 text-lg">AI Smart Deal just for you</p>
                    
                    <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white animate-pulse">
                        {timeLeft}s
                    </div>
                </div>
                
                <div className="p-8 text-center space-y-8">
                    <div className="text-2xl font-medium text-gray-800 leading-relaxed">
                        {upsellMessage}
                    </div>

                    <div className="flex flex-col gap-4 max-w-md mx-auto">
                        <button
                            onClick={handleAccept}
                            className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-5 px-8 rounded-xl text-xl shadow-lg transition-all transform hover:scale-105"
                        >
                            Accept Deal & Save €{savings}
                        </button>
                        
                        <button
                            onClick={handleDecline}
                            className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold py-4 px-8 rounded-xl text-lg transition-all"
                        >
                            No Thanks, Keep Current Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIUpsellModal;
