import { describe, expect, it } from 'vitest';

import {
  calculateLaplacianVariance,
  extractEmbeddedJpeg,
  isSkinPixel,
} from '../grade-core';

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02, 0xff, 0xd9]);

function createTiffWithPreview(): ArrayBuffer {
  const previewOffset = 64;
  const bytes = new Uint8Array(previewOffset + jpeg.length);
  const view = new DataView(bytes.buffer);
  bytes.set([0x49, 0x49], 0);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, 2, true);
  view.setUint16(10, 0x0201, true);
  view.setUint16(12, 4, true);
  view.setUint32(14, 1, true);
  view.setUint32(18, previewOffset, true);
  view.setUint16(22, 0x0202, true);
  view.setUint16(24, 4, true);
  view.setUint32(26, 1, true);
  view.setUint32(30, jpeg.length, true);
  view.setUint32(34, 0, true);
  bytes.set(jpeg, previewOffset);
  return bytes.buffer;
}

function createIsobmffWithPreview(): ArrayBuffer {
  const bytes = new Uint8Array(8 + jpeg.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, bytes.length);
  bytes.set([0x6d, 0x64, 0x61, 0x74], 4);
  bytes.set(jpeg, 8);
  return bytes.buffer;
}

describe('grade-core', () => {
  it('requires both HSV and YCbCr skin classification', () => {
    expect(isSkinPixel(210, 150, 120)).toBe(true);
    expect(isSkinPixel(20, 90, 220)).toBe(false);
  });

  it('computes isotropic Laplacian variance inside the requested ROI', () => {
    const flat = new Uint8Array(25).fill(100);
    const edge = new Uint8Array(25).fill(0);
    edge[12] = 255;

    expect(calculateLaplacianVariance(flat, 5, 5)).toBe(0);
    expect(calculateLaplacianVariance(edge, 5, 5)).toBeGreaterThan(0);
  });

  it.each([createTiffWithPreview, createIsobmffWithPreview])(
    'extracts a bounded embedded JPEG from RAW containers',
    (createContainer) => {
      expect(extractEmbeddedJpeg(createContainer())).toEqual(jpeg);
    },
  );
});
