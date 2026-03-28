import React, {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
  memo,
} from "react";
import { ManualEdits, Photo } from "@/types";
import { CropBox } from "../../components/CropOverlay";
import { generateCSSFilter } from "@/utils/imageFilters";
import { RetouchCanvas } from "../RetouchCanvas";
import { AnnotationCanvas } from "../AnnotationCanvas";
import { GridOverlay } from "./GridOverlay";
import { RetouchInteractionOverlay } from "./RetouchInteractionOverlay";
import { useZoomPan, ZoomPanState } from "../hooks/useZoomPan";
import { ZoomControls } from "../controls/ZoomControls";
import { LoupeTool } from "../components/LoupeTool";
import { Minimap } from "../components/Minimap";

interface EditorCanvasProps {
  photo: Photo | null;
  edits: ManualEdits | undefined;
  isCropping?: boolean;
  cropAspectRatio?: number;
  onCropApply?: (crop: CropBox) => void;
  onCropCancel?: () => void;
  isRetouching?: boolean;
  isStraightening?: boolean;
  retouchBrushSize?: number;
  retouchStep?: "target" | "source" | "idle";
  retouchTarget?: { x: number; y: number } | null;
  onRetouchClick?: (x: number, y: number) => void;
  // Zoom persistence props
  persistedZoom?: Pick<ZoomPanState, "scale" | "offsetX" | "offsetY"> | null;
  onZoomChange?: (zoom: ZoomPanState) => void;
}

const EditorCanvasComponent: React.FC<EditorCanvasProps> = ({
  photo,
  edits,
  isCropping = false,
  cropAspectRatio: _ = 1,
  onCropApply,
  onCropCancel,
  isRetouching = false,
  isStraightening = false,
  retouchBrushSize = 20,
  retouchStep = "target",
  retouchTarget = null,
  onRetouchClick,
  persistedZoom,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showLoupe, setShowLoupe] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Initialize zoom/pan functionality with persisted state
  const {
    state: zoomState,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    resetOffsets,
    fitToScreen,
    handlers: zoomHandlers,
  } = useZoomPan(
    containerSize,
    dimensions,
    undefined,
    true, // enable animation
  );

  // Handle image load to sync dimensions
  const handleImageLoad = () => {
    if (imageRef.current) {
      const width = imageRef.current.naturalWidth;
      const height = imageRef.current.naturalHeight;
      setDimensions({ width, height });
      setImageLoaded(true);

      // Restore persisted zoom if available
      if (persistedZoom && persistedZoom.scale !== 1) {
        setZoom(persistedZoom.scale);
        // Note: offsets are applied via CSS transform, will be set by zoomState
      }
    }
  };

  // Reset image loaded state when photo changes
  useEffect(() => {
    setImageLoaded(false);
  }, [photo?.id]);

  // Track container size for zoom/pan calculations
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Fit image to viewport with proper centering when photo loads
  const fitToViewport = useCallback(() => {
    if (
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      containerSize.width === 0 ||
      containerSize.height === 0
    )
      return;

    const padding = 40; // Padding around the image
    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;

    const scaleX = availableWidth / dimensions.width;
    const scaleY = availableHeight / dimensions.height;

    // Use Math.min for "contain" mode - entire image fits within viewport
    const containScale = Math.min(scaleX, scaleY, 1.0); // Cap at 100% to avoid upscaling

    setZoom(containScale);
    resetOffsets();
  }, [dimensions, containerSize, setZoom, resetOffsets]);

  // Auto-fit when image dimensions are first known
  useEffect(() => {
    if (imageLoaded && dimensions.width > 0 && containerSize.width > 0) {
      fitToViewport();
    }
  }, [
    imageLoaded,
    dimensions.width,
    dimensions.height,
    containerSize.width,
    containerSize.height,
    fitToViewport,
  ]);

  // Generate CSS filter string
  const filterString = useMemo(() => {
    return generateCSSFilter(edits);
  }, [edits]);

  // Handle click for retouching with proper coordinate transformation
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (
      !isRetouching ||
      !onRetouchClick ||
      !imageRef.current ||
      !containerRef.current
    )
      return;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate click position relative to the container center (which is where the image is centered)
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;

    // Mouse position relative to container center
    const mouseRelativeX = e.clientX - containerCenterX;
    const mouseRelativeY = e.clientY - containerCenterY;

    // Adjust for zoom/pan offset
    const adjustedX = mouseRelativeX - zoomState.offsetX;
    const adjustedY = mouseRelativeY - zoomState.offsetY;

    // Convert to image coordinates (accounting for zoom scale)
    const imageX = adjustedX / zoomState.scale + dimensions.width / 2;
    const imageY = adjustedY / zoomState.scale + dimensions.height / 2;

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(dimensions.width, imageX));
    const clampedY = Math.max(0, Math.min(dimensions.height, imageY));

    onRetouchClick(clampedX, clampedY);
  };

  // Combine transforms: zoom/pan + rotate
  const combinedTransform = useMemo(() => {
    const transforms: string[] = [];

    // Apply zoom/pan
    transforms.push(
      `translate(${zoomState.offsetX}px, ${zoomState.offsetY}px)`,
    );
    transforms.push(`scale(${zoomState.scale})`);

    // Apply rotation from edits
    if (edits?.rotate) {
      transforms.push(`rotate(${edits.rotate}deg)`);
    }

    return transforms.join(" ");
  }, [zoomState.offsetX, zoomState.offsetY, zoomState.scale, edits?.rotate]);

  // Notify parent of zoom changes for persistence
  useEffect(() => {
    if (onZoomChange && imageLoaded) {
      onZoomChange({
        scale: zoomState.scale,
        offsetX: zoomState.offsetX,
        offsetY: zoomState.offsetY,
        isPanning: zoomState.isPanning,
        isAnimating: zoomState.isAnimating,
      });
    }
  }, [
    zoomState.scale,
    zoomState.offsetX,
    zoomState.offsetY,
    zoomState.isPanning,
    zoomState.isAnimating,
    onZoomChange,
    imageLoaded,
  ]);

  // Handle mouse move for loupe and coordinate tracking
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      zoomHandlers.onMouseMove(e);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    [zoomHandlers],
  );

  // Handle Z key for loupe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "z" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
          )
        ) {
          setShowLoupe(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "z") {
        setShowLoupe(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  if (!photo) {
    return (
      <div
        className="w-full h-full flex items-center justify-center text-gray-400"
        role="status"
        aria-label="No photo selected"
      >
        No photo selected
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gray-100 select-none touch-none"
      onClick={handleCanvasClick}
      onMouseDown={(e) => {
        if (!isCropping && !isRetouching) {
          zoomHandlers.onMouseDown(e);
        }
      }}
      onMouseMove={(e) => {
        if (!isCropping) {
          handleMouseMove(e);
        }
      }}
      onMouseUp={zoomHandlers.onMouseUp}
      onMouseLeave={zoomHandlers.onMouseLeave}
      onWheel={zoomHandlers.onWheel}
      onDoubleClick={zoomHandlers.onDoubleClick}
      onTouchStart={zoomHandlers.onTouchStart}
      onTouchMove={zoomHandlers.onTouchMove}
      onTouchEnd={zoomHandlers.onTouchEnd}
      role="img"
      aria-label={`Editing photo ${photo.id.slice(0, 8)}`}
    >
      {/* 
        Transform Container
        Wraps the image and applies zoom/pan/rotate transforms
      */}
      <div
        className="relative flex items-center justify-center"
        style={{
          transform: combinedTransform,
          transition: zoomState.isPanning ? "none" : "transform 200ms ease-out",
          cursor: zoomState.isPanning
            ? "grabbing"
            : zoomState.scale > 1
              ? "grab"
              : "default",
          willChange: "transform",
        }}
      >
        {/* Main Image Layer */}
        <img
          ref={imageRef}
          src={photo.url}
          alt={photo.id}
          onLoad={handleImageLoad}
          className="object-contain pointer-events-none select-none shadow-2xl"
          style={{
            width: dimensions.width || "auto",
            height: dimensions.height || "auto",
            maxWidth: containerSize.width > 0 ? containerSize.width : "100%",
            maxHeight: containerSize.height > 0 ? containerSize.height : "100%",
            filter: filterString,
          }}
          draggable={false}
        />

        {/* Retouch Layer */}
        {imageLoaded && (
          <RetouchCanvas
            imageElement={imageRef.current}
            edits={edits}
            className="absolute inset-0 z-10"
          />
        )}

        {/* Annotation Layer */}
        {imageLoaded && (
          <AnnotationCanvas
            naturalSize={dimensions}
            edits={edits}
            isDrawing={false}
            brushColor="#ff0000"
            brushSize={5}
            onAnnotationAdd={() => {}}
            className="absolute inset-0 z-20"
          />
        )}

        {/* Interaction Overlays */}
        {imageLoaded && isRetouching && (
          <RetouchInteractionOverlay
            step={retouchStep || "idle"}
            target={retouchTarget}
            brushSize={retouchBrushSize}
            imageWidth={dimensions.width}
            imageHeight={dimensions.height}
            naturalWidth={dimensions.width}
            naturalHeight={dimensions.height}
            className="absolute inset-0 z-30"
          />
        )}

        {/* Straightening / Crop Grid */}
        {imageLoaded && (isCropping || isStraightening) && (
          <GridOverlay
            visible={true}
            type={isStraightening ? "fine" : "rule-of-thirds"}
          />
        )}

        {/* Crop Controls (Simulated for Now) */}
        {imageLoaded && isCropping && (
          <div className="absolute inset-0 z-40 border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCropCancel?.();
                }}
                className="px-3 py-1 bg-gray-800 text-white text-xs rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCropApply?.({
                    x: 0,
                    y: 0,
                    width: dimensions.width,
                    height: dimensions.height,
                  });
                }}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zoom Controls - Bottom Right */}
      <ZoomControls
        scale={zoomState.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        onFitToScreen={fitToScreen}
        onActualPixels={() => setZoom(1)}
      />

      {/* Zoom Level Indicator - Top Left */}
      <div
        className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-gray-600 shadow-sm border border-gray-200"
        role="status"
        aria-live="polite"
        aria-label={`Zoom level ${Math.round(zoomState.scale * 100)} percent`}
      >
        {Math.round(zoomState.scale * 100)}%
        {zoomState.scale !== 1 && (
          <span className="ml-2 text-gray-400">
            (
            {zoomState.offsetX !== 0 || zoomState.offsetY !== 0
              ? "panned"
              : "centered"}
            )
          </span>
        )}
      </div>

      {/* Keyboard Shortcuts Hint - Bottom Left */}
      <div
        className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-gray-500 space-y-1 shadow-sm border border-gray-200"
        aria-label="Keyboard shortcuts"
      >
        <div>Ctrl + Wheel: Zoom</div>
        <div>Space + Drag: Pan</div>
        <div>Hold Z: Magnifier</div>
        <div>Double-click: Reset</div>
      </div>

      {/* Minimap - Top Right (when zoomed) */}
      {imageLoaded && zoomState.scale > 1 && (
        <div className="absolute top-4 right-20">
          <Minimap
            imageWidth={dimensions.width}
            imageHeight={dimensions.height}
            viewportWidth={containerSize.width}
            viewportHeight={containerSize.height}
            scale={zoomState.scale}
            offsetX={zoomState.offsetX}
            offsetY={zoomState.offsetY}
          />
        </div>
      )}

      {/* Loupe/Magnifier Tool */}
      {imageLoaded && showLoupe && (
        <LoupeTool
          imageElement={imageRef.current}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          zoomLevel={2}
          size={150}
        />
      )}
    </div>
  );
};

// Memoize with custom comparison for performance
export const EditorCanvas = memo(
  EditorCanvasComponent,
  (prevProps, nextProps) => {
    // Custom comparison to avoid unnecessary re-renders
    return (
      prevProps.photo?.id === nextProps.photo?.id &&
      prevProps.isCropping === nextProps.isCropping &&
      prevProps.isRetouching === nextProps.isRetouching &&
      prevProps.isStraightening === nextProps.isStraightening &&
      prevProps.retouchStep === nextProps.retouchStep &&
      prevProps.retouchTarget?.x === nextProps.retouchTarget?.x &&
      prevProps.retouchTarget?.y === nextProps.retouchTarget?.y &&
      prevProps.retouchBrushSize === nextProps.retouchBrushSize &&
      // Shallow compare edits
      JSON.stringify(prevProps.edits) === JSON.stringify(nextProps.edits)
    );
  },
);

EditorCanvas.displayName = "EditorCanvas";

export default EditorCanvas;
