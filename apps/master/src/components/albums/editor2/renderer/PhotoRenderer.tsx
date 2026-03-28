import React, { memo, forwardRef, useState, useCallback } from "react";
import { Photo, ManualEdits } from "../../../../types";
import { usePhotoStyle } from "../hooks/usePhotoStyle";
import { EditorFilters } from "../EditorFilters";
// Fix import - ProgressiveImage is default exported
import { ProgressiveImage } from "../viewer/ProgressiveImage";
import { getOrientationTransform } from "@/utils/exifOrientation";

interface PhotoRendererProps {
  photo: Photo;
  edits: ManualEdits | undefined;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (width: number, height: number) => void;
  isStraightening?: boolean;
}

export const PhotoRenderer = memo(
  forwardRef<HTMLImageElement, PhotoRendererProps>((props, ref) => {
    const { photo, edits, className, style: propStyle, onLoad } = props;

    // Track natural image dimensions for crop calculation
    const [imageDimensions, setImageDimensions] = useState({
      width: 0,
      height: 0,
    });

    // Generate CSS filter/transform/clipPath strings with image dimensions
    const { filter, transform, clipPath, transformOrigin } = usePhotoStyle(
      edits,
      false,
      imageDimensions.width,
      imageDimensions.height,
      photo.id,
    );

    // Apply EXIF orientation auto-rotation
    const orientationTransform = getOrientationTransform(photo.orientation || photo.metadata?.orientation);
    
    // Combine manual edits transform with orientation transform
    const finalTransform = orientationTransform 
      ? `${transform || ''} ${orientationTransform}`.trim()
      : transform;

    const combinedStyle: React.CSSProperties = {
      ...propStyle,
      filter,
      transform: finalTransform,
      clipPath,
      transformOrigin: transformOrigin || 'center center',
      willChange: "transform, filter",
    };

    // Handle image load to get natural dimensions
    const handleLoad = useCallback(
      (width: number, height: number) => {
        setImageDimensions({ width, height });
        onLoad?.(width, height);
      },
      [onLoad],
    );

    // FIX: Always show hi-res for full frame preview
    // Use previewUrl as fallback if url is not available
    const imageUrl = photo.url || photo.previewUrl || photo.thumbnailUrl || "";
    const previewUrl = photo.previewUrl || photo.thumbnailUrl || photo.url || "";

    // Calculate aspect ratio for proper container sizing
    const aspectRatio = imageDimensions.width > 0 && imageDimensions.height > 0
      ? imageDimensions.width / imageDimensions.height
      : undefined;

    return (
      <div 
        className={`relative flex items-center justify-center ${className || ""}`}
        style={{ 
          aspectRatio: aspectRatio,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {edits && (
          <EditorFilters
            photoId={photo.id}
            temperature={edits.temperature || 0}
            tint={edits.tint || 0}
          />
        )}

        <ProgressiveImage
          ref={ref}
          previewUrl={previewUrl}
          fullResUrl={imageUrl}
          alt={photo.originalFilename || photo.title || "Photo"}
          className="w-full h-full object-contain pointer-events-none select-none block"
          style={combinedStyle}
          onLoad={handleLoad}
          showHiRes={true}
        />
      </div>
    );
  }),
);

PhotoRenderer.displayName = "PhotoRenderer";
