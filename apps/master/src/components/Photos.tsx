import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useInfinitePhotos } from '../hooks/usePhotos';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import LazyImage from './common/LazyImage';
import Input from './common/Input';
import { FixedSizeGrid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { Sparkles, CheckSquare, Square } from 'lucide-react';
import AIBatchActions from './common/AIBatchActions';
import PageHeader from './common/PageHeader';
import { PhotoGridSkeleton } from './common/Skeleton';

const SentinelCell = React.memo(({ style, gutter, hasNextPage, isFetchingNextPage, fetchNextPage }: {
  style: React.CSSProperties;
  gutter: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchNextPage();
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div
      ref={ref}
      className="flex justify-center items-center pb-[var(--gutter-size)]"
      style={{ ...style, '--gutter-size': `${gutter}px` } as React.CSSProperties}
    >
      {isFetchingNextPage && <Spinner size="medium" />}
    </div>
  );
});
SentinelCell.displayName = 'SentinelCell';

const Photos: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Use Infinite Query
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfinitePhotos('', true); // Passing empty string for albumId to get all photos

  const photos = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || [];
  }, [data]);

  const filteredPhotos = useMemo(() => {
    if (!searchTerm) return photos;
    const term = searchTerm.toLowerCase();
    return photos.filter(photo =>
      photo.title?.toLowerCase().includes(term) ||
      photo.id.toLowerCase().includes(term) ||
      photo.originalFilename?.toLowerCase().includes(term)
    );
  }, [photos, searchTerm]);

  const handlePhotoSelect = (photoId: string) => {
    const newSelected = new Set(selectedPhotoIds);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotoIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.size === filteredPhotos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(filteredPhotos.map(p => p.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds(new Set());
    setShowBatchActions(false);
  };

  if (isLoading && photos.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <PageHeader
          title="Photo Library"
          subtitle="Manage and view all processed assets across all albums."
        />
        <Card className="p-4">
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </Card>
        <PhotoGridSkeleton count={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Photo Library"
        subtitle="Manage and view all processed assets across all albums."
        actions={
          <div className="flex items-center gap-2">
            {selectedPhotoIds.size > 0 && (
              <Button
                variant="primary"
                onClick={() => setShowBatchActions(true)}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                AI Batch ({selectedPhotoIds.size})
              </Button>
            )}
            <Button variant="secondary" onClick={() => refetch()} leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
              Refresh
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <Input
            className="pl-10"
            placeholder="Search by filename, ID, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {filteredPhotos.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
            >
              {selectedPhotoIds.size === filteredPhotos.length ? (
                <><CheckSquare className="h-4 w-4" /> Deselect All</>
              ) : (
                <><Square className="h-4 w-4" /> Select All</>
              )}
            </button>
            {selectedPhotoIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Clear ({selectedPhotoIds.size})
              </button>
            )}
          </div>
        )}
      </Card>

      {isError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          Failed to load photos. Please try again.
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No photos found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your search terms or refresh the library.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[500px]">
          <AutoSizer
            renderProp={({ height, width }) => {
              if (!height || !width) return null;

              const gutter = 16;
              const minWidth = 180;
              const columnCount = Math.max(2, Math.floor(width / (minWidth + gutter)));
              const columnWidth = Math.floor((width - (columnCount - 1) * gutter) / columnCount);
              const rowCount = Math.ceil(filteredPhotos.length / columnCount);
              const rowHeight = columnWidth; // Square aspect ratio

              return (
                <div className="relative h-full w-full">
                  <FixedSizeGrid
                    columnCount={columnCount}
                    columnWidth={columnWidth + gutter}
                    rowCount={rowCount + (hasNextPage ? 1 : 0)}
                    rowHeight={rowHeight + gutter}
                    height={height}
                    width={width}
                  >
                    {({ columnIndex, rowIndex, style }) => {
                      if (rowIndex === rowCount && columnIndex === 0) {
                        return (
                          <SentinelCell
                            key="sentinel"
                            style={style}
                            gutter={gutter}
                            hasNextPage={!!hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            fetchNextPage={fetchNextPage}
                          />
                        );
                      }

                      const index = rowIndex * columnCount + columnIndex;
                      const photo = filteredPhotos[index];
                      if (!photo) return null;

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          style={{
                            ...style,
                            paddingRight: columnIndex === columnCount - 1 ? 0 : gutter,
                            paddingBottom: gutter
                          }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`group relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border-2 transition-all shadow-sm cursor-pointer ${selectedPhotoIds.has(photo.id)
                              ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2'
                              : 'border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-300'
                              }`}
                            onClick={() => handlePhotoSelect(photo.id)}
                          >
                            <LazyImage
                              src={photo.url}
                              alt={photo.title || 'Photo'}
                              className="w-full h-full object-cover"
                            />
                            {selectedPhotoIds.has(photo.id) && (
                              <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                                <CheckSquare className="h-4 w-4" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                              <p className="text-white text-xs font-medium truncate">{photo.originalFilename || photo.title || photo.id}</p>
                            </div>
                          </motion.div>
                        </motion.div>
                      );
                    }}
                  </FixedSizeGrid>
                </div>
              );
            }}
          />
        </div>
      )}

      {showBatchActions && (
        <AIBatchActions
          selectedPhotoIds={Array.from(selectedPhotoIds)}
          onClose={() => setShowBatchActions(false)}
        />
      )}
    </div>
  );
};

export default Photos;
