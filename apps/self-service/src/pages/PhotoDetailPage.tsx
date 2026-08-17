import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Share2, Edit2, Zap, Truck, BookOpen, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PriceTag } from '../components/common/PriceTag';
import { WatermarkOverlay } from '../components/gallery/WatermarkOverlay';
import { useCartStore, ProductType } from '../stores/cartStore';

// Mock fetch
const MOCK_PHOTO = {
  id: '1',
  url: 'https://images.unsplash.com/photo-1596404179782-b7519a7ee191',
  price: 999,
  location: 'Apex Water Rapids',
  date: '2026-08-17T14:30:00Z'
};

const PRODUCT_CATALOG: { type: ProductType; label: string; price: number; delivery: 'instant' | 'home'; description: string; icon: any }[] = [
  { type: 'digital', label: 'Instant Digital High-Res', price: 999, delivery: 'instant', description: 'Download immediately in full uncompressed resolution', icon: Zap },
  { type: 'print_4x6', label: '4x6 On-Site Print', price: 499, delivery: 'instant', description: 'Instant print pickup at Resort Photo Kiosk counter', icon: ImageIcon },
  { type: 'print_5x7', label: '5x7 On-Site Print', price: 799, delivery: 'instant', description: 'Instant print pickup at Resort Photo Kiosk counter', icon: ImageIcon },
  { type: 'print_8x10', label: '8x10 Premium Print', price: 1199, delivery: 'instant', description: 'Instant print pickup at Resort Photo Kiosk counter', icon: ImageIcon },
  { type: 'photobook_hardcover', label: 'Hardcover Memory Album', price: 3999, delivery: 'home', description: 'Handcrafted luxury hardcover album delivered to your home address', icon: BookOpen },
  { type: 'photobook_layflat', label: 'Layflat Leather Photo Album', price: 5999, delivery: 'home', description: 'Archival-grade genuine leather album delivered to your home address', icon: BookOpen },
  { type: 'canvas_16x20', label: '16x20 Gallery Canvas Wrap', price: 2999, delivery: 'home', description: 'Solid-front museum canvas wrap delivered to your home address', icon: Sparkles },
  { type: 'mug', label: 'Ceramic Memory Mug', price: 1499, delivery: 'home', description: 'Glossy ceramic mug delivered to your home address', icon: Truck },
];

export const PhotoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const [activeTab, setActiveTab] = useState<'instant' | 'home'>('instant');

  // In reality, fetch photo by id
  const photo = MOCK_PHOTO;

  const handleAddToCart = (type: ProductType, price: number) => {
    addItem({ id: photo.id, type, price, quantity: 1, photoUrl: photo.url });
    navigate('/cart');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-brand-dark pb-20 text-slate-100"
    >
      <header className="p-4 flex items-center justify-between sticky top-0 z-40 bg-brand-dark/80 backdrop-blur-md border-b border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-300 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft size={20} />
          Back to Gallery
        </button>
        <div className="flex gap-2">
          <button className="p-2 text-slate-300 hover:text-white rounded-full bg-slate-800 transition-colors">
            <Share2 size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        {/* Photo Preview Stage */}
        <div className="flex-1">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl sticky top-24">
            <img src={photo.url} alt="Full view" className="w-full h-auto object-contain max-h-[70vh]" />
            <WatermarkOverlay className="text-4xl" />
          </div>
        </div>

        {/* Product Customizer & Checkout Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          <div className="glass-card p-6 border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-white mb-1">{photo.location}</h2>
            <p className="text-slate-400 text-sm mb-4">
              Captured {new Date(photo.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>

            <div className="flex gap-2 mb-6 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('instant')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'instant' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Zap size={14} /> Instant (Digital / Prints)
              </button>
              <button
                onClick={() => setActiveTab('home')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'home' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Truck size={14} /> Home Delivery (Albums & Merch)
              </button>
            </div>

            <div className="space-y-3">
              {PRODUCT_CATALOG.filter(p => p.delivery === activeTab).map((product) => {
                const IconComponent = product.icon;
                return (
                  <div 
                    key={product.type} 
                    className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:border-slate-700 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-800/80 text-cyan-400">
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{product.label}</h4>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            {product.delivery === 'instant' ? '⚡ Instant access' : '📦 Ships to home'}
                          </span>
                        </div>
                      </div>
                      <PriceTag amount={product.price} className="text-sm font-bold text-white" />
                    </div>
                    <p className="text-xs text-slate-400">{product.description}</p>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddToCart(product.type, product.price)}
                      className="mt-1 w-full text-xs font-semibold"
                    >
                      <ShoppingCart size={14} className="mr-1.5" /> Add to Cart
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Button fullWidth variant="secondary" onClick={() => navigate(`/photo/${photo.id}/edit`)} className="gap-2 text-sm">
                <Edit2 size={16} />
                Customize & Add Filters
              </Button>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
};
