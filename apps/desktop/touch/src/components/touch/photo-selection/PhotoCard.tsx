import React from 'react';
import { Photo } from '../../../types';

export const PhotoCard: React.FC<{
  photo: Photo;
  isInCart: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}> = React.memo(
  ({ photo, isInCart, onClick, style }) => (
    <div
      className="group cursor-pointer aspect-square relative"
      onClick={onClick}
      style={style}
    >
      <img
        src={photo.url}
        alt={photo.title}
        className="w-full h-full object-cover rounded-lg shadow-md transition-transform group-hover:scale-105"
        loading="lazy"
      />
      {isInCart && (
        <div
          className="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg"
          aria-label="Photo in cart"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  ),
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.photo.id === nextProps.photo.id &&
      prevProps.photo.url === nextProps.photo.url &&
      prevProps.isInCart === nextProps.isInCart &&
      prevProps.style === nextProps.style
    ); // Style prop from VirtualGrid is stable
  }
);

PhotoCard.displayName = 'PhotoCard';
