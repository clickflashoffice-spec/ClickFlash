import { describe, it, expect } from 'vitest';
import { slugify, generateId, prefixedId } from '../id.js';

describe('id utils', () => {
  it('slugify', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it('generateId', () => {
    const id = generateId(10);
    expect(id).toHaveLength(10);
    expect(id).not.toBe(generateId(10));
  });

  it('prefixedId', () => {
    const id = prefixedId('usr', 10);
    expect(id.startsWith('usr_')).toBe(true);
  });
});
