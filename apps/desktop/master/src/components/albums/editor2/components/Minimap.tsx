import React, { useMemo } from 'react';

interface MinimapProps {
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  className?: string;
}

export const Minimap: React.FC<MinimapProps> = ({
  imageWidth,
  imageHeight,
  viewportWidth,
  viewportHeight,
  scale,
  offsetX,
  offsetY,
  className = '',
}) => {
  const MINIMAP_SIZE = 120;
  
  const layout = useMemo(() => {
    if (imageWidth === 0 || imageHeight === 0) return null;
    
    // Calculate minimap dimensions maintaining aspect ratio
    const imageAspect = imageWidth / imageHeight;
    let minimapWidth = MINIMAP_SIZE;
    let minimapHeight = MINIMAP_SIZE / imageAspect;
    
    if (minimapHeight > MINIMAP_SIZE) {
      minimapHeight = MINIMAP_SIZE;
      minimapWidth = MINIMAP_SIZE * imageAspect;
    }
    
    // Scale factors
    const scaleX = minimapWidth / imageWidth;
    const scaleY = minimapHeight / imageHeight;
    
    // Calculate viewport rectangle on minimap
    // Viewport size in image coordinates
    const viewportImageWidth = viewportWidth / scale;
    const viewportImageHeight = viewportHeight / scale;
    
    // Viewport position (centered on image, adjusted by offset)
    // offset is in screen pixels, convert to image pixels
    const viewportImageX = (imageWidth - viewportImageWidth) / 2 - (offsetX / scale);
    const viewportImageY = (imageHeight - viewportImageHeight) / 2 - (offsetY / scale);
    
    // Convert to minimap coordinates
    const viewportMinimapX = viewportImageX * scaleX;
    const viewportMinimapY = viewportImageY * scaleY;
    const viewportMinimapWidth = viewportImageWidth * scaleX;
    const viewportMinimapHeight = viewportImageHeight * scaleY;
    
    return {
      minimapWidth,
      minimapHeight,
      scaleX,
      scaleY,
      viewportRect: {
        x: viewportMinimapX,
        y: viewportMinimapY,
        width: viewportMinimapWidth,
        height: viewportMinimapHeight,
      },
    };
  }, [imageWidth, imageHeight, viewportWidth, viewportHeight, scale, offsetX, offsetY]);
  
  if (!layout) return null;
  
  const { minimapWidth, minimapHeight, viewportRect } = layout;
  
  // Clamp viewport rect to minimap bounds for display
  const clampedRect = {
    x: Math.max(0, Math.min(minimapWidth - 2, viewportRect.x)),
    y: Math.max(0, Math.min(minimapHeight - 2, viewportRect.y)),
    width: Math.max(2, Math.min(minimapWidth - viewportRect.x, viewportRect.width)),
    height: Math.max(2, Math.min(minimapHeight - viewportRect.y, viewportRect.height)),
  };
  
  return (
    <div 
      className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 overflow-hidden ${className}`}
      style={{ width: minimapWidth, height: minimapHeight }}
      aria-label="Minimap showing current view position"
    >
      {/* Image representation */}
      <div 
        className="absolute inset-0 bg-gray-100"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
            linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
            linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
          `,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
        }}
      />
      
      {/* Viewport indicator */}
      <div
        className="absolute border-2 border-blue-500 bg-blue-500/10"
        style={{
          left: clampedRect.x,
          top: clampedRect.y,
          width: clampedRect.width,
          height: clampedRect.height,
        }}
      />
      
      {/* Zoom level indicator */}
      <div className="absolute bottom-1 right-1 text-[8px] font-medium text-gray-500 bg-white/80 px-1 rounded">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export default Minimap;
