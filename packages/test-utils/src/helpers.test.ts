import { describe, it, expect } from 'vitest';
import { wait, createDeferred, generateId, clamp } from './helpers.js';

describe('wait', () => {
  it('resolves after specified ms', async () => {
    const start = Date.now();
    await wait(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(45);
  });
});

describe('createDeferred', () => {
  it('resolves with value', async () => {
    const { promise, resolve } = createDeferred<string>();
    resolve('hello');
    await expect(promise).resolves.toBe('hello');
  });

  it('rejects with reason', async () => {
    const { promise, reject } = createDeferred<string>();
    reject(new Error('fail'));
    await expect(promise).rejects.toThrow('fail');
  });
});

describe('generateId', () => {
  it('generates unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });
});

describe('clamp', () => {
  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
