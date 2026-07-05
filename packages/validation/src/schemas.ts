import { z } from 'zod';

export const PhotoSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
  metadata: z.record(z.unknown()).optional(),
});

export const AlbumSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  coverPhotoId: z.string().uuid().optional(),
  photoIds: z.array(z.string().uuid()).default([]),
  isPublic: z.boolean().default(false),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(['admin', 'photographer', 'client']).default('client'),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type Photo = z.infer<typeof PhotoSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type User = z.infer<typeof UserSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Sort = z.infer<typeof SortSchema>;
