export interface PixelBounds {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ByteRange {
  start: number;
  end: number;
}

const JPEG_SOI = [0xff, 0xd8, 0xff] as const;
const JPEG_EOI = [0xff, 0xd9] as const;
const MAX_BOX_DEPTH = 8;

export function isSkinPixel(red: number, green: number, blue: number): boolean {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta > 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;

  const saturation = maximum === 0 ? 0 : delta / maximum;
  const value = maximum / 255;
  const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
  const cb = 128 - 0.168736 * red - 0.331264 * green + 0.5 * blue;
  const cr = 128 + 0.5 * red - 0.418688 * green - 0.081312 * blue;

  const hsvMatch =
    hue <= 50 && saturation >= 0.15 && saturation <= 0.68 && value >= 0.35;
  const yCbCrMatch =
    luminance >= 50 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
  return hsvMatch && yCbCrMatch;
}

export function findSkinBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  minimumSkinPixels = 50,
): { bounds: PixelBounds; skinPixels: number } {
  let skinPixels = 0;
  let minimumX = width;
  let minimumY = height;
  let maximumX = 0;
  let maximumY = 0;

  for (let offset = 0; offset < rgba.length; offset += 4) {
    if (!isSkinPixel(rgba[offset], rgba[offset + 1], rgba[offset + 2])) continue;

    const pixel = offset / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    skinPixels++;
    minimumX = Math.min(minimumX, x);
    minimumY = Math.min(minimumY, y);
    maximumX = Math.max(maximumX, x);
    maximumY = Math.max(maximumY, y);
  }

  const hasSkinRegion = skinPixels >= minimumSkinPixels;
  return {
    skinPixels,
    bounds: {
      startX: hasSkinRegion ? Math.max(1, minimumX) : 1,
      startY: hasSkinRegion ? Math.max(1, minimumY) : 1,
      endX: hasSkinRegion ? Math.min(width - 1, maximumX) : width - 1,
      endY: hasSkinRegion ? Math.min(height - 1, maximumY) : height - 1,
    },
  };
}

export function calculateLaplacianVariance(
  grayscale: Uint8Array,
  width: number,
  height: number,
  bounds: PixelBounds = { startX: 1, startY: 1, endX: width - 1, endY: height - 1 },
): number {
  if (width < 3 || height < 3 || grayscale.length !== width * height) return 0;

  const startX = Math.max(1, Math.min(width - 2, bounds.startX));
  const startY = Math.max(1, Math.min(height - 2, bounds.startY));
  const endX = Math.max(startX + 1, Math.min(width - 1, bounds.endX));
  const endY = Math.max(startY + 1, Math.min(height - 1, bounds.endY));
  let sum = 0;
  let squaredSum = 0;
  let count = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = y * width + x;
      const laplacian =
        grayscale[index - width - 1] +
        grayscale[index - width] +
        grayscale[index - width + 1] +
        grayscale[index - 1] -
        8 * grayscale[index] +
        grayscale[index + 1] +
        grayscale[index + width - 1] +
        grayscale[index + width] +
        grayscale[index + width + 1];
      sum += laplacian;
      squaredSum += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return Math.max(0, squaredSum / count - mean * mean);
}

function findLargestJpeg(bytes: Uint8Array, ranges: ByteRange[]): Uint8Array | null {
  let largest: ByteRange | null = null;

  for (const range of ranges) {
    const start = Math.max(0, range.start);
    const end = Math.min(bytes.length, range.end);
    for (let offset = start; offset <= end - JPEG_SOI.length; offset++) {
      if (
        bytes[offset] !== JPEG_SOI[0] ||
        bytes[offset + 1] !== JPEG_SOI[1] ||
        bytes[offset + 2] !== JPEG_SOI[2]
      ) {
        continue;
      }

      for (let cursor = offset + JPEG_SOI.length; cursor < end - 1; cursor++) {
        if (bytes[cursor] === JPEG_EOI[0] && bytes[cursor + 1] === JPEG_EOI[1]) {
          const candidate = { start: offset, end: cursor + 2 };
          if (!largest || candidate.end - candidate.start > largest.end - largest.start) {
            largest = candidate;
          }
          offset = cursor + 1;
          break;
        }
      }
    }
  }

  return largest ? bytes.slice(largest.start, largest.end) : null;
}

function tiffCandidateRanges(bytes: Uint8Array): ByteRange[] {
  if (bytes.length < 8) return [];
  const littleEndian = bytes[0] === 0x49 && bytes[1] === 0x49;
  const bigEndian = bytes[0] === 0x4d && bytes[1] === 0x4d;
  if (!littleEndian && !bigEndian) return [];

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read16 = (offset: number) => view.getUint16(offset, littleEndian);
  const read32 = (offset: number) => view.getUint32(offset, littleEndian);
  if (read16(2) !== 42) return [];

  const ranges: ByteRange[] = [];
  const visited = new Set<number>();

  const visitIfd = (ifdOffset: number, depth: number): void => {
    if (depth > MAX_BOX_DEPTH || visited.has(ifdOffset) || ifdOffset + 2 > bytes.length) return;
    visited.add(ifdOffset);
    const entryCount = read16(ifdOffset);
    const entriesEnd = ifdOffset + 2 + entryCount * 12;
    if (entriesEnd + 4 > bytes.length) return;

    let jpegOffset: number | null = null;
    let jpegLength: number | null = null;
    const childIfds: number[] = [];

    for (let index = 0; index < entryCount; index++) {
      const entry = ifdOffset + 2 + index * 12;
      const tag = read16(entry);
      const count = read32(entry + 4);
      const value = read32(entry + 8);
      if (tag === 0x0201) jpegOffset = value;
      else if (tag === 0x0202) jpegLength = value;
      else if (tag === 0x8769) childIfds.push(value);
      else if (tag === 0x014a && count === 1) childIfds.push(value);
      else if (tag === 0x014a && value + count * 4 <= bytes.length) {
        for (let child = 0; child < count; child++) childIfds.push(read32(value + child * 4));
      }
    }

    if (
      jpegOffset !== null &&
      jpegLength !== null &&
      jpegLength > 0 &&
      jpegOffset + jpegLength <= bytes.length
    ) {
      ranges.push({ start: jpegOffset, end: jpegOffset + jpegLength });
    }

    const nextIfd = read32(entriesEnd);
    if (nextIfd > 0) childIfds.push(nextIfd);
    childIfds.forEach((child) => visitIfd(child, depth + 1));
  };

  visitIfd(read32(4), 0);
  return ranges;
}

function isobmffCandidateRanges(bytes: Uint8Array): ByteRange[] {
  if (bytes.length < 8) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ranges: ByteRange[] = [];
  const containerTypes = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'meta', 'dinf']);
  const previewTypes = new Set(['mdat', 'PRVW', 'THMB', 'thmb']);

  const parseBoxes = (start: number, end: number, depth: number): void => {
    if (depth > MAX_BOX_DEPTH) return;
    let offset = start;
    while (offset + 8 <= end) {
      const size32 = view.getUint32(offset);
      const type = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7],
      );
      let headerSize = 8;
      let boxSize = size32;
      if (size32 === 1) {
        if (offset + 16 > end) return;
        const size64 = view.getBigUint64(offset + 8);
        if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) return;
        boxSize = Number(size64);
        headerSize = 16;
      } else if (size32 === 0) {
        boxSize = end - offset;
      }
      if (boxSize < headerSize || offset + boxSize > end) return;

      const payloadStart = offset + headerSize + (type === 'meta' ? 4 : 0);
      const boxEnd = offset + boxSize;
      if (previewTypes.has(type)) ranges.push({ start: payloadStart, end: boxEnd });
      if (containerTypes.has(type) && payloadStart < boxEnd) {
        parseBoxes(payloadStart, boxEnd, depth + 1);
      }
      offset = boxEnd;
    }
  };

  parseBoxes(0, bytes.length, 0);
  return ranges;
}

export function extractEmbeddedJpeg(buffer: ArrayBuffer): Uint8Array | null {
  const bytes = new Uint8Array(buffer);
  const structuredRanges = [
    ...tiffCandidateRanges(bytes),
    ...isobmffCandidateRanges(bytes),
  ];
  return (
    findLargestJpeg(bytes, structuredRanges) ??
    findLargestJpeg(bytes, [{ start: 0, end: bytes.length }])
  );
}
