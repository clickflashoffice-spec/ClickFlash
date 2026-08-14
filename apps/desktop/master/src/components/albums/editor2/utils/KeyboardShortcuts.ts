import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutConfig {
    key: string;
    modifiers?: {
        ctrl?: boolean;
        alt?: boolean;
        shift?: boolean;
        meta?: boolean;
    };
    handler: (e: KeyboardEvent) => void;
    description: string;
    preventDefault?: boolean;
    stopPropagation?: boolean;
}

export interface ShortcutGroup {
    name: string;
    shortcuts: ShortcutConfig[];
}

// Default editor shortcuts
export const defaultEditorShortcuts: ShortcutGroup[] = [
    {
        name: 'File',
        shortcuts: [
            { key: 's', modifiers: { ctrl: true }, handler: () => {}, description: 'Save changes', preventDefault: true },
            { key: 'e', modifiers: { ctrl: true }, handler: () => {}, description: 'Export image', preventDefault: true },
        ],
    },
    {
        name: 'Edit',
        shortcuts: [
            { key: 'z', modifiers: { ctrl: true }, handler: () => {}, description: 'Undo', preventDefault: true },
            { key: 'y', modifiers: { ctrl: true }, handler: () => {}, description: 'Redo', preventDefault: true },
            { key: 'z', modifiers: { ctrl: true, shift: true }, handler: () => {}, description: 'Redo (alternative)', preventDefault: true },
        ],
    },
    {
        name: 'View',
        shortcuts: [
            { key: 'f', handler: () => {}, description: 'Fit to screen' },
            { key: '0', handler: () => {}, description: 'Reset zoom' },
            { key: '+', handler: () => {}, description: 'Zoom in' },
            { key: '=', modifiers: { ctrl: true }, handler: () => {}, description: 'Zoom in', preventDefault: true },
            { key: '-', modifiers: { ctrl: true }, handler: () => {}, description: 'Zoom out', preventDefault: true },
            { key: 'b', handler: () => {}, description: 'Toggle before/after view' },
            { key: ' ', handler: () => {}, description: 'Pan (hold)' },
        ],
    },
    {
        name: 'Tools',
        shortcuts: [
            { key: 'v', handler: () => {}, description: 'Select tool' },
            { key: 'c', handler: () => {}, description: 'Crop tool' },
            { key: 'r', handler: () => {}, description: 'Rotate' },
            { key: 'h', handler: () => {}, description: 'Spot healing' },
            { key: 'b', modifiers: { shift: true }, handler: () => {}, description: 'Brush tool' },
            { key: 't', handler: () => {}, description: 'Text tool' },
            { key: 'l', handler: () => {}, description: 'Line/shape tool' },
        ],
    },
    {
        name: 'Navigation',
        shortcuts: [
            { key: 'ArrowLeft', handler: () => {}, description: 'Previous photo' },
            { key: 'ArrowRight', handler: () => {}, description: 'Next photo' },
            { key: 'ArrowLeft', modifiers: { ctrl: true }, handler: () => {}, description: 'Previous photo', preventDefault: true },
            { key: 'ArrowRight', modifiers: { ctrl: true }, handler: () => {}, description: 'Next photo', preventDefault: true },
        ],
    },
];

export function useKeyboardShortcuts(
    shortcuts: ShortcutConfig[],
    enabled: boolean = true
) {
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        for (const shortcut of shortcutsRef.current) {
            if (matchesShortcut(e, shortcut)) {
                if (shortcut.preventDefault) {
                    e.preventDefault();
                }
                if (shortcut.stopPropagation) {
                    e.stopPropagation();
                }
                shortcut.handler(e);
                break;
            }
        }
    }, [enabled]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}

function matchesShortcut(e: KeyboardEvent, shortcut: ShortcutConfig): boolean {
    const { key, modifiers } = shortcut;

    // Check main key
    if (e.key.toLowerCase() !== key.toLowerCase() && e.key !== key) {
        return false;
    }

    // Check modifiers
    if (modifiers) {
        if (modifiers.ctrl !== undefined && e.ctrlKey !== modifiers.ctrl) return false;
        if (modifiers.alt !== undefined && e.altKey !== modifiers.alt) return false;
        if (modifiers.shift !== undefined && e.shiftKey !== modifiers.shift) return false;
        if (modifiers.meta !== undefined && e.metaKey !== modifiers.meta) return false;
    } else {
        // If no modifiers specified, ensure none are pressed (except for single keys like Escape)
        if (key.length === 1 && (e.ctrlKey || e.altKey || e.metaKey)) {
            return false;
        }
    }

    return true;
}

export function formatShortcut(shortcut: ShortcutConfig): string {
    const parts: string[] = [];
    const { modifiers, key } = shortcut;

    if (modifiers?.ctrl) parts.push('Ctrl');
    if (modifiers?.alt) parts.push('Alt');
    if (modifiers?.shift) parts.push('Shift');
    if (modifiers?.meta) parts.push('⌘');

    // Format key
    let formattedKey = key;
    if (key === ' ') formattedKey = 'Space';
    else if (key.length === 1) formattedKey = key.toUpperCase();
    else formattedKey = key;

    parts.push(formattedKey);

    return parts.join('+');
}

// Shortcut help dialog component helper
export function getAllShortcuts(shortcutGroups: ShortcutGroup[]): string[] {
    return shortcutGroups.flatMap(group => 
        group.shortcuts.map(s => `${formatShortcut(s)} - ${s.description}`)
    );
}
