import React from "react";
import { motion } from "framer-motion";
import { Photo, Album } from "../../../types";
import { useHiResLoader } from "../../../utils/hiResLoader";
import { logger } from "../../../utils/logger";
import { EditorFilters } from "../editor2/EditorFilters";

interface HiResImageProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  activePhoto: Photo;
  photoStyle: any;
  combinedTransform: string;
  cropClipPath?: string;
  isCropping: boolean;
  zoomState: { scale: number };
  handleImageLoad: () => void;
  showToast: (message: string) => void;
  album: Album | null;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

const HiResImage: React.FC<HiResImageProps> = ({
  imageRef,
  activePhoto,
  photoStyle,
  combinedTransform,
  cropClipPath,
  isCropping,
  zoomState,
  handleImageLoad,
  showToast,
  album,
  onClick,
  onMouseMove,
}) => {
  const shouldFetchHiRes = activePhoto?.url && activePhoto.url !== "undefined";
  const {
    hiResBlob,
    isLoading: hiResLoading,
    progress,
  } = useHiResLoader(
    shouldFetchHiRes ? activePhoto?.id || null : null,
    shouldFetchHiRes ? activePhoto?.url || null : null,
  );

  const [hiResUrl, setHiResUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hiResBlob) {
      const url = URL.createObjectURL(hiResBlob);
      setHiResUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [hiResBlob, activePhoto?.id]);

  const imageSrc = hiResUrl || activePhoto.previewUrl || activePhoto.url || "";
  const imageKey = `photo-${activePhoto.id}`;

  return (
    <>
      <EditorFilters
        photoId={activePhoto.id}
        temperature={activePhoto.manualEdits?.temperature || 0}
        tint={activePhoto.manualEdits?.tint || 0}
      />
      <motion.img
        key={imageKey}
        ref={imageRef}
        src={imageSrc}
        alt={activePhoto.title || "Photo"}
        className={`hires-image ${zoomState.scale <= 1 ? "hires-image-fit" : "hires-image-zoom"} 
                    ${(activePhoto.manualEdits?.retouchActions?.length ?? 0) > 0 ? "opacity-0" : "opacity-100"}`}
        style={
          {
            "--image-filter": photoStyle.filter || "none",
            "--image-transform": combinedTransform,
            "--image-clip-path": cropClipPath,
            "--image-transition": isCropping ? "none" : "all 0.3s ease-out",
            "--image-cursor": onClick ? "crosshair" : "default",
          } as any
        }
        onClick={onClick}
        onMouseMove={onMouseMove}
        draggable={false}
        onLoad={handleImageLoad}
        onError={() => {
          logger.error("Failed to load photo", undefined, {
            photoId: activePhoto?.id || "unknown",
            url: activePhoto?.url || "unknown",
            albumId: album?.id || "unknown",
          });
          showToast(
            `Error: Could not load photo "${activePhoto?.title || "Unknown"}".`,
          );
        }}
      />

      {hiResLoading && !hiResUrl && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading full resolution... {progress}%</span>
        </div>
      )}
    </>
  );
};

export default HiResImage;
