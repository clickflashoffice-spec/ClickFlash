import { useState, useCallback, useEffect, useMemo } from 'react';
import { ManualEdits } from '../../../../types';
import { CropBox } from '../../components/CropOverlay';

interface UseEditorToolsProps {
    activePhotoId: string | null;
    activeEdits: ManualEdits | null;
    updateEdit: (updates: Partial<ManualEdits>) => void;
    showToast: (message: string) => void;
    onTabChange: (tab: any) => void;
}

export function useEditorTools({
    activePhotoId,
    activeEdits,
    updateEdit,
    showToast,
    onTabChange
}: UseEditorToolsProps) {
    const [isCropping, setIsCropping] = useState(false);
    const [isRetouching, setIsRetouching] = useState(false);
    const [isStraightening, setIsStraightening] = useState(false);
    const [cropAspectRatio, setCropAspectRatio] = useState<number | undefined>(undefined);
    const [retouchBrushSize, setRetouchBrushSize] = useState(20);
    const [retouchStep, setRetouchStep] = useState<'target' | 'source' | 'idle'>('idle');
    const [retouchTarget, setRetouchTarget] = useState<{ x: number; y: number } | null>(null);

    // Reset tools when photo changes
    useEffect(() => {
        setIsCropping(false);
        setIsRetouching(false);
        setIsStraightening(false);
        setRetouchTarget(null);
        setRetouchStep('idle');
    }, [activePhotoId]);

    const handleCropStart = useCallback(() => {
        setIsCropping(true);
    }, []);

    const handleCropApply = useCallback((crop: CropBox) => {
        updateEdit({ crop });
        setIsCropping(false);
        showToast("Crop applied");
    }, [updateEdit, showToast]);

    const handleCropCancel = useCallback(() => {
        setIsCropping(false);
    }, []);

    const handleCropAspectRatioChange = useCallback((ratio: number | undefined) => {
        setCropAspectRatio(ratio);
    }, []);

    const handleRetouchBrushSizeChange = useCallback((size: number) => {
        setRetouchBrushSize(size);
    }, []);

    const handleRetouchDone = useCallback(() => {
        setIsRetouching(false);
        setRetouchTarget(null);
        setRetouchStep('idle');
        onTabChange('adjust');
    }, [onTabChange]);

    const handleStraightenStart = useCallback(() => {
        setIsStraightening(true);
    }, []);

    const handleStraightenEnd = useCallback(() => {
        setIsStraightening(false);
    }, []);

    const handleRetouchClick = useCallback((x: number, y: number) => {
        // Validate coordinates are finite numbers
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return;

        if (retouchStep === 'target') {
            setRetouchTarget({ x, y });
            setRetouchStep('source');
        } else if (retouchStep === 'source' && retouchTarget) {
            const existing = activeEdits?.retouchActions || [];
            // Cap retouch actions to prevent unbounded growth
            const capped = existing.length >= 200 ? existing.slice(-199) : existing;
            updateEdit({
                retouchActions: [
                    ...capped,
                    {
                        id: crypto.randomUUID(),
                        type: 'heal',
                        x: retouchTarget.x,
                        y: retouchTarget.y,
                        radius: retouchBrushSize,
                        sourceX: x,
                        sourceY: y,
                        timestamp: Date.now()
                    }
                ]
            });
            setRetouchTarget(null);
            setRetouchStep('target');
        }
    }, [retouchStep, retouchTarget, retouchBrushSize, updateEdit]);

    // Memoize handlers to prevent cascading re-renders
    const handlers = useMemo(() => ({
        handleCropStart,
        handleCropApply,
        handleCropCancel,
        handleCropAspectRatioChange,
        handleRetouchBrushSizeChange,
        handleRetouchDone,
        handleStraightenStart,
        handleStraightenEnd,
        handleRetouchClick
    }), [
        handleCropStart,
        handleCropApply,
        handleCropCancel,
        handleCropAspectRatioChange,
        handleRetouchBrushSizeChange,
        handleRetouchDone,
        handleStraightenStart,
        handleStraightenEnd,
        handleRetouchClick
    ]);

    return {
        isCropping,
        isRetouching,
        isStraightening,
        cropAspectRatio,
        retouchBrushSize,
        retouchStep,
        retouchTarget,
        setRetouchStep,
        setRetouchTarget,
        setIsCropping,
        setIsRetouching,
        handlers
    };
}
