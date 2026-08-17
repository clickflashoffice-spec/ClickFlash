import React from 'react';
import { PhotoCard } from './PhotoCard';
import { Skeleton } from '../common/Skeleton';

interface PhotoGridProps {
  photos: Array<{
    id: string;
    url: string;
    price: number;
    location: string;
  }>;
  isLoading?: boolean;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-lg">No photos found.</p>
        <p className="text-sm">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {photos.map(photo => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
};
