import React, { useState } from 'react';
import { CartItem, OrderItem } from '../../types';
import { useCurrency } from '../CurrencyContext.tsx';
import ThankYouScreen from '../touch/ThankYouScreen.tsx';
import { apiService } from '../../services/apiService.ts';
import OnScreenKeyboard from '../touch/OnScreenKeyboard.tsx';

interface CheckoutScreenProps {
    cart: CartItem[];
    total: number;
    appliedDiscount: number;
    onBack: () => void;
    onCheckoutSuccess: () => void;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ cart, total, appliedDiscount, onBack, onCheckoutSuccess }) => {
    const { formatCurrency } = useCurrency();
    const [customerDetails, setCustomerDetails] = useState({ name: '', email: '', roomNumber: '' });
    const [isComplete, setIsComplete] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'roomNumber' | null>(null);
    const [checkpoint, setCheckpoint] = useState<'info' | 'payment' | 'done'>('info');

    const handleInputChange = (field: 'name' | 'email' | 'roomNumber', value: string) => {
        setCustomerDetails(prev => ({ ...prev, [field]: value }));
    };

    // Transform CartItems to OrderItems for the backend
    const orderItems: OrderItem[] = cart.map(cartItem => ({
        id: cartItem.id,
        name: `${cartItem.photo.title} (${cartItem.size})${cartItem.mode === 'AI' ? ' [AI Enhanced]' : ''}`,
        photo: cartItem.photo,
        format: cartItem.size,
        quantity: cartItem.quantity,
        price: cartItem.price,
    }));

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckpoint('payment');

        try {
            const newOrder = await apiService.createOrder({
                clientName: customerDetails.name,
                email: customerDetails.email,
                total: total,
                appliedDiscount: appliedDiscount,
                destinationId: 'dest1', // Assuming a single destination for the kiosk
                items: orderItems,
                photographerId: cart[0]?.photo.photographerId ?? 0,
            });
            setOrderId(newOrder.id);
            setCheckpoint('done');
            setIsComplete(true);
        } catch (error) {
            console.error("Failed to create order:", error);
            alert("There was an error placing your order. Please try again.");
            setCheckpoint('info');
        }
    };

    if (isComplete) {
        return <ThankYouScreen orderId={orderId} name={customerDetails.name} email={customerDetails.email} onFinish={onCheckoutSuccess} />;
    }

    const STEPS = [
        { id: 'info', label: 'Details', icon: '👤' },
        { id: 'payment', label: 'Payment', icon: '💳' },
        { id: 'done', label: 'Complete', icon: '✅' }
    ];

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white">
            <header className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="font-semibold">Review Cart</span>
                </button>

                <div className="flex items-center space-x-8">
                    {STEPS.map((step, idx) => (
                        <div key={step.id} className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${checkpoint === step.id ? 'bg-blue-600 text-white shadow-md' :
                                STEPS.findIndex(s => s.id === checkpoint) > idx ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}>
                                {STEPS.findIndex(s => s.id === checkpoint) > idx ? '✓' : idx + 1}
                            </div>
                            <span className={`ml-2 font-semibold hidden md:block ${checkpoint === step.id ? 'text-blue-600' : 'text-slate-400'}`}>
                                {step.label}
                            </span>
                            {idx < STEPS.length - 1 && (
                                <div className="ml-4 w-8 h-px bg-slate-200 dark:bg-slate-800" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="w-48 text-right font-mono font-bold text-xl text-blue-600">
                    {formatCurrency(total)}
                </div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-2xl font-bold mb-6 flex items-center">
                                <span className="mr-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">👤</span>
                                Customer Details
                            </h2>
                            <form onSubmit={handlePlaceOrder} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                        <input id="name" type="text" value={customerDetails.name} onFocus={() => setFocusedInput('name')} placeholder="John Doe" required readOnly className="w-full text-lg bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                        <input id="email" type="email" value={customerDetails.email} onFocus={() => setFocusedInput('email')} placeholder="john@example.com" required readOnly className="w-full text-lg bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Room Number</label>
                                    <input id="roomNumber" type="text" value={customerDetails.roomNumber} onFocus={() => setFocusedInput('roomNumber')} placeholder="101" readOnly className="w-full text-lg bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 focus:border-blue-500 outline-none transition-all" />
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-start space-x-3 text-blue-700 dark:text-blue-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0116 0z" /></svg>
                                    <p className="text-sm leading-relaxed font-medium">Payment will be charged to your room folio. All digital photos will be available for download instantly after order completion.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={checkpoint === 'payment'}
                                    className={`w-full py-5 rounded-2xl text-2xl font-bold shadow-xl transition-all transform active:scale-[0.98] ${checkpoint === 'payment' ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                                        }`}
                                >
                                    {checkpoint === 'payment' ? 'Processing...' : 'Complete Purchase'}
                                </button>
                            </form>
                        </section>

                        {focusedInput && (
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800">
                                <OnScreenKeyboard
                                    value={customerDetails[focusedInput]}
                                    onChange={(val) => handleInputChange(focusedInput, val)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold mb-4">Summary</h2>
                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-start group">
                                        <div className="flex-1">
                                            <p className="font-bold group-hover:text-blue-600 transition-colors uppercase text-xs tracking-widest text-slate-400">Item</p>
                                            <p className="font-semibold text-sm">{item.quantity}x {item.photo.title}</p>
                                            <p className="text-xs text-slate-500">{item.size}</p>
                                        </div>
                                        <p className="font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                                            {formatCurrency(item.price * item.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(total + appliedDiscount)}</span>
                                </div>
                                {appliedDiscount > 0 && (
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(appliedDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-baseline text-2xl pt-2">
                                    <span className="font-bold">Total</span>
                                    <span className="font-black text-blue-600">{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CheckoutScreen;