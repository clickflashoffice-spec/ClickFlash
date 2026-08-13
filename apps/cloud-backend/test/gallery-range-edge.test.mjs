import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseSingleByteRange } from '../src/routes/gallery';

describe('gallery range edge cases', () => {
  it('suffix range bytes=-500 returns last 500 bytes (206)', () => {
    const res = parseSingleByteRange('bytes=-500', 1000);
    expect(res).toEqual({ start: 500, end: 999, length: 500 });
  });

  it('range exceeding file size -> limits to file size', () => {
    // Suffix range exceeding size
    const res = parseSingleByteRange('bytes=-5000', 1000);
    expect(res).toEqual({ start: 0, end: 999, length: 1000 });
  });

  it('range exceeding file size -> throws if start > size', () => {
    expect(() => parseSingleByteRange('bytes=1500-2000', 1000)).toThrow(/Unsatisfiable byte range/);
  });

  it('malformed range bytes=abc-def -> throws', () => {
    expect(() => parseSingleByteRange('bytes=abc-def', 1000)).toThrow(/Malformed or multiple byte range/);
  });

  it('bytes=0-0 -> 206 with single byte', () => {
    const res = parseSingleByteRange('bytes=0-0', 1000);
    expect(res).toEqual({ start: 0, end: 0, length: 1 });
  });

  it('exact last byte bytes=99-99 on 100-byte file -> 206', () => {
    const res = parseSingleByteRange('bytes=99-99', 100);
    expect(res).toEqual({ start: 99, end: 99, length: 1 });
  });
});
