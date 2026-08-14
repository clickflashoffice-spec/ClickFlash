/**
 * Style Utilities
 * 
 * Converts ManualEdits metadata into CSS filters and transforms.
 * Enables the "Ready-Edited" view in the Online Gallery.
 * Ported from Master App (v5.0).
 */

import { ManualEdits } from '../types';

export const INITIAL_EDITS: ManualEdits = {
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
    vignette: 0
};

export const getPhotoStyle = (edits: ManualEdits) => {
    // Default values fallback
    const {
        exposure = 0, contrast = 0, highlights = 0, shadows = 0,
        saturate = 0, vibrance = 0, grayscale = 0, sepia = 0, invert = 0,
        hueRotate = 0, temperature = 0, tint = 0, whites = 0, blacks = 0,
        soften = 0, rotate = 0, straighten = 0, perspectiveX = 0, perspectiveY = 0,
        clarity = 0, dropShadow = 0, vignette = 0
    } = edits;

    // Calculate brightness with whites/blacks adjustments
    const whitesAdjust = whites / 200;
    const blacksAdjust = blacks / 200;
    const brightness = 1 + (exposure / 100) + (highlights / 200) + (shadows / 400) + whitesAdjust - blacksAdjust;
    const contrastVal = 1 + (contrast / 100) + (highlights / 500) - (shadows / 500) + (clarity / 200);

    // Vibrance affects less-saturated colors more than saturation
    const vibranceAmount = vibrance / 100;
    const saturateAmount = 1 + saturate / 100;
    const combinedSaturate = vibranceAmount !== 0
        ? saturateAmount + (vibranceAmount > 0 ? vibranceAmount * 0.5 : vibranceAmount * 0.25)
        : saturateAmount;

    const filters = [
        `brightness(${brightness})`,
        `contrast(${contrastVal})`,
        `saturate(${combinedSaturate})`,
    ];

    // Apply temperature and tint using sepia for now (or color matrix if available in future)
    if (temperature !== 0) {
        filters.push(`sepia(${Math.abs(temperature) * 0.5}%)`);
    }

    filters.push(
        `grayscale(${grayscale}%)`,
        `sepia(${sepia}%)`,
        `invert(${invert}%)`,
        `hue-rotate(${hueRotate}deg)`,
        `blur(${soften}px)`,
    );

    if (dropShadow > 0) {
        filters.push(`drop-shadow(0 4px ${dropShadow}px rgba(0,0,0,0.5))`);
    }

    // Calculate scale-to-fit for straighten to prevent edge cropping
    const angle = rotate + straighten;
    let transformStr = '';

    if (straighten !== 0) {
        const rad = Math.abs(straighten * Math.PI / 180);
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const scale = 1 / (cos + sin);
        transformStr = `rotate(${angle}deg) scale(${scale})`;
    } else if (rotate !== 0) {
        transformStr = `rotate(${angle}deg)`;
    }

    // Add perspective correction
    const perspectiveParts: string[] = [];
    if (perspectiveX !== 0 || perspectiveY !== 0) {
        const perspectiveValue = 1000 + Math.abs(perspectiveX) * 10;
        const rotateX = perspectiveY * 0.1;
        const rotateY = perspectiveX * 0.1;
        if (rotateY !== 0) perspectiveParts.push(`perspective(${perspectiveValue}px)`);
        if (rotateX !== 0 || rotateY !== 0) {
            perspectiveParts.push(`rotateX(${rotateX}deg)`);
            perspectiveParts.push(`rotateY(${rotateY}deg)`);
        }
    }

    if (perspectiveParts.length > 0) {
        transformStr = perspectiveParts.join(' ') + (transformStr ? ' ' + transformStr : '');
    } else if (!transformStr) {
        transformStr = 'none';
    }

    // Note: Vignette creates an overlay, here we just return style props.
    // Ideally vignette is handled by a separate element overlay to prevent layout issues.

    return {
        filter: filters.join(' '),
        transform: transformStr,
        transition: 'filter 0.2s ease-out, transform 0.2s ease-out'
    };
};
