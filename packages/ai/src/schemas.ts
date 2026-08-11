import { z } from 'zod';

export const faceVectorSchema = z.object({
  dimensions: z.number(),
  data: z.union([z.instanceof(Float32Array), z.array(z.number())]),
  modelVersion: z.string(),
});

export const aiScoreSchema = z.object({
  sharpness: z.number().min(0).max(100),
  exposure: z.number().min(0).max(100),
  composition: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  faceCount: z.number().int().min(0),
  hasClosedEyes: z.boolean(),
  isBlurry: z.boolean(),
  grade: z.enum(['A+', 'A', 'B', 'C', 'REJECT']),
  reason: z.string(),
});

export const editParamsSchema = z.object({
  brightness: z.number().min(-100).max(100),
  contrast: z.number().min(-100).max(100),
  saturation: z.number().min(-100).max(100),
  sharpness: z.number().min(0).max(100),
  temperature: z.number().min(-100).max(100),
  tint: z.number().min(-100).max(100),
  highlights: z.number().min(-100).max(100),
  shadows: z.number().min(-100).max(100),
  vibrance: z.number().min(-100).max(100),
  cropX: z.number(),
  cropY: z.number(),
  cropWidth: z.number().min(0),
  cropHeight: z.number().min(0),
  rotation: z.number(),
});

export const tagResultSchema = z.object({
  tags: z.array(z.string()),
  peopleCount: z.number().int().min(0),
  scene: z.string(),
  mood: z.string(),
  weather: z.string(),
  timeOfDay: z.string(),
  activities: z.array(z.string()),
  clothingColors: z.array(z.string()),
  accessories: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const curationStatusSchema = z.enum(['PENDING', 'HIGHLIGHT', 'APPROVED', 'REJECTED']);

export const curationResultSchema = z.object({
  photoId: z.string(),
  status: curationStatusSchema,
  score: aiScoreSchema,
  tags: tagResultSchema,
  processedAt: z.string().datetime(),
});

export const geminiConfigSchema = z.object({
  apiKey: z.string(),
  model: z.enum(['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-flash']),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
