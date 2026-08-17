import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Lock, Truck, Zap, Building, Banknote, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PriceTag } from '../components/common/PriceTag';
import { useCartStore, PaymentMethodType, ShippingAddress } from '../stores/cartStore';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { getSubtotal, items, hasHomeDeliveryItems, paymentMethod, setPaymentMethod, shippingAddress, setShippingAddress, venueSettings } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [guestLastName, setGuestLastName] = useState('');

  // Shipping Form State
  const [shipping, setShipping] = useState<ShippingAddress>(shippingAddress || {
    fullName: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    phone: ''
  });

  const requiresShipping = hasHomeDeliveryItems();
  const subtotal = getSubtotal();
  const shippingFee = requiresShipping ? 799 : 0; // $7.99 flat shipping for physical albums/merch
  const tax = subtotal * 0.08;
  const total = subtotal + shippingFee + tax;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresShipping) {
      setShippingAddress(shipping);
    }
    setIsProcessing(true);
    // Mock processing delay
    setTimeout(() => {
      navigate('/confirmation');
    }, 1800);
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-brand-dark text-slate-100 pb-20"
    >
      <header className="p-4 border-b border-slate-800 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-slate-300 hover:text-white p-2 flex items-center gap-2 text-sm">
            <ArrowLeft size={18} /> Back to Cart
          </button>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Lock size={16} className="text-cyan-400" /> Secure Venue Checkout
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handlePay} className="space-y-6">
            {/* Digital Contact Form */}
            <div className="glass-card p-6 border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Zap size={18} className="text-cyan-400" /> Instant Digital Delivery Contact
              </h2>
              <p className="text-xs text-slate-400 mb-4">Your high-resolution download link & receipt will be sent instantly.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    placeholder="guest@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Mobile (WhatsApp Magic Link)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Home Delivery Shipping Address Form */}
            {requiresShipping && (
              <div className="glass-card p-6 border border-indigo-500/40 rounded-2xl bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-indigo-500/5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Truck size={18} className="text-indigo-400" /> Album & Merchandise Home Delivery
                  </h2>
                  <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-semibold px-2.5 py-1 rounded-full border border-indigo-500/30">
                    Direct to Home Address
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">Your custom photobook album and merchandise will be crafted and shipped to your home.</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Full Name / Recipient *</label>
                    <input
                      type="text"
                      required
                      value={shipping.fullName}
                      onChange={e => setShipping({ ...shipping, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={shipping.street}
                      onChange={e => setShipping({ ...shipping, street: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="123 Palm Tree Blvd, Apt 4B"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={shipping.city}
                        onChange={e => setShipping({ ...shipping, city: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Orlando"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">State / Province *</label>
                      <input
                        type="text"
                        required
                        value={shipping.state}
                        onChange={e => setShipping({ ...shipping, state: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="FL"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Postal / Zip Code *</label>
                      <input
                        type="text"
                        required
                        value={shipping.postalCode}
                        onChange={e => setShipping({ ...shipping, postalCode: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="32801"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Country *</label>
                      <input
                        type="text"
                        required
                        value={shipping.country}
                        onChange={e => setShipping({ ...shipping, country: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="United States"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Destination-Configurable Payment Methods */}
            <div className="glass-card p-6 border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span>Select Payment Method</span>
                <span className="text-xs text-slate-400 font-normal">Configured by Venue</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {venueSettings.allowStripe && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${paymentMethod === 'card' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'}`}
                  >
                    <CreditCard className={paymentMethod === 'card' ? 'text-cyan-400' : 'text-slate-400'} size={20} />
                    <div>
                      <div className="text-sm font-semibold">Credit / Debit Card</div>
                      <div className="text-[11px] opacity-75">Stripe, Visa, Mastercard, Amex</div>
                    </div>
                  </button>
                )}

                {venueSettings.allowApplePay && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('apple_pay')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${paymentMethod === 'apple_pay' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'}`}
                  >
                    <ShieldCheck className={paymentMethod === 'apple_pay' ? 'text-cyan-400' : 'text-slate-400'} size={20} />
                    <div>
                      <div className="text-sm font-semibold">Apple Pay / Google Pay</div>
                      <div className="text-[11px] opacity-75">1-Touch biometric mobile pay</div>
                    </div>
                  </button>
                )}

                {venueSettings.allowRoomCharge && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('room_charge')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${paymentMethod === 'room_charge' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'}`}
                  >
                    <Building className={paymentMethod === 'room_charge' ? 'text-cyan-400' : 'text-slate-400'} size={20} />
                    <div>
                      <div className="text-sm font-semibold">Resort Room Charge</div>
                      <div className="text-[11px] opacity-75">Bill to Hotel Folio / Room Key</div>
                    </div>
                  </button>
                )}

                {venueSettings.allowCounterPay && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('counter_cash')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${paymentMethod === 'counter_cash' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'}`}
                  >
                    <Banknote className={paymentMethod === 'counter_cash' ? 'text-cyan-400' : 'text-slate-400'} size={20} />
                    <div>
                      <div className="text-sm font-semibold">Pay at Photo Counter</div>
                      <div className="text-[11px] opacity-75">Generate ticket for cashier</div>
                    </div>
                  </button>
                )}
              </div>

              {/* Payment Detail Sub-forms */}
              {paymentMethod === 'card' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <input type="text" placeholder="Card Number (4242 4242 4242 4242)" className="w-full bg-transparent border-b border-slate-700 pb-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  <div className="flex gap-4">
                    <input type="text" placeholder="MM/YY" className="w-1/2 bg-transparent border-b border-slate-700 pb-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                    <input type="text" placeholder="CVC" className="w-1/2 bg-transparent border-b border-slate-700 pb-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
              )}

              {paymentMethod === 'room_charge' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      required 
                      placeholder="Room / Suite #" 
                      value={roomNumber} 
                      onChange={e => setRoomNumber(e.target.value)}
                      className="bg-transparent border-b border-slate-700 pb-2 text-sm text-white focus:outline-none focus:border-cyan-500" 
                    />
                    <input 
                      type="text" 
                      required 
                      placeholder="Guest Last Name on Reservation" 
                      value={guestLastName} 
                      onChange={e => setGuestLastName(e.target.value)}
                      className="bg-transparent border-b border-slate-700 pb-2 text-sm text-white focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'counter_cash' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                  A digital pickup voucher with a secure barcode will be generated immediately. Present it at any ClickFlash photo counter to pay and claim on-site prints.
                </div>
              )}
            </div>

            <Button type="submit" fullWidth size="lg" disabled={isProcessing} className="py-3.5 text-base font-bold">
              {isProcessing ? 'Authorizing & Confirming...' : `Complete Order • ${new Intl.NumberFormat('en-US', { style: 'currency', currency: venueSettings.currency }).format(total / 100)}`}
            </Button>
          </form>
        </div>

        {/* Sidebar Summary */}
        <div>
          <div className="glass-card p-6 sticky top-24 border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4">Order Items</h2>
            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-2">
              {items.map(item => (
                <div key={`${item.id}-${item.type}`} className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-800 shrink-0 overflow-hidden">
                    <img src={item.photoUrl} alt="Thumb" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white text-xs font-semibold capitalize">{item.type.replace('_', ' ')}</h4>
                    <span className="text-[11px] text-slate-400">
                      {item.isHomeDelivery ? '📦 Home Delivery' : '⚡ Instant Access'} • Qty {item.quantity}
                    </span>
                    <PriceTag amount={item.price * item.quantity} className="text-xs font-bold text-white block mt-0.5" />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <PriceTag amount={subtotal} />
              </div>
              {requiresShipping && (
                <div className="flex justify-between text-indigo-400 font-medium">
                  <span>Album Home Shipping</span>
                  <PriceTag amount={shippingFee} />
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <PriceTag amount={tax} />
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-bold text-white">
                <span>Total Due</span>
                <PriceTag amount={total} className="text-lg text-cyan-400 font-bold" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
};
