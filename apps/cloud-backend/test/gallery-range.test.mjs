import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSingleByteRange } from '../src/routes/gallery.ts';

test('parses bounded, open-ended, and suffix byte ranges', () => {
  assert.deepEqual(parseSingleByteRange('bytes=0-99', 1_000), {
    start: 0,
    end: 99,
    length: 100
  });
  assert.deepEqual(parseSingleByteRange('bytes=900-', 1_000), {
    start: 900,
    end: 999,
    length: 100
  });
  assert.deepEqual(parseSingleByteRange('bytes=-25', 1_000), {
    start: 975,
    end: 999,
    length: 25
  });
  assert.deepEqual(parseSingleByteRange('bytes=950-5000', 1_000), {
    start: 950,
    end: 999,
    length: 50
  });
});

test('rejects malformed, multiple, reversed, and unsatisfiable ranges', () => {
  for (const value of [
    'items=0-10',
    'bytes=0-1,4-5',
    'bytes=20-10',
    'bytes=1000-',
    'bytes=-0',
    'bytes=a-b'
  ]) {
    assert.throws(() => parseSingleByteRange(value, 1_000), RangeError);
  }
});
