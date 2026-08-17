import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Sliders, Type, Square, Crop } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useCartStore } from '../stores/cartStore';
import { WatermarkOverlay } from '../components/gallery/WatermarkOverlay';

const MOCK_PHOTO = {
  id: '1',
  url: 'https://images.unsplash.com/photo-1596404179782-b7519a7ee191',
  price: 999
};

export const EditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const [filter, setFilter] = useState('none');
  
  const filters = [
    { id: 'none', label: 'Original', class: '' },
    { id: 'grayscale', label: 'B&W', class: 'grayscale' },
    { id: 'sepia', label: 'Sepia', class: 'sepia' },
    { id: 'saturate', label: 'Vivid', class: 'saturate-200' },
  ];

  const handleSave = () => {
    // In reality, save edit to backend, get new URL
    addItem({ id: MOCK_PHOTO.id, type: 'digital', price: MOCK_PHOTO.price, quantity: 1, photoUrl: MOCK_PHOTO.url });
    navigate('/cart');
  };

  const activeFilterClass = filters.find(f => f.id === filter)?.class || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-black flex flex-col"
    >
      <header className="p-4 flex items-center justify-between bg-brand-dark/80 backdrop-blur-md border-b border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-300 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft size={20} />
          Cancel
        </button>
        <Button onClick={handleSave} className="gap-2">
          <Save size={18} />
          Save & Add to Cart
        </Button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-4 flex items-center justify-center relative overflow-hidden bg-slate-900">
          <div className="relative max-w-full max-h-full">
            <img 
              src={MOCK_PHOTO.url} 
              alt="Edit canvas" 
              className={`w-full h-auto max-h-[70vh] object-contain transition-all duration-300 ${activeFilterClass}`} 
            />
            <WatermarkOverlay />
          </div>
        </div>

        {/* Toolbar */}
        <div className="w-full md:w-80 bg-brand-dark border-t md:border-t-0 md:border-l border-slate-800 p-6 overflow-y-auto">
          <div className="flex space-x-6 mb-8 border-b border-slate-800 pb-4">
            <button className="flex flex-col items-center gap-1 text-brand-primary">
              <Sliders size={24} />
              <span className="text-xs font-medium">Filters</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-white">
              <Square size={24} />
              <span className="text-xs font-medium">Frames</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-white">
              <Type size={24} />
              <span className="text-xs font-medium">Text</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-white">
              <Crop size={24} />
              <span className="text-xs font-medium">Crop</span>
            </button>
          </div>

          <div className="space-y-6">
            <h3 className="text-white font-semibold mb-4">Filters</h3>
            <div className="grid grid-cols-2 gap-4">
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                    filter === f.id ? 'border-brand-primary' : 'border-transparent hover:border-slate-700'
                  }`}
                >
                  <img src={MOCK_PHOTO.url} alt={f.label} className={`w-full h-full object-cover ${f.class}`} />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-xs text-white font-medium text-center">
                    {f.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
};
