/**
 * PhotoAlbumGrid.tsx — Masonry photo gallery powered by react-photo-album
 *
 * OSS replacement for the custom gallery grid. Provides:
 * - Justified masonry layout with optimal photo density
 * - Responsive breakpoints for mobile/tablet/desktop
 * - Integrated lightbox via yet-another-react-lightbox
 * - Infinite scroll support via callback prop
 *
 * @see https://react-photo-album.com/
 */
import React, { useState, useCallback } from "react";
// @ts-ignore
import PhotoAlbum, { type Photo } from "react-photo-album";
// @ts-ignore
import Lightbox from "yet-another-react-lightbox";
// @ts-ignore
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
// @ts-ignore
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
// @ts-ignore
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
// @ts-ignore
import Zoom from "yet-another-react-lightbox/plugins/zoom";
// @ts-ignore
import Download from "yet-another-react-lightbox/plugins/download";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

export interface GalleryPhoto extends Photo {
  /** Unique photo ID */
  id: string;
  /** Photo title/caption */
  title?: string;
  /** Whether the photo has been purchased */
  purchased?: boolean;
  /** Download URL (only available for purchased photos) */
  downloadUrl?: string;
  /** Thumbnail URL for lightbox thumbnails */
  thumbnailSrc?: string;
}

interface PhotoAlbumGridProps {
  /** Array of photos to display */
  photos: GalleryPhoto[];
  /** Layout type */
  layout?: "rows" | "columns" | "masonry";
  /** Target row height for 'rows' layout (default: 280) */
  targetRowHeight?: number;
  /** Number of columns for 'columns'/'masonry' layout (default: responsive) */
  columns?: number | ((containerWidth: number) => number);
  /** Spacing between photos in pixels (default: 8) */
  spacing?: number;
  /** Callback when a photo is clicked (e.g., to open details) */
  onPhotoClick?: (photo: GalleryPhoto, index: number) => void;
  /** Callback when user scrolls near bottom (infinite scroll) */
  onLoadMore?: () => void;
  /** Whether more photos are available for loading */
  hasMore?: boolean;
  /** Whether the grid is currently loading more photos */
  isLoading?: boolean;
  /** Enable built-in lightbox viewer (default: true) */
  enableLightbox?: boolean;
  /** Custom photo render function */
  renderPhoto?: any;
}

/** Responsive column calculator for masonry layout */
const defaultColumns = (containerWidth: number): number => {
  if (containerWidth < 480) return 2;
  if (containerWidth < 768) return 3;
  if (containerWidth < 1200) return 4;
  if (containerWidth < 1600) return 5;
  return 6;
};

export function PhotoAlbumGrid({
  photos,
  layout = "rows",
  targetRowHeight = 280,
  columns = defaultColumns,
  spacing = 8,
  onPhotoClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  enableLightbox = true,
  renderPhoto,
}: PhotoAlbumGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const handlePhotoClick = useCallback(
    ({ index }: { index: number }) => {
      if (onPhotoClick) {
        onPhotoClick(photos[index], index);
      }
      if (enableLightbox) {
        setLightboxIndex(index);
      }
    },
    [photos, onPhotoClick, enableLightbox]
  );

  // Convert GalleryPhoto[] to lightbox slides format
  const lightboxSlides = photos.map((photo) => ({
    src: photo.src,
    width: photo.width,
    height: photo.height,
    title: photo.title,
    download: photo.purchased ? photo.downloadUrl : undefined,
  }));

  const AlbumComponent: any = PhotoAlbum;

  return (
    <>
      <AlbumComponent
        layout={layout}
        photos={photos}
        targetRowHeight={targetRowHeight}
        columns={columns}
        spacing={spacing}
        onClick={handlePhotoClick}
        render={{ photo: renderPhoto }}
      />

      {/* Infinite scroll trigger */}
      {hasMore && !isLoading && onLoadMore && (
        <div
          style={{ height: 1 }}
          ref={(el) => {
            if (!el) return;
            const observer = new IntersectionObserver(
              ([entry]) => {
                if (entry.isIntersecting) onLoadMore();
              },
              { rootMargin: "200px" }
            );
            observer.observe(el as any);
            return () => observer.disconnect();
          }}
        />
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div className="loading-spinner" />
        </div>
      )}

      {/* Lightbox viewer */}
      {enableLightbox && (
        <Lightbox
          open={lightboxIndex >= 0}
          index={lightboxIndex}
          close={() => setLightboxIndex(-1)}
          slides={lightboxSlides}
          plugins={[Fullscreen, Slideshow, Thumbnails, Zoom, Download]}
          thumbnails={{ position: "bottom", width: 100, height: 80 }}
          zoom={{ maxZoomPixelRatio: 5 }}
        />
      )}
    </>
  );
}

export default PhotoAlbumGrid;
