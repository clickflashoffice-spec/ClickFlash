import { describe, expect, it } from 'vitest';

import { chunkArrayBuffer } from './touchSyncClient';

describe('chunkArrayBuffer', () => {
  it('splits a photo into ordered bounded chunks without losing bytes', () => {
    const source = Uint8Array.from({ length: 10 }, (_, index) => index).buffer;
    const chunks = chunkArrayBuffer(source, 4);

    expect(chunks.map((chunk) => chunk.byteLength)).toEqual([4, 4, 2]);
    expect([...new Uint8Array(chunks[0]), ...new Uint8Array(chunks[1]), ...new Uint8Array(chunks[2])])
      .toEqual([...new Uint8Array(source)]);
  });

  it('rejects invalid chunk sizes', () => {
    expect(() => chunkArrayBuffer(new ArrayBuffer(1), 0)).toThrow(
      'positive integer',
    );
  });
});
