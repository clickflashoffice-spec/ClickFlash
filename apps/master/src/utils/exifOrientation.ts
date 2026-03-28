/**
 * EXIF Orientation utilities
 * Handles auto-rotation based on EXIF orientation metadata
 * 
 * EXIF Orientation values:
 * 1: Normal (no rotation)
 * 2: Flipped horizontally
 * 3: Rotated 180°
 * 4: Flipped vertically
 * 5: Rotated 90° CCW and flipped vertically
 * 6: Rotated 90° CW
 * 7: Rotated 90° CW and flipped vertically
 * 8: Rotated 90° CCW
 */

/**
 * Get CSS transform string for EXIF orientation
 * @param orientation EXIF orientation value (1-8)
 * @returns CSS transform string
 */
export function getOrientationTransform(orientation?: number): string {
  if (!orientation || orientation === 1) return '';
  
  switch (orientation) {
    case 2: return 'scaleX(-1)';
    case 3: return 'rotate(180deg)';
    case 4: return 'scaleY(-1)';
    case 5: return 'rotate(90deg) scaleY(-1)';
    case 6: return 'rotate(90deg)';
    case 7: return 'rotate(90deg) scaleX(-1)';
    case 8: return 'rotate(-90deg)';
    default: return '';
  }
}

/**
 * Get the effective dimensions after orientation is applied
 * For orientations 5, 6, 7, 8 (90° rotations), width and height are swapped
 */
export function getOrientedDimensions(
  width: number,
  height: number,
  orientation?: number
): { width: number; height: number } {
  if (!orientation) return { width, height };
  
  // Orientations 5, 6, 7, 8 involve 90° rotation
  if ([5, 6, 7, 8].includes(orientation)) {
    return { width: height, height: width };
  }
  
  return { width, height };
}

/**
 * Check if orientation requires dimension swap for calculations
 */
export function isOrientationRotated90(orientation?: number): boolean {
  if (!orientation) return false;
  return [5, 6, 7, 8].includes(orientation);
}
