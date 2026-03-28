/**
 * Unit tests for useEditHistory hook
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useEditHistory } from './useEditHistory';
import { ManualEdits } from '../types/shared';

const initialEdits: ManualEdits = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    warmth: 0,
    tint: 0,
    sharpness: 0,
    vignette: 0,
};

describe('useEditHistory', () => {
    it('should initialize with initial edits', () => {
        const { result } = renderHook(() => useEditHistory(initialEdits));

        expect(result.current.currentEdits).toEqual(initialEdits);
        expect(result.current.historyLength).toBe(1);
        expect(result.current.currentIndex).toBe(0);
    });

    it('should not be able to undo at initial state', () => {
        const { result } = renderHook(() => useEditHistory(initialEdits));

        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should push edits to history', () => {
        const { result } = renderHook(() => useEditHistory(initialEdits));

        const newEdits: ManualEdits = { ...initialEdits, brightness: 50 };

        act(() => {
            result.current.pushEdit(newEdits);
        });

        expect(result.current.currentEdits).toEqual(newEdits);
        expect(result.current.historyLength).toBe(2);
        expect(result.current.currentIndex).toBe(1);
        expect(result.current.canUndo).toBe(true);
    });

    it('should undo edits correctly', () => {
        const { result } = renderHook(() => useEditHistory(initialEdits));

        const newEdits: ManualEdits = { ...initialEdits, brightness: 50 };

        act(() => {
            result.current.pushEdit(newEdits);
        });

        act(() => {
            result.current.undo();
        });

        expect(result.current.currentEdits).toEqual(initialEdits);
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);
    });

    it('should redo edits correctly', () => {
        const { result } = renderHook(() => useEditHistory(initialEdits));

        const newEdits: ManualEdits = { ...initialEdits, contrast: 25 };

        act(() => {
            result.current.pushEdit(newEdits);
        });

        act(() => {
            result.current.undo();
        });

        act(() => {
            result.current.redo();
        });

        expect(result.current.currentEdits).toEqual(newEdits);
        expect(result.current.currentIndex).toBe(1);
    });

    it('should truncate future history on new push after undo', () => {
        const { result } = renderHook(() => useEditHistory(initialEdits));

        const edit1: ManualEdits = { ...initialEdits, brightness: 10 };
        const edit3: ManualEdits = { ...initialEdits, brightness: 30 };

        act(() => {
            result.current.pushEdit(edit1);
        });

        act(() => {
            result.current.pushEdit({ ...initialEdits, brightness: 20 });
        });

        act(() => {
            result.current.undo(); // Go back to edit1
        });

        act(() => {
            result.current.pushEdit(edit3); // This should replace edit2
        });

        expect(result.current.historyLength).toBe(3);
        expect(result.current.currentEdits).toEqual(edit3);
        expect(result.current.canRedo).toBe(false);
    });

    it('should reset to initial state', () => {
        const { result } = renderHook(() => useEditHistory(initialEdits));

        act(() => {
            result.current.pushEdit({ ...initialEdits, brightness: 50 });
        });

        act(() => {
            result.current.pushEdit({ ...initialEdits, contrast: 25 });
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.historyLength).toBe(1);
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.currentEdits).toEqual(initialEdits);
    });
});
