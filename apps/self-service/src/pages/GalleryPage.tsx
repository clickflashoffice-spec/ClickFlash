import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PhotoGrid } from '../components/gallery/PhotoGrid';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';

// Mock data
const MOCK_PHOTOS = [
  { id: '1', url: 'https://images.unsplash.com/photo-1596404179782-b7519a7ee191', price: 999, location: 'Splash Mountain' },
  { id: '2', url: 'https://images.unsplash.com/photo-1533669955142-6a73332af4db', price: 1299, location: 'Main Street' },
  { id: '3', url: 'https://images.unsplash.com/photo-1551046187-578d052fcb02', price: 1499, location: 'Space Coaster' },
  { id: '4', url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4', price: 999, location: 'Character Meet' },
];

export const GalleryPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const cartItems = useCartStore(state => state.items);
  
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-brand-dark pb-20"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-brand-dark/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">My Gallery</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/cart')}
              className="relative p-2 text-slate-300 hover:text-white transition-colors"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-brand-accent text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto mt-6">
        <div className="px-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by location..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>
          <button className="w-full sm:w-auto bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium flex items-center justify-center gap-2">
            <Camera size={18} />
            Find My Photos
          </button>
        </div>

        <PhotoGrid photos={MOCK_PHOTOS} isLoading={isLoading} />
      </main>
    </motion.div>
  );
};
