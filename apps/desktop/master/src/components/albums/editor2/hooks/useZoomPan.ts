import { useState, useRef, useCallback, useEffect } from "react";

export interface ZoomPanState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isPanning: boolean;
  isAnimating: boolean;
}

export interface ZoomBounds {
  min: number;
  max: number;
}

export interface UseZoomPanReturn {
  state: ZoomPanState;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  resetOffsets: () => void;
  fitToScreen: () => void;
  setZoom: (scale: number, centerX?: number, centerY?: number) => void;
  pan: (dx: number, dy: number) => void;
  panByKeyboard: (
    direction: "up" | "down" | "left" | "right",
    step?: number,
  ) => void;
  handlers: {
    onWheel: (e: React.WheelEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onDoubleClick: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

const DEFAULT_MIN_SCALE = 0.1; // 10%
const DEFAULT_MAX_SCALE = 5.0; // 500%
const ZOOM_STEP = 1.2; // 20% per step
const PAN_THRESHOLD = 5; // Minimum pixels to start panning
const KEYBOARD_PAN_STEP = 50; // Pixels per keypress
const ANIMATION_DURATION = 200; // ms

export interface Size {
  width: number;
  height: number;
}

export function useZoomPan(
  containerSize: Size = { width: 0, height: 0 },
  contentSize: Size = { width: 0, height: 0 },
  bounds?: ZoomBounds,
  enableAnimation: boolean = true,
): UseZoomPanReturn {
  const minScale = bounds?.min ?? DEFAULT_MIN_SCALE;
  const maxScale = bounds?.max ?? DEFAULT_MAX_SCALE;

  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Track mouse state for panning
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const spacePressed = useRef(false);

  // Track animation frame ID for cleanup
  const rafId = useRef<number | null>(null);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []);

  // Use a ref to track state for the mouse move handler to avoid closure staleness
  const stateRef = useRef({ scale, offsetX, offsetY });
  useEffect(() => {
    stateRef.current = { scale, offsetX, offsetY };
  }, [scale, offsetX, offsetY]);

  const clampScale = useCallback(
    (value: number): number => {
      return Math.max(minScale, Math.min(maxScale, value));
    },
    [minScale, maxScale],
  );

  const getBounds = useCallback(
    (currentScale: number) => {
      if (containerSize.width === 0 || contentSize.width === 0) {
        return {
          minX: -Infinity,
          maxX: Infinity,
          minY: -Infinity,
          maxY: Infinity,
        };
      }

      const scaledW = contentSize.width * currentScale;
      const scaledH = contentSize.height * currentScale;

      // If content is smaller than container at this scale, we essentially center it
      // and allow zero pan. If larger, we allow panning up to the edges.
      const padding = 20; // Allow 20px overlap/margin
      const boundX = Math.max(0, (scaledW - containerSize.width) / 2) + padding;
      const boundY =
        Math.max(0, (scaledH - containerSize.height) / 2) + padding;

      return {
        minX: -boundX,
        maxX: boundX,
        minY: -boundY,
        maxY: boundY,
      };
    },
    [containerSize, contentSize],
  );

  const clampOffsets = useCallback(
    (x: number, y: number, currentScale: number) => {
      const bounds = getBounds(currentScale);
      return {
        x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
      };
    },
    [getBounds],
  );

  const animateZoom = useCallback(
    (targetScale: number, targetOffsetX: number, targetOffsetY: number) => {
      if (!enableAnimation) {
        setScale(targetScale);
        setOffsetX(targetOffsetX);
        setOffsetY(targetOffsetY);
        return;
      }

      // Cancel any ongoing animation before starting new one
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }

      setIsAnimating(true);
      const startScale = stateRef.current.scale;
      const startOffsetX = stateRef.current.offsetX;
      const startOffsetY = stateRef.current.offsetY;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const currentScale =
          startScale + (targetScale - startScale) * easeProgress;
        const currentOffsetX =
          startOffsetX + (targetOffsetX - startOffsetX) * easeProgress;
        const currentOffsetY =
          startOffsetY + (targetOffsetY - startOffsetY) * easeProgress;

        setScale(currentScale);
        setOffsetX(currentOffsetX);
        setOffsetY(currentOffsetY);

        if (progress < 1) {
          rafId.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          rafId.current = null;
        }
      };

      rafId.current = requestAnimationFrame(animate);
    },
    [enableAnimation],
  );

  const updateZoom = useCallback(
    (
      newScale: number,
      zoomCenterX?: number,
      zoomCenterY?: number,
      animate: boolean = true,
    ) => {
      const prevScale = stateRef.current.scale;
      const nextScale = clampScale(newScale);

      // Calculate scale ratio
      const scaleRatio = nextScale / prevScale;

      // If no zoom center specified, use viewport center
      const centerX = zoomCenterX ?? containerSize.width / 2;
      const centerY = zoomCenterY ?? containerSize.height / 2;

      // Calculate new offsets to zoom towards center point
      // Formula: newOffset = center - (center - oldOffset) * scaleRatio
      const newOffsetX =
        centerX - (centerX - stateRef.current.offsetX) * scaleRatio;
      const newOffsetY =
        centerY - (centerY - stateRef.current.offsetY) * scaleRatio;

      // Clamp offsets based on the NEW scale
      const clamped = clampOffsets(newOffsetX, newOffsetY, nextScale);

      if (animate && enableAnimation) {
        animateZoom(nextScale, clamped.x, clamped.y);
      } else {
        setScale(nextScale);
        setOffsetX(clamped.x);
        setOffsetY(clamped.y);
      }
    },
    [
      clampScale,
      clampOffsets,
      containerSize.width,
      containerSize.height,
      animateZoom,
      enableAnimation,
    ],
  );

  const zoomIn = useCallback(
    () =>
      updateZoom(
        stateRef.current.scale * ZOOM_STEP,
        undefined,
        undefined,
        true,
      ),
    [updateZoom],
  );
  const zoomOut = useCallback(
    () =>
      updateZoom(
        stateRef.current.scale / ZOOM_STEP,
        undefined,
        undefined,
        true,
      ),
    [updateZoom],
  );
  const setZoom = useCallback(
    (value: number, centerX?: number, centerY?: number) =>
      updateZoom(value, centerX, centerY, true),
    [updateZoom],
  );

  const resetZoom = useCallback(() => {
    if (enableAnimation) {
      animateZoom(1, 0, 0);
    } else {
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
    }
  }, [animateZoom, enableAnimation]);

  // Calculate fit-to-screen scale
  const getFitScale = useCallback(() => {
    if (
      containerSize.width === 0 ||
      containerSize.height === 0 ||
      contentSize.width === 0 ||
      contentSize.height === 0
    ) {
      return 1;
    }
    const padding = 40;
    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;
    const scaleX = availableWidth / contentSize.width;
    const scaleY = availableHeight / contentSize.height;
    return Math.min(scaleX, scaleY, 1); // Cap at 100%
  }, [containerSize, contentSize]);

  const fitToScreen = useCallback(() => {
    const fitScale = getFitScale();
    if (enableAnimation) {
      animateZoom(fitScale, 0, 0);
    } else {
      setScale(fitScale);
      setOffsetX(0);
      setOffsetY(0);
    }
  }, [getFitScale, animateZoom, enableAnimation]);

  const resetOffsets = useCallback(() => {
    setOffsetX(0);
    setOffsetY(0);
  }, []);

  const pan = useCallback(
    (dx: number, dy: number) => {
      const nextX = stateRef.current.offsetX + dx;
      const nextY = stateRef.current.offsetY + dy;
      const clamped = clampOffsets(nextX, nextY, stateRef.current.scale);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    },
    [clampOffsets],
  );

  // Keyboard pan handler
  const panByKeyboard = useCallback(
    (
      direction: "up" | "down" | "left" | "right",
      step: number = KEYBOARD_PAN_STEP,
    ) => {
      const scale = stateRef.current.scale;
      // Adjust step based on zoom level - smaller steps when zoomed out
      const adjustedStep = step * Math.max(1, scale);

      let dx = 0;
      let dy = 0;

      switch (direction) {
        case "up":
          dy = adjustedStep;
          break;
        case "down":
          dy = -adjustedStep;
          break;
        case "left":
          dx = adjustedStep;
          break;
        case "right":
          dx = -adjustedStep;
          break;
      }

      pan(dx, dy);
    },
    [pan],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const delta = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        // Zoom towards mouse cursor position for wheel zoom
        updateZoom(stateRef.current.scale * delta, e.clientX, e.clientY, true);
      }
    },
    [updateZoom],
  );

  // Touch handling for pinch-to-zoom
  const touchState = useRef<{
    startDistance: number;
    startScale: number;
    lastTouchCenter: { x: number; y: number };
    isPinching: boolean;
  } | null>(null);

  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (
    touches: React.TouchList,
  ): { x: number; y: number } => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      touchState.current = {
        startDistance: distance,
        startScale: stateRef.current.scale,
        lastTouchCenter: center,
        isPinching: true,
      };
    } else if (e.touches.length === 1) {
      // Single touch - start pan
      const touch = e.touches[0];
      isDragging.current = true;
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
      dragStartPos.current = { x: touch.clientX, y: touch.clientY };
      setIsPanning(false);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && touchState.current?.isPinching) {
        e.preventDefault();
        const distance = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches);
        const scaleFactor = distance / touchState.current.startDistance;
        const newScale = clampScale(
          touchState.current.startScale * scaleFactor,
        );

        // Pan while pinching
        const centerDeltaX = center.x - touchState.current.lastTouchCenter.x;
        const centerDeltaY = center.y - touchState.current.lastTouchCenter.y;

        updateZoom(newScale, center.x, center.y, false);
        pan(centerDeltaX, centerDeltaY);

        touchState.current.lastTouchCenter = center;
      } else if (e.touches.length === 1 && isDragging.current) {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - lastMousePos.current.x;
        const dy = touch.clientY - lastMousePos.current.y;

        const distance = Math.sqrt(
          Math.pow(touch.clientX - dragStartPos.current.x, 2) +
            Math.pow(touch.clientY - dragStartPos.current.y, 2),
        );

        if (distance > PAN_THRESHOLD) {
          setIsPanning(true);
        }

        if (isPanning || distance > PAN_THRESHOLD) {
          pan(dx, dy);
        }

        lastMousePos.current = { x: touch.clientX, y: touch.clientY };
      }
    },
    [clampScale, updateZoom, pan, isPanning],
  );

  const handleTouchEnd = useCallback(() => {
    touchState.current = null;
    isDragging.current = false;
    setIsPanning(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canPan =
      e.button === 1 || spacePressed.current || stateRef.current.scale > 0.5;

    if (canPan) {
      e.preventDefault();
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setIsPanning(false);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;

      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.current.x, 2) +
          Math.pow(e.clientY - dragStartPos.current.y, 2),
      );

      if (distance > PAN_THRESHOLD) {
        setIsPanning(true);
      }

      if (isPanning || distance > PAN_THRESHOLD) {
        const newX = stateRef.current.offsetX + dx;
        const newY = stateRef.current.offsetY + dy;
        const clamped = clampOffsets(newX, newY, stateRef.current.scale);
        setOffsetX(clamped.x);
        setOffsetY(clamped.y);
      }

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning, clampOffsets],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space key for pan mode
      if (e.code === "Space" && !spacePressed.current && !e.repeat) {
        spacePressed.current = true;
        document.body.style.cursor = "grab";
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        resetZoom();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomIn();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }

      // Fit to screen with 'F' key
      if (
        e.key.toLowerCase() === "f" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        // Only if not typing in an input
        if (
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
          )
        ) {
          e.preventDefault();
          fitToScreen();
        }
      }

      // Arrow keys for panning when zoomed in
      if (!e.ctrlKey && !e.metaKey && !e.altKey && scale > 1) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            panByKeyboard("up");
            break;
          case "ArrowDown":
            e.preventDefault();
            panByKeyboard("down");
            break;
          case "ArrowLeft":
            e.preventDefault();
            panByKeyboard("left");
            break;
          case "ArrowRight":
            e.preventDefault();
            panByKeyboard("right");
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressed.current = false;
        document.body.style.cursor = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.body.style.cursor = "";
    };
  }, [zoomIn, zoomOut, resetZoom]);

  return {
    state: {
      scale,
      offsetX,
      offsetY,
      isPanning,
      isAnimating,
    },
    zoomIn,
    zoomOut,
    resetZoom,
    resetOffsets,
    fitToScreen,
    setZoom,
    pan,
    panByKeyboard,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onDoubleClick: handleDoubleClick,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

export default useZoomPan;
