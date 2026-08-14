import { describe, it, expect, vi, beforeEach } from 'vitest';

// Because faceSearch.worker.ts uses self.onmessage and does not export its internal functions,
// we must simulate the worker environment by setting up the global self and intercepting postMessage.

describe('FaceSearchWorker', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    postMessageSpy = vi.fn();
    
    // @ts-ignore
    global.self = {
      postMessage: postMessageSpy as any,
      onmessage: null,
    };
    
    // Import dynamically so it attaches to our mocked self.onmessage
    await import('../faceSearch.worker');
  });

  const sendMessage = (data: any) => {
    if (global.self.onmessage) {
      // @ts-ignore
      global.self.onmessage({ data } as MessageEvent);
    }
  };

  it('extracts descriptor from image data correctly', () => {
    // 16 cols x 8 rows = 128 cells.
    // Let's create an ImageData of 32x16 (2x2 pixels per cell).
    const width = 32;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Fill with some pattern (gray scale)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100;     // R
      data[i + 1] = 100; // G
      data[i + 2] = 100; // B
      data[i + 3] = 255; // A
    }

    sendMessage({
      type: 'extract',
      payload: {
        imageData: { data, width, height }
      }
    });

    expect(postMessageSpy).toHaveBeenCalled();
    const result = postMessageSpy.mock.calls[0][0];
    
    expect(result.type).toBe('extract_result');
    expect(result.success).toBe(true);
    expect(result.data.vector).toHaveLength(128);
    expect(result.data.dimensions).toBe(128);
    // Values should be roughly equal and normalized to 1 (sqrt(128 * x^2) = 1) -> x = ~0.088388
    expect(result.data.vector[0]).toBeGreaterThan(0.08);
    expect(result.data.vector[0]).toBeLessThan(0.09);
  });

  it('handles multi-channel descriptor matching (cosine similarity)', () => {
    const targetVector = new Array(128).fill(0).map((_, i) => (i % 2 === 0 ? 0.5 : 0.1));
    // Candidate 1: Exactly same -> Similarity 1.0
    const candidate1 = { id: 'c1', vector: [...targetVector] };
    // Candidate 2: Opposite -> Similarity roughly 0 or low
    const candidate2 = { id: 'c2', vector: new Array(128).fill(0).map((_, i) => (i % 2 === 0 ? 0.1 : 0.5)) };

    sendMessage({
      type: 'match',
      payload: {
        targetVector,
        candidateVectors: [candidate1, candidate2],
        threshold: 0.5
      }
    });

    const result = postMessageSpy.mock.calls[0][0];
    expect(result.type).toBe('match_result');
    expect(result.success).toBe(true);
    
    const matches = result.data.matches;
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe('c1');
    expect(matches[0].similarity).toBeCloseTo(1, 5);
  });

  it('top-K matching: 5 database vectors -> returns top matches above threshold sorted by score', () => {
    // Generate distinct angular vectors
    const targetVector = Array.from({ length: 128 }, (_, i) => Math.sin(i));
    
    // Create candidates with distinct cosine similarity scores
    const candidates = [
      { id: '1', vector: [...targetVector] }, // exact match (~1.0)
      { id: '2', vector: Array.from({ length: 128 }, (_, i) => Math.cos(i * 3)) }, // low similarity
      { id: '3', vector: targetVector.map((v, i) => v + 0.1 * Math.cos(i)) }, // ~0.95 similarity
      { id: '4', vector: targetVector.map((v, i) => v + 0.3 * Math.cos(i)) }, // ~0.82 similarity
      { id: '5', vector: targetVector.map(v => -v) }, // negative similarity
    ];

    sendMessage({
      type: 'match',
      payload: {
        targetVector,
        candidateVectors: candidates,
        threshold: 0.8 // threshold should filter out low matches
      }
    });

    const result = postMessageSpy.mock.calls[0][0];
    expect(result.success).toBe(true);
    
    const matches = result.data.matches;
    // Expected top 3 based on simple vector diff to target
    expect(matches.length).toBe(3);
    expect(matches[0].id).toBe('1');
    expect(matches[1].id).toBe('3');
    expect(matches[2].id).toBe('4');
  });

  it('handles empty database -> returns empty array', () => {
    sendMessage({
      type: 'match',
      payload: {
        targetVector: new Array(128).fill(0.5),
        candidateVectors: [],
        threshold: 0.5
      }
    });

    const result = postMessageSpy.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.matches).toEqual([]);
    expect(result.data.totalEvaluated).toBe(0);
  });
});
