import { ManualEdits } from "../types";

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
  sharpen: 0,
  vignette: 0,
};

export const getPhotoStyle = (
  edits: ManualEdits,
  isExport: boolean = false,
  imageWidth?: number,
  imageHeight?: number,
  photoId?: string,
) => {
  const {
    exposure = 0,
    contrast = 0,
    highlights = 0,
    shadows = 0,
    saturate = 0,
    vibrance = 0,
    grayscale = 0,
    sepia = 0,
    invert = 0,
    hueRotate = 0,
    temperature = 0,
    tint = 0,
    whites = 0,
    blacks = 0,
    soften = 0,
    rotate = 0,
    straighten = 0,
    perspectiveX = 0,
    perspectiveY = 0,
    clarity = 0,
    dropShadow = 0,
    brightness: editsBrightness = 0,
    centerX = 0.5,
    centerY = 0.5,
    zoomLevel = 1,
    crop,
  } = edits;

  // Calculate brightness with whites/blacks adjustments
  const whitesAdjust = whites / 200;
  const blacksAdjust = blacks / 200;
  // Base brightness (1.0) + exposure + highlights/shadows contributions
  const brightness = Math.min(
    2.0,
    Math.max(
      0.3,
      1 +
        exposure / 200 + // Adjusted divisor from 100 to 200 to prevent blowout
        highlights / 200 +
        shadows / 400 +
        whitesAdjust -
        blacksAdjust +
        editsBrightness / 100,
    ),
  );
  const contrastVal =
    1 + contrast / 100 + highlights / 500 - shadows / 500 + clarity / 200;

  // Vibrance affects less-saturated colors more than saturation
  const vibranceAmount = vibrance / 100;
  const saturateAmount = 1 + saturate / 100;
  const combinedSaturate =
    vibranceAmount !== 0
      ? saturateAmount +
        (vibranceAmount > 0 ? vibranceAmount * 0.5 : vibranceAmount * 0.25)
      : saturateAmount;

  const filters = [
    `brightness(${brightness})`,
    `contrast(${contrastVal})`,
    `saturate(${combinedSaturate})`,
  ];

  // Temperature and Tint normally require SVG filters for pixel-perfect results.
  // We add them to the filter array if they are non-zero.
  // The actual SVG processing happens in a <EditorFilters /> component that must be rendered in the DOM.
  if (temperature !== 0 || tint !== 0) {
    const filterId = photoId
      ? `master-editor-color-matrix-${photoId}`
      : "master-editor-color-matrix";
    filters.push(`url(#${filterId})`);
  }

  filters.push(
    `grayscale(${grayscale}%)`,
    `sepia(${sepia}%)`,
    `invert(${invert}%)`,
    `hue-rotate(${hueRotate}deg)`,
    `blur(${soften}px)`,
  );

  // Apply sharpening (as reverse blur if positive, though CSS doesn't support true sharpening)
  // We can use a small negative blur or a specific convolution if we had access to SVG feConvolveMatrix.
  // For now, sharpen > 0 doesn't have a direct CSS filter equivalent without complex SVG.
  // However, contrast/clarity often simulate sharpening.

  if (dropShadow > 0) {
    filters.push(`drop-shadow(0 4px ${dropShadow}px rgba(0,0,0,0.5))`);
  }

  // Calculate scale-to-fit for straighten to prevent edge cropping
  const angle = rotate + straighten;
  let transformStr = "";

  // Scale-to-fit calculation for straighten - ensures rotated image fits within bounds
  if (straighten !== 0) {
    const rad = Math.abs((straighten * Math.PI) / 180);
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));

    // Refined scale: s = cos(a) + (max(w,h)/min(w,h)) * sin(a)
    // Since we don't have dims here, use a safe default or 1.5 multiplier for common aspect ratios
    // For 3:2, max/min is 1.5. For 16:9, it is 1.77.
    // A value of 1.5 is a much better default than the square 1.0.
    const aspectCorrection = 1.5;
    const scale = cos + sin * aspectCorrection;
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
    perspectiveParts.push(`perspective(${perspectiveValue}px)`);
    if (rotateX !== 0) perspectiveParts.push(`rotateX(${rotateX}deg)`);
    if (rotateY !== 0) perspectiveParts.push(`rotateY(${rotateY}deg)`);
  }

  // Combine transform parts
  const transformParts = [transformStr];
  if (zoomLevel !== 1) {
    // Zoom-from-center framing (Rule 12/15 scale handling)
    const originX = centerX * 100;
    const originY = centerY * 100;
    transformParts.push(`scale(${zoomLevel})`);
    // Note: transform-origin should be set in style object if using this
  }

  if (perspectiveParts.length > 0) {
    transformParts.push(...perspectiveParts);
  }

  const finalTransform = transformParts
    .filter((p) => p && p !== "none")
    .join(" ");

  // Calculate clip-path for crop preview
  let clipPath: string | undefined;
  if (crop && imageWidth && imageHeight) {
    // Convert crop box to percentages for CSS clip-path
    const left = (crop.x / imageWidth) * 100;
    const top = (crop.y / imageHeight) * 100;
    const right = ((crop.x + crop.width) / imageWidth) * 100;
    const bottom = ((crop.y + crop.height) / imageHeight) * 100;

    // Use inset clip-path: top right bottom left
    clipPath = `inset(${top}% ${100 - right}% ${100 - bottom}% ${left}%)`;
  }

  return {
    filter: filters.join(" "),
    transform: finalTransform || "none",
    clipPath,
    transformOrigin:
      zoomLevel !== 1 ? `${centerX * 100}% ${centerY * 100}%` : undefined,
  };
};

/**
 * Generates the 20 values for feColorMatrix based on temperature and tint.
 * Temperature: -100 (Cool) to 100 (Warm)
 * Tint: -100 (Green) to 100 (Magenta)
 */
export const getColorMatrixValues = (temperature: number, tint: number) => {
  // Identity matrix
  const matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

  // Temperature (Warm/Cool)
  // Warm: Red high, Blue low. Cool: Blue high, Red low.
  if (temperature !== 0) {
    const factor = temperature / 200;
    if (factor > 0) {
      // Warm
      matrix[0] += factor; // Red
      matrix[12] -= factor; // Blue
    } else {
      // Cool
      matrix[0] += factor; // factor is negative
      matrix[12] -= factor; // factor is negative, so this adds
    }
  }

  // Tint (Green/Magenta)
  // Magenta: Red+Blue high. Green: Green high.
  if (tint !== 0) {
    const factor = tint / 200;
    if (factor > 0) {
      // Magenta
      matrix[0] += factor * 0.5;
      matrix[12] += factor * 0.5;
      matrix[6] -= factor;
    } else {
      // Green
      matrix[0] += factor * 0.5;
      matrix[12] += factor * 0.5;
      matrix[6] -= factor; // subtracting negative adds green
    }
  }

  return matrix.join(" ");
};
/**
 * Checks if a ManualEdits object has any non-default values.
 */
export function isEdited(edits?: ManualEdits | null): boolean {
  if (!edits) return false;

  return Object.entries(edits).some(([key, value]) => {
    // Skip non-visual or complex fields that don't reset to 0
    if (
      key === "crop" ||
      key === "retouchActions" ||
      key === "annotations" ||
      key === "centerX" ||
      key === "centerY" ||
      key === "zoomLevel"
    ) {
      return value !== undefined && value !== null;
    }

    // Default initial value check (most are 0, sharpening is 0, rotate is 0, etc.)
    const initialValue = (INITIAL_EDITS as any)[key];
    return value !== undefined && value !== null && value !== initialValue;
  });
}
