import React from 'react';

interface WatermarkOverlayProps {
  className?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 select-none ${className}`}>
      <div className="text-white text-2xl font-bold tracking-widest rotate-[-30deg] uppercase" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        ClickFlash Preview
      </div>
    </div>
  );
};
