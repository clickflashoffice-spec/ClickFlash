import { ManualEdits } from '../types/shared';

export interface FilterPreset {
  name: string;
  icon: string;
  edits: Partial<ManualEdits>;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'Original',
    icon: '✨',
    edits: {}
  },
  {
    name: 'Vintage',
    icon: '📷',
    edits: {
      sepia: 30,
      contrast: 10,
      saturate: -20,
      temperature: 15,
      vignette: 20
    }
  },
  {
    name: 'Black & White',
    icon: '⚫',
    edits: {
      grayscale: 100,
      contrast: 20,
      brightness: 5
    }
  },
  {
    name: 'Warm',
    icon: '☀️',
    edits: {
      temperature: 25,
      sepia: 15,
      highlights: -10,
      shadows: 10
    }
  },
  {
    name: 'Cool',
    icon: '❄️',
    edits: {
      temperature: -20,
      tint: 10,
      shadows: 15,
      highlights: 5
    }
  },
  {
    name: 'Vivid',
    icon: '🌈',
    edits: {
      saturate: 40,
      vibrance: 30,
      contrast: 15,
      clarity: 20
    }
  },
  {
    name: 'Dramatic',
    icon: '🎭',
    edits: {
      contrast: 35,
      shadows: -30,
      highlights: -20,
      clarity: 30,
      vignette: 40
    }
  },
  {
    name: 'Soft',
    icon: '🌸',
    edits: {
      contrast: -15,
      brightness: 10,
      saturate: -10,
      soften: 15,
      highlights: 20
    }
  },
  {
    name: 'Noir',
    icon: '🎬',
    edits: {
      grayscale: 100,
      contrast: 50,
      brightness: -10,
      vignette: 60,
      shadows: -40
    }
  },
  {
    name: 'Golden',
    icon: '🏆',
    edits: {
      temperature: 30,
      sepia: 25,
      saturate: 20,
      contrast: 15,
      highlights: -15,
      shadows: 20
    }
  }
];

export const generateCSSFilter = (edits: ManualEdits | undefined): string => {
  if (!edits) return 'none';
  
  const filters: string[] = [];
  
  // Brightness (-100 to 100) -> (0% to 200%)
  if (edits.brightness !== undefined && edits.brightness !== 0) {
    filters.push(`brightness(${100 + edits.brightness}%)`);
  }
  
  // Contrast (-100 to 100) -> (0% to 200%)
  if (edits.contrast !== undefined && edits.contrast !== 0) {
    filters.push(`contrast(${100 + edits.contrast}%)`);
  }
  
  // Saturation (-100 to 100) -> (0% to 200%)
  if (edits.saturate !== undefined && edits.saturate !== 0) {
    filters.push(`saturate(${100 + edits.saturate}%)`);
  }
  
  // Grayscale (0 to 100) -> (0% to 100%)
  if (edits.grayscale !== undefined && edits.grayscale !== 0) {
    filters.push(`grayscale(${edits.grayscale}%)`);
  }
  
  // Sepia (0 to 100) -> (0% to 100%)
  if (edits.sepia !== undefined && edits.sepia !== 0) {
    filters.push(`sepia(${edits.sepia}%)`);
  }
  
  // Hue rotate (-180 to 180) -> (-180deg to 180deg)
  if (edits.hueRotate !== undefined && edits.hueRotate !== 0) {
    filters.push(`hue-rotate(${edits.hueRotate}deg)`);
  }
  
  // Invert (0 to 100) -> (0% to 100%)
  if (edits.invert !== undefined && edits.invert !== 0) {
    filters.push(`invert(${edits.invert}%)`);
  }
  
  // Blur/Soften (0 to 20) -> (0px to 10px)
  if (edits.soften !== undefined && edits.soften !== 0) {
    filters.push(`blur(${edits.soften * 0.5}px)`);
  }
  
  return filters.length > 0 ? filters.join(' ') : 'none';
};

export const applyEditsToCanvas = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  edits: ManualEdits
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Set canvas dimensions to match natural image size
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Save context state
  ctx.save();
  
  // Apply filters via CSS filter string
  const filterString = generateCSSFilter(edits);
  if (filterString !== 'none') {
    ctx.filter = filterString;
  }
  
  // Handle rotation
  if (edits.rotate) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((edits.rotate * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  }
  
  // Handle crop
  if (edits.crop) {
    const { x, y, width, height } = edits.crop;
    ctx.drawImage(
      image,
      x, y, width, height,
      0, 0, canvas.width, canvas.height
    );
  } else {
    ctx.drawImage(image, 0, 0);
  }
  
  // Restore context
  ctx.restore();
  
  // Apply vignette if needed (manual canvas drawing)
  if (edits.vignette && edits.vignette > 0) {
    applyVignette(ctx, canvas.width, canvas.height, edits.vignette);
  }
};

const applyVignette = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void => {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 2
  );
  
  const alpha = intensity / 100;
  gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.3})`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

export const downloadEditedImage = (
  canvas: HTMLCanvasElement,
  filename: string = 'edited-image.jpg'
): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
};
