import React, { useRef, useCallback } from "react";
import { generateCSSFilter } from "@/utils/imageFilters";
import { ManualEdits } from "@/types/shared";

interface ImageExporterProps {
  imageUrl: string;
  edits: ManualEdits | undefined;
  onExport?: (blob: Blob) => void;
  fileName?: string;
  quality?: number;
  format?: "image/jpeg" | "image/png" | "image/webp";
}

export const ImageExporter: React.FC<ImageExporterProps> = ({
  imageUrl,
  edits,
  onExport,
  fileName = "edited-image.jpg",
  quality = 0.95,
  format = "image/jpeg",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const exportImage = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Load image
    const img = new Image();
    img.crossOrigin = "anonymous";

    return new Promise((resolve) => {
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Apply CSS filters
        const filterString = generateCSSFilter(edits);
        if (filterString !== "none") {
          ctx.filter = filterString;
        }

        // Apply rotation if needed
        if (edits?.rotate) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((edits.rotate * Math.PI) / 180);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        // Handle crop
        if (edits?.crop) {
          const { x, y, width, height } = edits.crop;
          ctx.drawImage(
            img,
            x,
            y,
            width,
            height,
            0,
            0,
            canvas.width,
            canvas.height,
          );
        } else {
          ctx.drawImage(img, 0, 0);
        }

        // Restore context
        ctx.restore();

        // Apply vignette if present
        if (edits?.vignette && edits.vignette > 0) {
          const gradient = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height) / 2,
          );

          const alpha = edits.vignette / 100;
          gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
          gradient.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.3})`);
          gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob && onExport) {
              onExport(blob);
            }
            resolve(blob);
          },
          format,
          quality,
        );
      };

      img.onerror = () => {
        console.error("Failed to load image for export");
        resolve(null);
      };

      img.src = imageUrl;
    });
  }, [imageUrl, edits, onExport, format, quality]);

  const downloadImage = useCallback(async () => {
    const blob = await exportImage();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportImage, fileName]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={downloadImage}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download
      </button>
    </>
  );
};

export default ImageExporter;
