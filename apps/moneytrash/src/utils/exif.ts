/**
 * Lightweight EXIF reader utility
 * Extracts basic metadata like Date Taken
 */

export async function getExifData(file: File): Promise<{ dateTaken?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve({});
        return;
      }

      const view = new DataView(arrayBuffer);
      if (view.getUint16(0) !== 0xffd8) {
        resolve({}); // Not a JPEG
        return;
      }

      let offset = 2;
      while (offset < view.byteLength) {
        if (view.getUint16(offset) === 0xffe1) {
          // Found APP1 (EXIF)
          const exifData = parseExif(view, offset + 4);
          resolve({ dateTaken: exifData.dateTaken });
          return;
        }
        offset += 2 + view.getUint16(offset + 2);
      }
      resolve({});
    };
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // Read first 128KB
  });
}

function parseExif(view: DataView, offset: number): { dateTaken?: string } {
  // Very simplified EXIF parsing for 'DateTimeOriginal' (Tag 0x9003)
  // This is a minimal implementation to avoid large dependencies
  try {
    const isLittleEndian = view.getUint16(offset + 6) === 0x4949;
    // Validate EXIF header by checking TIFF magic number
    const _tiffMagic = view.getUint32(offset + 10, isLittleEndian);

    // Search for DateTimeOriginal tag (Simplified search)
    // Real implementation would traverse IFD entries...
    // For now, we'll try a regex search on the first chunk as string for fallback
    // relative to standard offsets.

    return {}; // Placeholder for real parsing or regex fallback
  } catch (e) {
    return {};
  }
}

/**
 * Fallback regex approach for quick metadata extraction
 */
export function getMetadataFallback(
  file: File,
): Promise<{ dateTaken?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const str = e.target?.result as string;
      // Search for YYYY:MM:DD HH:MM:SS
      const match = str.match(/\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/);
      if (match) {
        resolve({ dateTaken: match[0] });
      } else {
        resolve({});
      }
    };
    reader.readAsBinaryString(file.slice(0, 256 * 1024));
  });
}
