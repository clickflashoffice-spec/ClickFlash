import React, { useEffect, useRef, useCallback } from 'react';
import { ManualEdits } from '../../../types';
import { EditEngine } from '../../../utils/canvas/EditEngine';
import { logger } from '@/utils/logger';

interface RetouchCanvasProps {
    imageElement: HTMLImageElement | null;
    edits: ManualEdits | undefined;
    className?: string;
}

export const RetouchCanvas: React.FC<RetouchCanvasProps> = React.memo(({
    imageElement,
    edits,
    className = '',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<EditEngine | null>(null);

    // Initialize EditEngine
    useEffect(() => {
        if (canvasRef.current && !engineRef.current) {
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                engineRef.current = new EditEngine(ctx);
            }
        }
    }, []);

    // Sync canvas size to match natural image size
    useEffect(() => {
        if (!canvasRef.current || !imageElement) return;

        const canvas = canvasRef.current;
        const naturalWidth = imageElement.naturalWidth;
        const naturalHeight = imageElement.naturalHeight;

        if (!naturalWidth || !naturalHeight) return;

        // Display size matches parent (which is natural size)
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.left = '0';
        canvas.style.top = '0';

        // Actual internal resolution (account for device pixel ratio)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = naturalWidth * dpr;
        canvas.height = naturalHeight * dpr;

        // Scale context for high DPI displays
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
    }, [imageElement]);

    // Render edits when they change
    const renderEdits = useCallback(async () => {
        if (!engineRef.current || !imageElement) return;

        // Clear if no edits
        if (!edits?.retouchActions?.length) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                ctx.clearRect(0, 0, imageElement.naturalWidth, imageElement.naturalHeight);
            }
            return;
        }

        try {
            await engineRef.current.render(imageElement, edits);
        } catch (err) {
            logger.error('Failed to render retouch edits:', err);
        }
    }, [imageElement, edits]);

    useEffect(() => {
        renderEdits();
    }, [renderEdits]);

    // Don't render if no image
    if (!imageElement) {
        return null;
    }

    return (
        <canvas
            ref={canvasRef}
            className={`pointer-events-none absolute z-10 ${className}`}
        />
    );
});

export default RetouchCanvas;
