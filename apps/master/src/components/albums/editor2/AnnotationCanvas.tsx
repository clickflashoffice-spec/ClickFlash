import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ManualEdits, Annotation } from '../../../types/shared';
import { v4 as uuidv4 } from 'uuid';
import { DrawingEngine } from './tools/DrawingTools';

interface AnnotationCanvasProps {
    naturalSize: { width: number; height: number } | null;
    edits: ManualEdits | undefined;
    isDrawing: boolean;
    brushColor: string;
    brushSize: number;
    onAnnotationAdd: (annotation: Annotation) => void;
    className?: string;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
    naturalSize,
    edits,
    isDrawing,
    brushColor,
    brushSize,
    onAnnotationAdd,
    className = '',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);

    const drawingEngineRef = useRef<DrawingEngine | null>(null);

    // Sync canvas size and initialize DrawingEngine
    useEffect(() => {
        if (!canvasRef.current || !naturalSize) return;
        const canvas = canvasRef.current;

        // Visual sizing is handled by parent, internal resolution must map to natural size
        if (!drawingEngineRef.current) {
            drawingEngineRef.current = new DrawingEngine(canvas, naturalSize);
        } else {
            drawingEngineRef.current.setNaturalSize(naturalSize);
        }

        // Apply settings
        drawingEngineRef.current.setBrushSettings({
            color: brushColor,
            size: brushSize
        });
    }, [naturalSize, brushColor, brushSize]);

    // Add cleanup on unmount
    useEffect(() => {
        return () => {
            if (drawingEngineRef.current) {
                drawingEngineRef.current.destroy();
                drawingEngineRef.current = null;
            }
        };
    }, []);

    const getScaledCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current || !naturalSize) return null;
        const rect = canvasRef.current.getBoundingClientRect();

        let clientX, clientY;
        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const xPercent = (clientX - rect.left) / rect.width;
        const yPercent = (clientY - rect.top) / rect.height;

        return {
            x: xPercent * naturalSize.width,
            y: yPercent * naturalSize.height
        };
    }, [naturalSize]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !drawingEngineRef.current) return;
        const coords = getScaledCoords(e);
        if (coords) {
            drawingEngineRef.current.startStroke(coords.x, coords.y);
            setCurrentStroke([coords]);
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !drawingEngineRef.current || !currentStroke) return;
        const coords = getScaledCoords(e);
        if (coords) {
            drawingEngineRef.current.continueStroke(coords.x, coords.y);
            setCurrentStroke(prev => [...(prev || []), coords]);
        }
    };

    const handleEnd = () => {
        if (!isDrawing || !drawingEngineRef.current || !currentStroke || currentStroke.length < 2) {
            if (drawingEngineRef.current) drawingEngineRef.current.endStroke();
            setCurrentStroke(null);
            return;
        }

        drawingEngineRef.current.endStroke();

        const newAnnotation: Annotation = {
            id: uuidv4(),
            type: 'brush',
            points: currentStroke,
            color: brushColor,
            width: brushSize,
            opacity: 1,
        };

        onAnnotationAdd(newAnnotation);
        setCurrentStroke(null);
    };

    // Render loop handled by DrawingEngine is primarily for real-time interaction
    // We still need this effect to render the static "edits" when they change (e.g. undo/redo)
    useEffect(() => {
        if (!drawingEngineRef.current || !naturalSize || !edits) return;

        drawingEngineRef.current.clear();

        edits.annotations?.forEach(anno => {
            if (anno.type === 'brush' && anno.points) {
                drawingEngineRef.current?.addStroke({
                    id: anno.id,
                    points: anno.points,
                    brush: {
                        type: 'pencil',
                        size: anno.width || 5,
                        color: anno.color || '#000000',
                        opacity: anno.opacity || 1,
                        hardness: 1
                    },
                    timestamp: Date.now()
                });
            }
        });
        drawingEngineRef.current?.redraw();
    }, [edits, naturalSize]);

    if (!naturalSize) return null;

    return (
        <canvas
            ref={canvasRef}
            className={`absolute z-20 ${isDrawing ? 'cursor-crosshair touch-none pointer-events-auto' : 'pointer-events-none'} ${className}`}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        />
    );
};
