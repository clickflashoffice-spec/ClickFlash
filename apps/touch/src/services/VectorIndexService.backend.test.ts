import { describe, expect, it } from "vitest";

import { VectorIndexService } from "../../backend/services/VectorIndexService";

describe("VectorIndexService.normalizeL2", () => {
  it("normalizes a finite 128D vector", () => {
    const vector = new Float32Array(128);
    vector[0] = 3;
    vector[1] = 4;

    const normalized = VectorIndexService.normalizeL2(vector);
    const norm = Math.sqrt(
      normalized.reduce((sum, value) => sum + value * value, 0),
    );

    expect(normalized).toHaveLength(128);
    expect(normalized[0]).toBeCloseTo(0.6, 6);
    expect(normalized[1]).toBeCloseTo(0.8, 6);
    expect(norm).toBeCloseTo(1, 6);
  });

  it("rejects invalid dimensions and norms", () => {
    expect(() => VectorIndexService.normalizeL2(new Float32Array(127))).toThrow(
      "Expected a 128D face vector",
    );
    expect(() => VectorIndexService.normalizeL2(new Float32Array(128))).toThrow(
      "non-zero L2 norm",
    );
  });
});
