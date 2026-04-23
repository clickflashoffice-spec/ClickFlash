/**
 * Coordinate Scaler Utility
 * 
 * Maps coordinates from preview resolution to Hi-Res for accurate retouch/crop application.
 * Essential for non-destructive editing workflow where edits are applied at fulfillment time.
 * Ported from Master App (v5.0).
 */

import { RetouchAction, ManualEdits } from '../types';

export interface ScaleContext {
    sourceWidth: number;   // Preview width (2048px)
    sourceHeight: number;  // Preview height
    targetWidth: number;   // Hi-Res width (e.g., 6000px)
    targetHeight: number;  // Hi-Res height
}

/**
 * Scale a single retouch action from preview to Hi-Res coordinates
 */
export function scaleRetouchAction(
    action: RetouchAction,
    context: ScaleContext
): RetouchAction {
    const scaleX = context.targetWidth / context.sourceWidth;
    const scaleY = context.targetHeight / context.sourceHeight;

    // Use minimum scale for radius to maintain circular appearance
    const radiusScale = Math.min(scaleX, scaleY);

    return {
        ...action,
        x: action.x * scaleX,
        y: action.y * scaleY,
        radius: action.radius * radiusScale,
        sourceX: action.sourceX ? action.sourceX * scaleX : undefined,
        sourceY: action.sourceY ? action.sourceY * scaleY : undefined
    };
}

/**
 * Scale all retouch actions in ManualEdits
 */
export function scaleRetouchActions(
    edits: ManualEdits,
    context: ScaleContext
): ManualEdits {
    if (!edits.retouchActions || edits.retouchActions.length === 0) {
        return edits;
    }

    return {
        ...edits,
        retouchActions: edits.retouchActions.map(action =>
            scaleRetouchAction(action, context)
        )
    };
}

/**
 * Convert pixel-based crop to percentage-based crop
 * This makes crop resolution-independent
 */
export function cropToPercentage(
    crop: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number
): { x: number; y: number; width: number; height: number } {
    return {
        x: (crop.x / imageWidth) * 100,
        y: (crop.y / imageHeight) * 100,
        width: (crop.width / imageWidth) * 100,
        height: (crop.height / imageHeight) * 100
    };
}

/**
 * Convert percentage-based crop to pixel coordinates
 */
export function cropToPixels(
    crop: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number
): { x: number; y: number; width: number; height: number } {
    return {
        x: Math.round((crop.x / 100) * imageWidth),
        y: Math.round((crop.y / 100) * imageHeight),
        width: Math.round((crop.width / 100) * imageWidth),
        height: Math.round((crop.height / 100) * imageHeight)
    };
}

/**
 * Scale entire ManualEdits object from preview to Hi-Res
 * Used during fulfillment to apply edits to original resolution
 */
export function scaleEditsToHiRes(
    edits: ManualEdits,
    previewWidth: number,
    previewHeight: number,
    hiResWidth: number,
    hiResHeight: number
): ManualEdits {
    const context: ScaleContext = {
        sourceWidth: previewWidth,
        sourceHeight: previewHeight,
        targetWidth: hiResWidth,
        targetHeight: hiResHeight
    };

    let scaledEdits = { ...edits };

    // Scale retouch actions
    if (edits.retouchActions && edits.retouchActions.length > 0) {
        scaledEdits = scaleRetouchActions(scaledEdits, context);
    }

    // Crop is already percentage-based, no scaling needed
    // (If crop is still pixel-based, convert it first)

    return scaledEdits;
}
