// ClickFlash Shared Package
// Contains common types, validation schemas, and utilities

// ==========================================
// TYPES
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Photo {
  id: string;
  albumId: string;
  url: string;
  title?: string;
  photographerId?: string;
  metadata?: Record<string, unknown>;
}

export interface Album {
  id: string;
  title: string;
  date: string;
  photographerId?: string;
  status?: 'pending' | 'processing' | 'ready';
}

export interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  email: string;
  phone?: string;
  total: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'refunded';
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  photoId?: string;
}

export interface Kiosk {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'syncing';
  lastSync?: string;
}

// ==========================================
// VALIDATION SCHEMAS (Zod)
// ==========================================

import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const albumSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  photographerId: z.string().optional(),
  status: z.enum(['pending', 'processing', 'ready']).optional(),
});

export const photoSchema = z.object({
  id: z.string().optional(),
  albumId: z.string().min(1),
  url: z.string().optional(),
  title: z.string().optional(),
  photographerId: z.string().optional(),
});

export const orderSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().optional(),
  clientName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  total: z.number().min(0),
  status: z.enum(['pending', 'paid', 'processing', 'completed', 'refunded']).optional(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().positive(),
    price: z.number().min(0),
    photoId: z.string().optional(),
  })).optional(),
});

// ==========================================
// ERROR CODES
// ==========================================

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// ==========================================
// API RESPONSE HELPERS
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function errorResponse(code: string, message: string): ApiResponse<never> {
  return { 
    success: false, 
    error: { code, message } 
  };
}
