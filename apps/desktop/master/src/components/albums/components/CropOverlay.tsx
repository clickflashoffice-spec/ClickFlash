import React, { useState, useCallback, useRef, useEffect } from "react";
import { Check, X, RotateCw, Maximize, Lock } from "lucide-react";
import styled from "@emotion/styled";

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CropBoxContainer = styled.div<{
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
}>`
  left: ${(props) => props.displayX}px;
  top: ${(props) => props.displayY}px;
  width: ${(props) => props.displayWidth}px;
  height: ${(props) => props.displayHeight}px;
`;

interface CropOverlayProps {
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  zoomState: { scale: number; offsetX: number; offsetY: number };
  initialCrop?: CropBox | null;
  aspectRatio?: number | null;
  onApply: (crop: CropBox) => void;
  onCancel: () => void;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  zoomState,
  initialCrop,
  aspectRatio,
  onApply,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cropBox, setCropBox] = useState<CropBox>(() => {
    if (initialCrop) return initialCrop;

    if (aspectRatio) {
      // Default to maximizing height (98%) for all photos to ensure "fit full vertical"
      let height = imageHeight * 0.98;
      let width = height * aspectRatio;

      // If width exceeds image bounds, recalculate based on width
      if (width > imageWidth * 0.98) {
        width = imageWidth * 0.98;
        height = width / aspectRatio;
      }

      return {
        x: (imageWidth - width) / 2,
        y: (imageHeight - height) / 2,
        width,
        height,
      };
    }

    // Default to a 98% coverage centered box if no aspect ratio is set
    const width = imageWidth * 0.98;
    const height = imageHeight * 0.98;

    return {
      x: (imageWidth - width) / 2,
      y: (imageHeight - height) / 2,
      width,
      height,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    crop: CropBox;
  } | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  // Calculate constrained crop box
  const constrainToImage = useCallback(
    (box: CropBox): CropBox => {
      let { x, y, width, height } = box;

      // Minimum crop size (in image pixels)
      const minSize = 50;

      // Ensure minimum size
      width = Math.max(minSize, width);
      height = Math.max(minSize, height);

      // Apply aspect ratio constraint if set
      if (aspectRatio) {
        const currentRatio = width / height;
        if (Math.abs(currentRatio - aspectRatio) > 0.01) {
          // Adjust to match aspect ratio, preferring the larger dimension
          if (currentRatio > aspectRatio) {
            width = height * aspectRatio;
          } else {
            height = width / aspectRatio;
          }
        }
      }

      // Constrain to image bounds
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x + width > imageWidth) {
        x = imageWidth - width;
        if (x < 0) {
          x = 0;
          width = imageWidth;
          if (aspectRatio) {
            height = width / aspectRatio;
          }
        }
      }
      if (y + height > imageHeight) {
        y = imageHeight - height;
        if (y < 0) {
          y = 0;
          height = imageHeight;
          if (aspectRatio) {
            width = height * aspectRatio;
          }
        }
      }

      return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      };
    },
    [imageWidth, imageHeight, aspectRatio],
  );

  // Update crop box when aspect ratio changes
  useEffect(() => {
    if (aspectRatio) {
      setCropBox((prev) => constrainToImage(prev));
    }
  }, [aspectRatio, constrainToImage]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle?: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setActiveHandle(handle || null);
      setDragStart({ x: e.clientX, y: e.clientY, crop: { ...cropBox } });
    },
    [cropBox],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart) return;

      const deltaX = (e.clientX - dragStart.x) / zoomState.scale;
      const deltaY = (e.clientY - dragStart.y) / zoomState.scale;
      const useRatio = aspectRatio || e.shiftKey;
      const effectiveRatio =
        aspectRatio || dragStart.crop.width / dragStart.crop.height;

      const startCrop = dragStart.crop;
      const newBox = { ...startCrop };

      if (activeHandle) {
        // Resize from handle
        switch (activeHandle) {
          case "nw": {
            newBox.x = startCrop.x + deltaX;
            newBox.y = startCrop.y + deltaY;
            newBox.width = startCrop.width - deltaX;
            newBox.height = startCrop.height - deltaY;
            break;
          }
          case "ne": {
            newBox.y = startCrop.y + deltaY;
            newBox.width = startCrop.width + deltaX;
            newBox.height = startCrop.height - deltaY;
            break;
          }
          case "sw": {
            newBox.x = startCrop.x + deltaX;
            newBox.width = startCrop.width - deltaX;
            newBox.height = startCrop.height + deltaY;
            break;
          }
          case "se": {
            newBox.width = startCrop.width + deltaX;
            newBox.height = startCrop.height + deltaY;
            break;
          }
        }

        // Apply aspect ratio during resize
        if (useRatio) {
          // Calculate which dimension to adjust based on handle
          const isCorner = ["nw", "ne", "sw", "se"].includes(activeHandle);

          if (isCorner) {
            // For corners, use the larger delta to determine the size
            const absDeltaX = Math.abs(newBox.width - startCrop.width);
            const absDeltaY = Math.abs(newBox.height - startCrop.height);

            if (absDeltaX > absDeltaY) {
              // Width changed more, adjust height
              newBox.height = newBox.width / effectiveRatio;
            } else {
              // Height changed more, adjust width
              newBox.width = newBox.height * effectiveRatio;
            }

            // Adjust position based on handle
            if (activeHandle.includes("n")) {
              newBox.y = startCrop.y + startCrop.height - newBox.height;
            }
            if (activeHandle.includes("w")) {
              newBox.x = startCrop.x + startCrop.width - newBox.width;
            }
          } else {
            // Edge handles (n, s, e, w) - force ratio from one side
            if (activeHandle === "n" || activeHandle === "s") {
              newBox.width = newBox.height * effectiveRatio;
              newBox.x = startCrop.x + (startCrop.width - newBox.width) / 2;
            } else {
              newBox.height = newBox.width / effectiveRatio;
              newBox.y = startCrop.y + (startCrop.height - newBox.height) / 2;
            }
          }
        }
      } else {
        // Move entire box
        newBox.x = startCrop.x + deltaX;
        newBox.y = startCrop.y + deltaY;
      }

      setCropBox(constrainToImage(newBox));
    },
    [
      isDragging,
      dragStart,
      activeHandle,
      zoomState.scale,
      aspectRatio,
      constrainToImage,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
    setDragStart(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove as any);
      return () => {
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("mousemove", handleMouseMove as any);
      };
    }
  }, [isDragging, handleMouseUp, handleMouseMove]);

  const handleReset = () => {
    const minDim = Math.min(imageWidth, imageHeight);
    const size = minDim * 0.9;

    if (aspectRatio) {
      let width = size;
      let height = width / aspectRatio;

      if (height > imageHeight * 0.9) {
        height = imageHeight * 0.9;
        width = height * aspectRatio;
      }

      setCropBox({
        x: (imageWidth - width) / 2,
        y: (imageHeight - height) / 2,
        width,
        height,
      });
    } else {
      setCropBox({
        x: imageWidth * 0.05,
        y: imageHeight * 0.05,
        width: imageWidth * 0.9,
        height: imageHeight * 0.9,
      });
    }
  };

  const handleFlip = () => {
    if (aspectRatio) return; // Don't flip if locked to aspect ratio
    setCropBox((prev) => ({
      ...prev,
      width: prev.height,
      height: prev.width,
    }));
  };

  // Calculate display position accounting for zoom AND centered viewport
  // Center of viewport - Half of Scaled Image Width = Left edge of image
  const centerX = containerWidth / 2 + zoomState.offsetX;
  const centerY = containerHeight / 2 + zoomState.offsetY;

  // Relative position of crop box top-left from image center
  // cropBox.x - imageWidth / 2
  const displayX = centerX + (cropBox.x - imageWidth / 2) * zoomState.scale;
  const displayY = centerY + (cropBox.y - imageHeight / 2) * zoomState.scale;

  const displayWidth = cropBox.width * zoomState.scale;
  const displayHeight = cropBox.height * zoomState.scale;

  return (
    <div className="absolute inset-0 z-10">
      {/* Dark overlay outside crop area */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="crop-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={displayX}
              y={displayY}
              width={displayWidth}
              height={displayHeight}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#crop-mask)"
        />
      </svg>

      {/* Crop box */}
      <CropBoxContainer
        ref={containerRef}
        className="absolute border-2 border-white shadow-lg cursor-move"
        displayX={displayX}
        displayY={displayY}
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        onMouseDown={(e: React.MouseEvent) => handleMouseDown(e as any)}
      >
        {/* Rule of thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/60" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/60" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/60" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/60" />
        </div>

        {/* Center lock indicator if aspect ratio is active */}
        {aspectRatio && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <Lock className="w-12 h-12 text-white" />
          </div>
        )}

        {/* Resize handles - larger touch targets */}
        <div
          className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-blue-500 cursor-nw-resize rounded-full shadow-lg z-50 hover:scale-125 transition-transform"
          onMouseDown={(e) => handleMouseDown(e, "nw")}
        />
        <div
          className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-blue-500 cursor-ne-resize rounded-full shadow-lg z-50 hover:scale-125 transition-transform"
          onMouseDown={(e) => handleMouseDown(e, "ne")}
        />
        <div
          className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-blue-500 cursor-sw-resize rounded-full shadow-lg z-50 hover:scale-125 transition-transform"
          onMouseDown={(e) => handleMouseDown(e, "sw")}
        />
        <div
          className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-blue-500 cursor-se-resize rounded-full shadow-lg z-50 hover:scale-125 transition-transform"
          onMouseDown={(e) => handleMouseDown(e, "se")}
        />

        {/* Edge handles for easier resizing */}
        <div
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-blue-500/40 cursor-n-resize rounded-full hover:bg-blue-500/60 transition-colors"
          onMouseDown={(e) => handleMouseDown(e, "n")}
        />
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-blue-500/40 cursor-s-resize rounded-full hover:bg-blue-500/60 transition-colors"
          onMouseDown={(e) => handleMouseDown(e, "s")}
        />
        <div
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-12 bg-blue-500/40 cursor-w-resize rounded-full hover:bg-blue-500/60 transition-colors"
          onMouseDown={(e) => handleMouseDown(e, "w")}
        />
        <div
          className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-12 bg-blue-500/40 cursor-e-resize rounded-full hover:bg-blue-500/60 transition-colors"
          onMouseDown={(e) => handleMouseDown(e, "e")}
        />
      </CropBoxContainer>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/50">
        {!aspectRatio && (
          <button
            onClick={handleFlip}
            className="p-2.5 hover:bg-slate-700 rounded-xl text-white transition-all hover:scale-110 active:scale-95"
            title="Flip Orientation"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={handleReset}
          className="p-2.5 hover:bg-slate-700 rounded-xl text-white transition-all hover:scale-110 active:scale-95"
          title="Reset to Full Image"
        >
          <Maximize className="w-5 h-5" />
        </button>
        <div className="w-px h-8 bg-white/10 mx-1" />
        <button
          onClick={() => onApply(cropBox)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
        >
          <Check className="w-5 h-5" />
          Apply Crop
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
      </div>

      {/* Aspect ratio indicator */}
      {aspectRatio && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 px-3 py-1 rounded text-white text-sm">
          Locked:{" "}
          {aspectRatio >= 1
            ? `${Math.round(aspectRatio * 10) / 10}:1`
            : `1:${Math.round(10 / aspectRatio) / 10}`}
        </div>
      )}
    </div>
  );
};

export default CropOverlay;
