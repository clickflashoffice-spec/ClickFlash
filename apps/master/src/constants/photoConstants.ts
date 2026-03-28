
import { ManualEdits } from '../types';

export type PhotoCategory = 'Beach & Pool' | 'Photo Session' | 'Evening' | 'Activities' | 'Restaurant' | string;

export const PHOTO_CATEGORIES: PhotoCategory[] = ['Beach & Pool', 'Photo Session', 'Evening', 'Activities', 'Restaurant'];

export const initialEdits: ManualEdits = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    saturate: 0,
    vibrance: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    whites: 0,
    blacks: 0,
    soften: 0,
    rotate: 0,
    straighten: 0,
    perspectiveX: 0,
    perspectiveY: 0,
    clarity: 0,
    dropShadow: 0,
    retouchActions: [], // Non-destructive edit list
};
