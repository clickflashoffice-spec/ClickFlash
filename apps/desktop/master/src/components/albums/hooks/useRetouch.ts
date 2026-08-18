import { useState, useCallback, useRef, useEffect } from 'react';
import { Photo, RetouchAction } from '../../../types';
import { EditEngine } from '../../../utils/canvas/EditEngine';
import { INITIAL_EDITS } from '../../../utils/styleUtils';

export const useRetouch = (
    imageRef: React.RefObject<HTMLImageElement | null>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    activePhoto: Photo | null,
    updateAlbumState: (recipe: (draft: any) => void) => void,
    activeTab: string
) => {
    const editEngineRef = useRef<EditEngine | null>(null);
    const [isRetouching, setIsRetouching] = useState(false);
    const [retouchStep, setRetouchStep] = useState<'target' | 'source' | 'idle'>('idle');
    const [retouchTarget, setRetouchTarget] = useState<any>(null);
    const [brushSize, setBrushSize] = useState(30);
    const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

    // Initialize EditEngine
    useEffect(() => {
        if (canvasRef.current && !editEngineRef.current) {
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                editEngineRef.current = new EditEngine(ctx);
            }
        }
    }, [activeTab, canvasRef]);

    const handleRetouchAt = useCallback(async (clientX: number, clientY: number) => {
        if (!imageRef.current || !activePhoto) return;

        const img = imageRef.current;
        const imgRect = img.getBoundingClientRect();
        const relX = (clientX - imgRect.left) / imgRect.width;
        const relY = (clientY - imgRect.top) / imgRect.height;

        const clampedX = Math.max(0, Math.min(1, relX));
        const clampedY = Math.max(0, Math.min(1, relY));

        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        const imageX = Math.round(clampedX * natW);
        const imageY = Math.round(clampedY * natH);

        if (retouchStep === 'target') {
            setRetouchTarget({ x: clientX, y: clientY, imageX, imageY });
            setRetouchStep('source');
            return;
        }

        if (retouchStep === 'source' && retouchTarget) {
            const newAction: RetouchAction = {
                id: crypto.randomUUID(),
                type: 'heal',
                x: retouchTarget.imageX,
                y: retouchTarget.imageY,
                radius: brushSize,
                sourceX: imageX,
                sourceY: imageY,
                timestamp: Date.now()
            };

            updateAlbumState(draft => {
                const photo = (draft.photos || []).find((p: Photo) => p.id === activePhoto.id);
                if (photo) {
                    if (!photo.manualEdits) photo.manualEdits = { ...INITIAL_EDITS };
                    if (!photo.manualEdits.retouchActions) photo.manualEdits.retouchActions = [];
                    photo.manualEdits.retouchActions.push(newAction);
                    (photo as any)._metadataModified = true;
                }
            });

            setRetouchStep('target');
            setRetouchTarget(null);
        }
    }, [activePhoto, brushSize, retouchStep, retouchTarget, updateAlbumState, imageRef]);

    // Update canvas size and render edits
    useEffect(() => {
        if (canvasRef.current && imageRef.current && activePhoto) {
            const img = imageRef.current;
            const canvas = canvasRef.current;

            const updateCanvasSize = () => {
                const rect = img.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    canvas.width = Math.round(rect.width);
                    canvas.height = Math.round(rect.height);
                    if (editEngineRef.current && activePhoto.manualEdits?.retouchActions?.length) {
                        editEngineRef.current.render(img, activePhoto.manualEdits);
                    }
                }
            };

            updateCanvasSize();
            const handleResize = () => setTimeout(updateCanvasSize, 100);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [activePhoto, canvasRef, imageRef]);

    useEffect(() => {
        if (editEngineRef.current && imageRef.current && activePhoto?.manualEdits?.retouchActions?.length) {
            editEngineRef.current.render(imageRef.current, activePhoto.manualEdits);
        }
    }, [activePhoto?.manualEdits?.retouchActions, activePhoto?.id, imageRef]);

    return {
        isRetouching,
        setIsRetouching,
        retouchStep,
        setRetouchStep,
        retouchTarget,
        brushSize,
        setBrushSize,
        mouseCoords,
        setMouseCoords,
        handleRetouchAt,
        editEngineRef
    };
};
