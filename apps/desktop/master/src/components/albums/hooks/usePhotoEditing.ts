import { useState, useCallback } from 'react';
import { ManualEdits, RetouchAction } from '../../../types';
import { INITIAL_EDITS } from '../../../utils/styleUtils';

export interface CropBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type DragAction = 'move' | 'resize';
export type Handle = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'move';

interface UsePhotoEditingReturn {
    // Editing State
    edits: ManualEdits;
    isCropping: boolean;
    cropBox: CropBox;
    isStraightening: boolean;
    isRetouching: boolean;
    retouchStep: 'target' | 'source' | 'idle';
    retouchTarget: { x: number; y: number } | null;
    brushSize: number;
    cropAspectRatio: number | null;
    
    // Actions
    setEdits: (edits: ManualEdits) => void;
    updateEdit: <K extends keyof ManualEdits>(key: K, value: ManualEdits[K]) => void;
    resetEdits: () => void;
    startCropping: () => void;
    stopCropping: () => void;
    setCropBox: (box: CropBox) => void;
    startStraightening: () => void;
    stopStraightening: () => void;
    startRetouching: () => void;
    stopRetouching: () => void;
    setRetouchStep: (step: 'target' | 'source' | 'idle') => void;
    setRetouchTarget: (target: { x: number; y: number } | null) => void;
    setBrushSize: (size: number) => void;
    setCropAspectRatio: (ratio: number | null) => void;
    addRetouchAction: (action: RetouchAction) => void;
    
    // Crop Drag State
    dragState: { action: DragAction; handle: Handle; startX: number; startY: number; startBox: CropBox; } | null;
    setDragState: (state: { action: DragAction; handle: Handle; startX: number; startY: number; startBox: CropBox; } | null) => void;
}

export function usePhotoEditing(initialEdits?: ManualEdits): UsePhotoEditingReturn {
    const [edits, setEdits] = useState<ManualEdits>(initialEdits || { ...INITIAL_EDITS });
    const [isCropping, setIsCropping] = useState(false);
    const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
    const [isStraightening, setIsStraightening] = useState(false);
    const [isRetouching, setIsRetouching] = useState(false);
    const [retouchStep, setRetouchStep] = useState<'target' | 'source' | 'idle'>('idle');
    const [retouchTarget, setRetouchTarget] = useState<{ x: number; y: number } | null>(null);
    const [brushSize, setBrushSize] = useState(30);
    const [cropAspectRatio, setCropAspectRatio] = useState<number | null>(null);
    const [dragState, setDragState] = useState<{ action: DragAction; handle: Handle; startX: number; startY: number; startBox: CropBox; } | null>(null);

    const updateEdit = useCallback(<K extends keyof ManualEdits>(key: K, value: ManualEdits[K]) => {
        setEdits(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetEdits = useCallback(() => {
        setEdits({ ...INITIAL_EDITS });
    }, []);

    const startCropping = useCallback(() => {
        setIsCropping(true);
        setIsRetouching(false);
        setIsStraightening(false);
    }, []);

    const stopCropping = useCallback(() => {
        setIsCropping(false);
    }, []);

    const startStraightening = useCallback(() => {
        setIsStraightening(true);
        setIsCropping(false);
        setIsRetouching(false);
    }, []);

    const stopStraightening = useCallback(() => {
        setIsStraightening(false);
    }, []);

    const startRetouching = useCallback(() => {
        setIsRetouching(true);
        setIsCropping(false);
        setIsStraightening(false);
        setRetouchStep('target');
    }, []);

    const stopRetouching = useCallback(() => {
        setIsRetouching(false);
        setRetouchStep('idle');
        setRetouchTarget(null);
    }, []);

    const addRetouchAction = useCallback((action: RetouchAction) => {
        setEdits(prev => ({
            ...prev,
            retouchActions: [...(prev.retouchActions || []), action]
        }));
    }, []);

    return {
        edits,
        isCropping,
        cropBox,
        isStraightening,
        isRetouching,
        retouchStep,
        retouchTarget,
        brushSize,
        cropAspectRatio,
        dragState,
        setEdits,
        updateEdit,
        resetEdits,
        startCropping,
        stopCropping,
        setCropBox,
        startStraightening,
        stopStraightening,
        startRetouching,
        stopRetouching,
        setRetouchStep,
        setRetouchTarget,
        setBrushSize,
        setCropAspectRatio,
        addRetouchAction,
        setDragState,
    };
}
