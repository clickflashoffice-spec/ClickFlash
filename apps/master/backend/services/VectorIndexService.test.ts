import { VectorIndexService } from "./VectorIndexService";

describe("VectorIndexService.normalizeL2", () => {
  it.each([128, 512])("normalizes a finite %iD vector without truncation", (dimension) => {
    const vector = new Float32Array(dimension);
    vector[0] = 3;
    vector[1] = 4;

    const normalized = VectorIndexService.normalizeL2(vector);
    const norm = Math.sqrt(
      normalized.reduce((sum, value) => sum + value * value, 0),
    );

    expect(normalized).toHaveLength(dimension);
    expect(normalized[0]).toBeCloseTo(0.6, 6);
    expect(normalized[1]).toBeCloseTo(0.8, 6);
    expect(norm).toBeCloseTo(1, 6);
  });

  it("rejects zero, non-finite, and unsupported vectors", () => {
    expect(() => VectorIndexService.normalizeL2(new Float32Array(128))).toThrow(
      "non-zero L2 norm",
    );

    const nonFinite = new Float32Array(128);
    nonFinite[0] = Number.NaN;
    expect(() => VectorIndexService.normalizeL2(nonFinite)).toThrow(
      "non-finite value",
    );

    expect(() => VectorIndexService.normalizeL2(new Float32Array(64))).toThrow(
      "Unsupported face-vector dimension",
    );
  });
});
