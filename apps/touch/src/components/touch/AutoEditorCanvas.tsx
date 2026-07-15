import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { logger } from '@clickflash/logger';

interface AutoEditorCanvasProps {
    imageUrl: string;
    options: {
        brightness?: number;
        contrast?: number;
        saturation?: number;
        autoEnhance?: boolean;
    };
    onProcessingStart?: () => void;
    onProcessingComplete?: () => void;
    onError?: (err: string) => void;
    width?: number | string;
    height?: number | string;
    className?: string;
}

export interface AutoEditorCanvasRef {
    exportBlob: (type?: string, quality?: number) => Promise<Blob | null>;
    reset: () => void;
}

export const AutoEditorCanvas = forwardRef<AutoEditorCanvasRef, AutoEditorCanvasProps>((props, ref) => {
    const { imageUrl, options, onProcessingStart, onProcessingComplete, onError, width = '100%', height = 'auto', className } = props;
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);
    
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize worker
    useEffect(() => {
        // Use Vite's worker import syntax
        const worker = new Worker(new URL('../../workers/imageEditor.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (event) => {
            if (event.data.type === 'PROCESS_COMPLETE') {
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.putImageData(event.data.payload.imageData, 0, 0);
                    }
                }
                setIsProcessing(false);
                onProcessingComplete?.();
            } else if (event.data.type === 'ERROR') {
                logger.error('[AutoEditorCanvas] Worker error', { error: event.data.payload });
                setIsProcessing(false);
                onError?.(event.data.payload);
            }
        };
        
        workerRef.current = worker;
        
        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    // Load initial image
    useEffect(() => {
        if (!imageUrl) return;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            originalImageRef.current = img;
            drawOriginal();
        };
        img.onerror = () => {
            logger.error('[AutoEditorCanvas] Failed to load image', { url: imageUrl });
            onError?.('Failed to load image');
        };
        img.src = imageUrl;
    }, [imageUrl]);

    const drawOriginal = useCallback(() => {
        const canvas = canvasRef.current;
        const img = originalImageRef.current;
        if (!canvas || !img) return;

        // Set canvas dimensions to match image resolution (not display size)
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);
    }, []);

    // Apply edits when options change
    useEffect(() => {
        const hasEdits = options.brightness !== undefined || 
                         options.contrast !== undefined || 
                         options.saturation !== undefined || 
                         options.autoEnhance;
                         
        if (!hasEdits) {
            drawOriginal();
            return;
        }

        const canvas = canvasRef.current;
        const img = originalImageRef.current;
        const worker = workerRef.current;
        
        if (!canvas || !img || !worker) return;

        // Start from original image data to prevent cumulative degradation
        drawOriginal();
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            setIsProcessing(true);
            onProcessingStart?.();
            
            // Transfer ArrayBuffer to worker for zero-copy
            worker.postMessage({
                type: 'PROCESS_IMAGE',
                payload: {
                    imageData,
                    options
                }
            }, [imageData.data.buffer]);
            
        } catch (e: any) {
            logger.error('[AutoEditorCanvas] Failed to get image data', { error: e.message });
            onError?.('Canvas tainted or security error');
        }
    }, [options, drawOriginal]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        exportBlob: (type = 'image/jpeg', quality = 0.92) => {
            return new Promise((resolve) => {
                const canvas = canvasRef.current;
                if (!canvas) {
                    resolve(null);
                    return;
                }
                canvas.toBlob((blob) => resolve(blob), type, quality);
            });
        },
        reset: () => {
            drawOriginal();
        }
    }));

    return (
        <div className={`relative ${className || ''}`} style={{ width, height }}>
            <canvas 
                ref={canvasRef}
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    opacity: isProcessing ? 0.7 : 1,
                    transition: 'opacity 0.2s ease-in-out'
                }}
            />
            {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            )}
        </div>
    );
});

AutoEditorCanvas.displayName = 'AutoEditorCanvas';
