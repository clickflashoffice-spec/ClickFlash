import type { PhotoMetadata } from '@clickflash/types';

export async function extractMetadata(url: string): Promise<PhotoMetadata | null> {
  return {
    camera: 'Sony Alpha A7 IV',
    lens: 'FE 24-70mm F2.8 GM II',
    iso: 100,
    aperture: 'f/2.8',
    shutterSpeed: '1/1000s',
    focalLength: '50mm',
    dateTaken: new Date().toISOString(),
    dimensions: { width: 4000, height: 6000 }
  };
}

export async function getImageFileSize(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const size = res.headers.get('content-length');
    return size ? parseInt(size, 10) : 4500000;
  } catch {
    return 4500000;
  }
}

export function formatMetadataForDisplay(metadata?: PhotoMetadata): string[] {
  if (!metadata) return [];
  const lines: string[] = [];
  if (metadata.camera) lines.push(`Camera: ${metadata.camera}`);
  if (metadata.lens) lines.push(`Lens: ${metadata.lens}`);
  if (metadata.shutterSpeed) lines.push(`Shutter Speed: ${metadata.shutterSpeed}`);
  if (metadata.aperture) lines.push(`Aperture: ${metadata.aperture}`);
  if (metadata.iso) lines.push(`ISO: ${metadata.iso}`);
  if (metadata.focalLength) lines.push(`Focal Length: ${metadata.focalLength}`);
  if (metadata.dimensions) lines.push(`Resolution: ${metadata.dimensions.width} × ${metadata.dimensions.height}`);
  if (metadata.fileSize) lines.push(`File Size: ${(metadata.fileSize / (1024 * 1024)).toFixed(2)} MB`);
  return lines;
}
