import { describe, it, expect } from 'vitest';
import {
  aiScoreSchema,
  editParamsSchema,
  tagResultSchema,
  faceVectorSchema,
  curationResultSchema,
  geminiConfigSchema,
} from './schemas.js';

// ─── aiScoreSchema ────────────────────────────────────────────────────────────

describe('aiScoreSchema', () => {
  const validScore = {
    sharpness: 85,
    exposure: 72,
    composition: 90,
    overall: 82,
    faceCount: 2,
    hasClosedEyes: false,
    isBlurry: false,
    grade: 'A' as const,
    reason: 'Great shot, nice composition',
  };

  it('accepts a valid AIScore', () => {
    expect(() => aiScoreSchema.parse(validScore)).not.toThrow();
  });

  it('rejects sharpness > 100', () => {
    expect(() => aiScoreSchema.parse({ ...validScore, sharpness: 101 })).toThrow();
  });

  it('rejects sharpness < 0', () => {
    expect(() => aiScoreSchema.parse({ ...validScore, sharpness: -1 })).toThrow();
  });

  it('rejects invalid grade enum', () => {
    expect(() => aiScoreSchema.parse({ ...validScore, grade: 'S+' })).toThrow();
  });

  it('accepts all valid grade values', () => {
    const grades = ['A+', 'A', 'B', 'C', 'REJECT'] as const;
    for (const grade of grades) {
      expect(() => aiScoreSchema.parse({ ...validScore, grade })).not.toThrow();
    }
  });

  it('rejects negative faceCount', () => {
    expect(() => aiScoreSchema.parse({ ...validScore, faceCount: -1 })).toThrow();
  });

  it('rejects non-integer faceCount', () => {
    expect(() => aiScoreSchema.parse({ ...validScore, faceCount: 1.5 })).toThrow();
  });
});

// ─── editParamsSchema ─────────────────────────────────────────────────────────

describe('editParamsSchema', () => {
  const validParams = {
    brightness: 10,
    contrast: -5,
    saturation: 20,
    sharpness: 50,
    temperature: 15,
    tint: 0,
    highlights: -20,
    shadows: 30,
    vibrance: 10,
    cropX: 0,
    cropY: 0,
    cropWidth: 1920,
    cropHeight: 1080,
    rotation: 0,
  };

  it('accepts valid edit params', () => {
    expect(() => editParamsSchema.parse(validParams)).not.toThrow();
  });

  it('rejects brightness > 100', () => {
    expect(() => editParamsSchema.parse({ ...validParams, brightness: 101 })).toThrow();
  });

  it('rejects brightness < -100', () => {
    expect(() => editParamsSchema.parse({ ...validParams, brightness: -101 })).toThrow();
  });

  it('rejects sharpness < 0', () => {
    expect(() => editParamsSchema.parse({ ...validParams, sharpness: -1 })).toThrow();
  });

  it('rejects negative cropWidth', () => {
    expect(() => editParamsSchema.parse({ ...validParams, cropWidth: -10 })).toThrow();
  });

  it('accepts extreme but valid rotation values', () => {
    // rotation has no min/max in schema
    expect(() => editParamsSchema.parse({ ...validParams, rotation: 360 })).not.toThrow();
    expect(() => editParamsSchema.parse({ ...validParams, rotation: -180 })).not.toThrow();
  });
});

// ─── tagResultSchema ──────────────────────────────────────────────────────────

describe('tagResultSchema', () => {
  const validTags = {
    tags: ['beach', 'sunset', 'family'],
    peopleCount: 3,
    scene: 'outdoor beach',
    mood: 'joyful',
    weather: 'sunny',
    timeOfDay: 'golden hour',
    activities: ['swimming', 'running'],
    clothingColors: ['blue', 'white'],
    accessories: ['sunglasses'],
    confidence: 0.92,
  };

  it('accepts valid tag result', () => {
    expect(() => tagResultSchema.parse(validTags)).not.toThrow();
  });

  it('rejects confidence > 1', () => {
    expect(() => tagResultSchema.parse({ ...validTags, confidence: 1.1 })).toThrow();
  });

  it('rejects confidence < 0', () => {
    expect(() => tagResultSchema.parse({ ...validTags, confidence: -0.1 })).toThrow();
  });

  it('rejects negative peopleCount', () => {
    expect(() => tagResultSchema.parse({ ...validTags, peopleCount: -1 })).toThrow();
  });

  it('accepts empty arrays for tags, activities, colors, accessories', () => {
    const minimal = { ...validTags, tags: [], activities: [], clothingColors: [], accessories: [] };
    expect(() => tagResultSchema.parse(minimal)).not.toThrow();
  });
});

// ─── faceVectorSchema ─────────────────────────────────────────────────────────

describe('faceVectorSchema', () => {
  it('accepts Float32Array data', () => {
    const vec = {
      dimensions: 128,
      data: new Float32Array(128),
      modelVersion: 'v1.0',
    };
    expect(() => faceVectorSchema.parse(vec)).not.toThrow();
  });

  it('accepts regular number array data', () => {
    const vec = {
      dimensions: 128,
      data: Array.from({ length: 128 }, () => 0.5),
      modelVersion: 'v1.0',
    };
    expect(() => faceVectorSchema.parse(vec)).not.toThrow();
  });

  it('rejects missing modelVersion', () => {
    expect(() =>
      faceVectorSchema.parse({ dimensions: 128, data: new Float32Array(128) }),
    ).toThrow();
  });
});

// ─── curationResultSchema ─────────────────────────────────────────────────────

describe('curationResultSchema', () => {
  const validScore = {
    sharpness: 85,
    exposure: 72,
    composition: 90,
    overall: 82,
    faceCount: 2,
    hasClosedEyes: false,
    isBlurry: false,
    grade: 'A' as const,
    reason: 'Good photo',
  };
  const validTags = {
    tags: ['beach'],
    peopleCount: 2,
    scene: 'outdoor',
    mood: 'happy',
    weather: 'sunny',
    timeOfDay: 'afternoon',
    activities: ['walking'],
    clothingColors: ['blue'],
    accessories: [],
    confidence: 0.9,
  };

  it('accepts valid curation result', () => {
    const result = {
      photoId: 'photo-123',
      status: 'APPROVED' as const,
      score: validScore,
      tags: validTags,
      processedAt: new Date().toISOString(),
    };
    expect(() => curationResultSchema.parse(result)).not.toThrow();
  });

  it('rejects invalid status', () => {
    const result = {
      photoId: 'photo-123',
      status: 'MAYBE',
      score: validScore,
      tags: validTags,
      processedAt: new Date().toISOString(),
    };
    expect(() => curationResultSchema.parse(result)).toThrow();
  });

  it('rejects invalid processedAt (not datetime)', () => {
    const result = {
      photoId: 'photo-123',
      status: 'APPROVED' as const,
      score: validScore,
      tags: validTags,
      processedAt: '2026-08-11', // date only, not datetime
    };
    expect(() => curationResultSchema.parse(result)).toThrow();
  });

  it('accepts all valid status values', () => {
    const statuses = ['PENDING', 'HIGHLIGHT', 'APPROVED', 'REJECTED'] as const;
    for (const status of statuses) {
      expect(() =>
        curationResultSchema.parse({
          photoId: 'photo-1',
          status,
          score: validScore,
          tags: validTags,
          processedAt: new Date().toISOString(),
        }),
      ).not.toThrow();
    }
  });
});

// ─── geminiConfigSchema ───────────────────────────────────────────────────────

describe('geminiConfigSchema', () => {
  it('accepts valid config with all fields', () => {
    const config = {
      apiKey: 'AIza-test-key',
      model: 'gemini-2.0-flash' as const,
      maxTokens: 1024,
      temperature: 0.5,
    };
    expect(() => geminiConfigSchema.parse(config)).not.toThrow();
  });

  it('accepts config without optional fields', () => {
    const config = { apiKey: 'key', model: 'gemini-2.0-pro' as const };
    expect(() => geminiConfigSchema.parse(config)).not.toThrow();
  });

  it('rejects invalid model', () => {
    expect(() =>
      geminiConfigSchema.parse({ apiKey: 'key', model: 'gpt-4o' }),
    ).toThrow();
  });

  it('rejects temperature > 2', () => {
    expect(() =>
      geminiConfigSchema.parse({
        apiKey: 'key',
        model: 'gemini-2.0-flash' as const,
        temperature: 2.1,
      }),
    ).toThrow();
  });

  it('rejects temperature < 0', () => {
    expect(() =>
      geminiConfigSchema.parse({
        apiKey: 'key',
        model: 'gemini-2.0-flash' as const,
        temperature: -0.1,
      }),
    ).toThrow();
  });

  it('rejects non-positive maxTokens', () => {
    expect(() =>
      geminiConfigSchema.parse({
        apiKey: 'key',
        model: 'gemini-2.0-flash' as const,
        maxTokens: 0,
      }),
    ).toThrow();
  });
});
