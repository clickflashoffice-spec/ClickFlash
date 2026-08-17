import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { PriceTag } from '../common/PriceTag';
import { WatermarkOverlay } from './WatermarkOverlay';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/cartStore';

interface PhotoCardProps {
  photo: {
    id: string;
    url: string;
    price: number;
    location: string;
  };
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo }) => {
  const addItem = useCartStore(state => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ id: photo.id, type: 'digital', price: photo.price, quantity: 1, photoUrl: photo.url });
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-card overflow-hidden group relative"
    >
      <Link to={`/photo/${photo.id}`} className="block relative aspect-[4/3] bg-slate-800">
        <img
          src={photo.url}
          alt={`Photo at ${photo.location}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <WatermarkOverlay />
        
        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-white text-sm font-medium">{photo.location}</p>
              <PriceTag amount={photo.price} className="text-lg" />
            </div>
            <button
              onClick={handleAddToCart}
              className="bg-brand-primary text-white p-2 rounded-full hover:bg-blue-600 transition-colors shadow-lg"
              title="Add to Cart"
            >
              <ShoppingCart size={20} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
