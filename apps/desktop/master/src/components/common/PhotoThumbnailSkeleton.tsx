import React from 'react';

interface PhotoThumbnailSkeletonProps {
  count?: number;
}

export const PhotoThumbnailSkeleton: React.FC<PhotoThumbnailSkeletonProps> = ({ 
  count = 8 
}) => {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          className="w-32 h-32 flex-shrink-0 rounded overflow-hidden bg-gray-200 animate-pulse"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200"></div>
        </div>
      ))}
    </div>
  );
};

export default PhotoThumbnailSkeleton;
