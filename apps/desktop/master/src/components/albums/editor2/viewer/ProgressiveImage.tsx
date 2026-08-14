import React, { useState, forwardRef, useEffect } from "react";
import { logger } from "@/utils/logger";

interface ProgressiveImageProps {
  previewUrl: string;
  fullResUrl: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (naturalWidth: number, naturalHeight: number) => void;
  onError?: () => void;
  showHiRes?: boolean;
}

export const ProgressiveImage = forwardRef<
  HTMLImageElement,
  ProgressiveImageProps
>(
  (
    {
      previewUrl,
      fullResUrl,
      alt = "",
      className,
      style,
      onLoad,
      onError,
      showHiRes = false,
    },
    ref,
  ) => {
    const [imgError, setImgError] = useState(false);
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

    // Reset state when image URL changes
    useEffect(() => {
      setImgError(false);
      setLoadedUrl(null);
    }, [previewUrl, fullResUrl]);

    // Monitor for fullResUrl availability and create blob URL if needed
    // In a real implementation this might fetch the blob, but here we assume logic
    // or external loader passes a URL or we fetch it.
    // Given the previous design used a hook for hi-res loading, we'll accept the hook's result upstream
    // OR we implement the fetching here if we want total isolation.
    // For this rebuild, let's keep it simple: We Render what we are given,
    // but we can handle the "flicker" safety.

    // Actually, looking at the plan: "Purely handles Blob/URL lifecycle".
    // The previous `useHiResLoader` returned a Blob.
    // We should probably accept the *Source* and handle the loading/blobbing here
    // OR accept the Blob/URL from the parent.
    // To decouple, let's have this component strictly handle the RENDERING
    // of the two images (preview underlay, hires overlay) and the error fallback.

    // Note: The parent `ImageViewer` will likely still usage `useHiResLoader`
    // because that hook involves global caching/queueing logic which involves Side Effects
    // best kept at the container or a specialized hook, not inside the render component strictly.
    // BUT the error in the original file was `URL.createObjectURL(hiResBlob)`
    // running in a way that might have raced.

    // Let's assume the parent passes the finalized HiRes URL (blob or string)
    // OR we assume the parent passes the blob and WE create the URL.

    // DECISION: Parent passes standard URLs. `ImageViewer` integration layer handles the `useHiResLoader` -> `createObjectUrl` bridge
    // to keep this component pure?
    // NO, the plan said "Encapsulates URL.createObjectURL lifecycle".
    // So we should accept `hiResBlob` as a prop potentially.

    return (
      <div className="relative" style={{ width: "100%", height: "100%" }}>
        {/* Preview Layer */}
        <img
          src={previewUrl}
          alt={alt}
          className={className}
          style={{
            ...style,
            opacity: showHiRes && !imgError && loadedUrl === fullResUrl ? 0 : 1,
          }}
          onLoad={(e) => {
            setLoadedUrl(previewUrl);
            onLoad?.(
              e.currentTarget.naturalWidth,
              e.currentTarget.naturalHeight,
            );
          }}
          onError={() => {
            logger.error("Preview load failure", previewUrl);
            setImgError(true);
            onError?.();
          }}
          draggable={false}
          ref={!showHiRes || imgError ? ref : undefined}
        />

        {/* HiRes Layer */}
        {showHiRes && fullResUrl && !imgError && (
          <img
            ref={ref}
            src={fullResUrl}
            alt={alt}
            className={`${className} absolute inset-0`}
            style={{ ...style, opacity: loadedUrl === fullResUrl ? 1 : 0 }}
            onLoad={() => setLoadedUrl(fullResUrl)}
            onError={() => {
              logger.error("HiRes load failure", fullResUrl);
              setImgError(true);
            }}
            draggable={false}
          />
        )}
      </div>
    );
  },
);

ProgressiveImage.displayName = "ProgressiveImage";
