import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingCart, Zap, Truck, Sparkles } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PriceTag } from '../components/common/PriceTag';
import { useCartStore } from '../stores/cartStore';

export const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getSubtotal, hasHomeDeliveryItems } = useCartStore();

  const subtotal = getSubtotal();
  const requiresShipping = hasHomeDeliveryItems();
  const shippingFee = requiresShipping ? 799 : 0;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shippingFee + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col text-slate-100">
        <header className="p-4 border-b border-slate-800">
          <button onClick={() => navigate('/gallery')} className="text-slate-300 hover:text-white flex items-center gap-2 text-sm">
            <ArrowLeft size={18} /> Back to Gallery
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-5 text-slate-500">
            <ShoppingCart size={36} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
          <p className="text-slate-400 mb-6 text-sm max-w-sm">Explore your guest session gallery and add digital memories, on-site prints, or custom albums.</p>
          <Button onClick={() => navigate('/gallery')}>Explore Photos</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-brand-dark pb-24 text-slate-100"
    >
      <header className="p-4 bg-brand-dark/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-slate-300 hover:text-white p-2 flex items-center gap-2 text-sm">
            <ArrowLeft size={18} /> Continue Browsing
          </button>
          <h1 className="text-base font-bold text-white">Your Photo Cart ({items.length})</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-2 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {/* Delivery Legend */}
          <div className="flex items-center gap-4 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium"><Zap size={14} /> Instant Access (Digital & Prints)</span>
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium"><Truck size={14} /> Home Delivery (Albums & Merch)</span>
          </div>

          {items.map(item => (
            <div key={`${item.id}-${item.type}`} className="glass-card p-4 flex gap-4 border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                <img src={item.photoUrl} alt="Product" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white text-sm capitalize">{item.type.replace(/_/g, ' ')}</h3>
                    <span className={`text-[11px] font-medium flex items-center gap-1 mt-0.5 ${item.isHomeDelivery ? 'text-indigo-400' : 'text-cyan-400'}`}>
                      {item.isHomeDelivery ? <Truck size={12} /> : <Zap size={12} />}
                      {item.isHomeDelivery ? 'Delivered to Home Address' : 'Instant Digital & Counter Print'}
                    </span>
                  </div>
                  <button onClick={() => removeItem(item.id, item.type)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                    <button 
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.type)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-white text-xs font-semibold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.type)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <PriceTag amount={item.price * item.quantity} className="text-sm font-bold text-white" />
                </div>
              </div>
            </div>
          ))}

          {/* Upsell Banner */}
          <div className="glass-card p-4 border border-cyan-500/30 bg-cyan-500/5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Full Gallery VIP Pass</h4>
                <p className="text-[11px] text-slate-400">Unlock all captured session photos + 1 Hardcover Album at 35% bundle discount.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/gallery')} className="text-xs">
              View Gallery
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-6 sticky top-24 border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white mb-4">Summary</h2>
            
            <div className="space-y-2.5 text-xs text-slate-300 mb-5 border-b border-slate-800 pb-4">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <PriceTag amount={subtotal} className="text-white font-medium" />
              </div>
              {requiresShipping && (
                <div className="flex justify-between text-indigo-400">
                  <span>Album Home Shipping</span>
                  <PriceTag amount={shippingFee} className="font-semibold" />
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <PriceTag amount={tax} className="text-white font-medium" />
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-white">Total</span>
              <PriceTag amount={total} className="text-xl font-bold text-cyan-400" />
            </div>

            <Button fullWidth size="lg" onClick={() => navigate('/checkout')} className="py-3 font-bold text-sm">
              Proceed to Secure Checkout
            </Button>
          </div>
        </div>
      </main>
    </motion.div>
  );
};
