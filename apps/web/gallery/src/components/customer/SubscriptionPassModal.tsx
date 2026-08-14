import React, { useState } from 'react';
import { Modal } from '@clickflash/ui';
import { CheckCircle2, Star, Zap, Crown, CreditCard } from 'lucide-react';

interface SubscriptionPassModalProps {
    isOpen: boolean;
    onClose: () => void;
    galleryId: string;
}

const TIERS = [
    {
        id: '7-day',
        name: '7-Day Vacation Pass',
        price: 49,
        icon: <Zap className="w-6 h-6 text-blue-400" />,
        color: 'from-blue-600/20 to-blue-900/20',
        borderColor: 'border-blue-500/30',
        activeBorder: 'border-blue-400',
        badge: 'Most Popular',
        features: [
            'Unlimited High-Res Downloads for 7 days',
            'Free AI Magic Eraser (5 uses)',
            '10% Off Canvas Prints',
            'Priority Customer Support'
        ]
    },
    {
        id: '30-day',
        name: '30-Day Resort Pass',
        price: 129,
        icon: <Star className="w-6 h-6 text-amber-400" />,
        color: 'from-amber-600/20 to-amber-900/20',
        borderColor: 'border-amber-500/30',
        activeBorder: 'border-amber-400',
        features: [
            'Unlimited High-Res Downloads for 30 days',
            'Free AI Magic Eraser (Unlimited)',
            '20% Off Canvas Prints',
            'Shareable Family Access Link'
        ]
    },
    {
        id: 'lifetime',
        name: 'VIP Lifetime Pass',
        price: 299,
        icon: <Crown className="w-6 h-6 text-purple-400" />,
        color: 'from-purple-600/20 to-purple-900/20',
        borderColor: 'border-purple-500/30',
        activeBorder: 'border-purple-400',
        features: [
            'Lifetime Access to all resort photos',
            'All AI Features Unlocked',
            '30% Off All Physical Products',
            'Dedicated VIP Support Line',
            'Annual Free Photo Book'
        ]
    }
];

const SubscriptionPassModal: React.FC<SubscriptionPassModalProps> = ({ isOpen, onClose, galleryId }) => {
    const [selectedTier, setSelectedTier] = useState<string>(TIERS[0].id);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const handleSubscribe = () => {
        setIsProcessing(true);
        
        // Simulate Stripe Checkout Redirect
        setTimeout(() => {
            setIsProcessing(false);
            alert(`Redirecting to Stripe Checkout for ${TIERS.find(t => t.id === selectedTier)?.name}...`);
            onClose();
        }, 1500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Unlock Everything" size="xl">
            <div className="flex flex-col space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Resort Photo Pass
                    </h2>
                    <p className="text-slate-400 max-w-lg mx-auto">
                        Upgrade your experience. Get unlimited high-resolution downloads, AI editing tools, and exclusive print discounts.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TIERS.map((tier) => {
                        const isSelected = selectedTier === tier.id;
                        return (
                            <div 
                                key={tier.id}
                                onClick={() => setSelectedTier(tier.id)}
                                className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 bg-gradient-to-br ${tier.color} ${
                                    isSelected 
                                        ? `${tier.activeBorder} scale-105 shadow-2xl z-10 bg-slate-900/90` 
                                        : `${tier.borderColor} bg-slate-900/50 hover:border-slate-500 scale-100 opacity-70 hover:opacity-100`
                                }`}
                            >
                                {tier.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                                        {tier.badge}
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-4 mt-2">
                                    <div className="p-2 bg-black/30 rounded-xl">
                                        {tier.icon}
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        isSelected ? tier.activeBorder : 'border-slate-600'
                                    }`}>
                                        {isSelected && <div className={`w-2.5 h-2.5 rounded-full bg-current ${tier.activeBorder.replace('border-', 'text-')}`} />}
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                                <div className="mb-6 flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-white">€{tier.price}</span>
                                </div>

                                <ul className="space-y-3">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <span className="leading-tight">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" />
                        Secure payments processed by Stripe. Cancel anytime.
                    </p>
                    
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors uppercase tracking-widest text-sm flex-1 sm:flex-none"
                        >
                            Maybe Later
                        </button>
                        <button
                            onClick={handleSubscribe}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest text-sm disabled:opacity-70 disabled:cursor-not-allowed flex-1 sm:flex-none min-w-[200px]"
                        >
                            {isProcessing ? (
                                <span className="animate-pulse">Loading Secure Checkout...</span>
                            ) : (
                                'Subscribe Now'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SubscriptionPassModal;
