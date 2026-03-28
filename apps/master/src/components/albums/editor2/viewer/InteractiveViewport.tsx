import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import styles from "./InteractiveViewport.module.css";

export interface InteractiveViewportHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

interface InteractiveViewportProps {
  children: React.ReactNode;
  contentWidth: number;
  contentHeight: number;
  centerX?: number;
  centerY?: number;
  zoomLevel?: number;
  onTransformChange?: (state: {
    scale: number;
    offsetX: number;
    offsetY: number;
    zoomLevel: number;
  }) => void;
}

const InteractiveViewportComponent = forwardRef<
  InteractiveViewportHandle,
  InteractiveViewportProps
>(
  (
    {
      children,
      contentWidth,
      contentHeight,
      centerX = 0.5,
      centerY = 0.5,
      zoomLevel = 1,
      onTransformChange,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    // Track if we need to reset/apply initial framing
    const [lastAppliedFraming, setLastAppliedFraming] = useState<string>("");

    // Internal state for "fixed" zoom/offset
    const [fixedZoom, setFixedZoom] = useState({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });

    // Helper to calculate fit scale
    const getFitScale = () => {
      if (!containerRef.current || contentWidth === 0 || contentHeight === 0)
        return 1;
      const container = containerRef.current.getBoundingClientRect();
      const padding = 40;
      const availableWidth = container.width - padding * 2;
      const availableHeight = container.height - padding * 2;
      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      return Math.min(scaleX, scaleY);
    };

    // Calculate and Apply Initial Framing
    useEffect(() => {
      if (!containerRef.current || contentWidth === 0 || contentHeight === 0)
        return;

      const framingKey = `${contentWidth}x${contentHeight}_${centerX}_${centerY}_${zoomLevel}`;
      if (framingKey === lastAppliedFraming) return;

      const fitScale = getFitScale();
      const finalScale = fitScale * (zoomLevel || 1);

      const offX = (0.5 - (centerX ?? 0.5)) * contentWidth * finalScale;
      const offY = (0.5 - (centerY ?? 0.5)) * contentHeight * finalScale;

      setFixedZoom({ scale: finalScale, offsetX: offX, offsetY: offY });
      setLastAppliedFraming(framingKey);
    }, [
      contentWidth,
      contentHeight,
      centerX,
      centerY,
      zoomLevel,
      lastAppliedFraming,
    ]);

    // Notify parent of changes
    useEffect(() => {
      if (!onTransformChange) return;
      const fitScale = getFitScale();
      onTransformChange({
        ...fixedZoom,
        zoomLevel: fixedZoom.scale / fitScale,
      });
    }, [fixedZoom.scale, fixedZoom.offsetX, fixedZoom.offsetY]);

    // 4. Exposed methods
    useImperativeHandle(ref, () => ({
      zoomIn: () =>
        setFixedZoom((z) => ({ ...z, scale: Math.min(z.scale * 1.2, 5) })),
      zoomOut: () =>
        setFixedZoom((z) => ({ ...z, scale: Math.max(z.scale / 1.2, 0.1) })),
      resetZoom: () => {
        setLastAppliedFraming(""); // Trigger re-calculation of initial framing
      },
      getScale: () => fixedZoom.scale,
    }));

    // 5. Handlers
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onNativeWheel = (e: WheelEvent) => {
        // Only prevent default if scrolling or zooming (Ctrl+Wheel)
        if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
          e.preventDefault();
          const delta = -e.deltaY;
          const factor = delta > 0 ? 1.1 : 0.9;

          setFixedZoom((prev) => {
            const newScale = Math.max(0.1, Math.min(prev.scale * factor, 5));
            return { ...prev, scale: newScale };
          });
        }
      };

      el.addEventListener("wheel", onNativeWheel, { passive: false });
      return () => el.removeEventListener("wheel", onNativeWheel);
    }, []);

    return (
      <div ref={containerRef} className={styles.viewport}>
        {/* Transformable content - strictly virtual sized, fixed in middle */}
        <div
          /* eslint-disable-next-line react/forbid-component-props */
          style={
            {
              "--content-width": `${contentWidth || 800}px`,
              "--content-height": `${contentHeight || 600}px`,
              "--offset-x": `${fixedZoom.offsetX}px`,
              "--offset-y": `${fixedZoom.offsetY}px`,
              "--scale": fixedZoom.scale,
            } as React.CSSProperties
          }
          className={`transform-gpu origin-center will-change-transform ${styles.content}`}
        >
          {children}
        </div>
      </div>
    );
  },
);

InteractiveViewportComponent.displayName = "InteractiveViewport";

export const InteractiveViewport = InteractiveViewportComponent;
