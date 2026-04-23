import { useState, useCallback, useRef, useEffect } from 'react';

export const useZoomAndPan = (
    viewerRef: React.RefObject<HTMLDivElement | null>,
    imageRef: React.RefObject<HTMLImageElement | null>,
    isCropping: boolean,
    isRetouching: boolean
) => {
    const [zoomState, setZoomState] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const zoomRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
    const panStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        zoomRef.current = zoomState;
    }, [zoomState]);

    const resetZoom = useCallback(() => {
        setZoomState({ scale: 1, offsetX: 0, offsetY: 0 });
    }, []);

    // Native wheel handler to ensure preventDefault works
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        const handleWheelNative = (e: WheelEvent) => {
            if (isCropping || isRetouching) return;

            const rect = viewer.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right ||
                e.clientY < rect.top || e.clientY > rect.bottom) {
                return;
            }

            e.preventDefault();

            const delta = -Math.sign(e.deltaY) * 0.15;
            const currentScale = zoomRef.current.scale;
            const newScale = Math.max(0.5, Math.min(5, currentScale + delta));

            if (Math.abs(newScale - currentScale) < 0.01) return;

            const img = imageRef.current;
            if (!img) {
                setZoomState(prev => ({ ...prev, scale: newScale }));
                return;
            }

            const imgRect = img.getBoundingClientRect();
            const cursorX = e.clientX - (imgRect.left + imgRect.width / 2);
            const cursorY = e.clientY - (imgRect.top + imgRect.height / 2);

            const unscaledX = cursorX / currentScale;
            const unscaledY = cursorY / currentScale;

            const newX = unscaledX * newScale;
            const newY = unscaledY * newScale;

            const currentOffsetX = zoomRef.current.offsetX;
            const currentOffsetY = zoomRef.current.offsetY;

            setZoomState({
                scale: newScale,
                offsetX: currentOffsetX + (cursorX - newX),
                offsetY: currentOffsetY + (cursorY - newY)
            });
        };

        viewer.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => viewer.removeEventListener('wheel', handleWheelNative);
    }, [isCropping, isRetouching, viewerRef, imageRef]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isCropping || isRetouching) return;
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
            x: e.clientX - zoomRef.current.offsetX,
            y: e.clientY - zoomRef.current.offsetY,
        };
    }, [isCropping, isRetouching]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
        if (isPanning) {
            const newOffsetX = e.clientX - panStartRef.current.x;
            const newOffsetY = e.clientY - panStartRef.current.y;
            setZoomState(prev => ({ ...prev, offsetX: newOffsetX, offsetY: newOffsetY }));
        }
    }, [isPanning]);

    const handleMouseUpOrLeave = useCallback(() => {
        setIsPanning(false);
    }, []);

    return {
        zoomState,
        setZoomState,
        isPanning,
        handleMouseDown,
        handleMouseMove,
        handleMouseUpOrLeave,
        resetZoom
    };
};
