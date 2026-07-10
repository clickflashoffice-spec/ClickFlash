import { describe, it, expect } from 'vitest';
import {
  PhotoSchema, AlbumSchema, UserSchema, CartItemSchema,
  BookingSchema, ClientSchema, ProductSchema, SessionTypeSchema,
  DestinationSchema, LicenseKeySchema,
  PhotoCreateSchema, OrderCreateSchema,
  UserCreateSchema, LoginSchema, MagicLinkSchema,
  validateOrThrow, validateOrNull, validatePartial, validateSafe,
  sanitizeHtml, sanitizeObject, generateCsrfToken, validateCsrfToken,
  PaginationSchema, SortSchema,
} from './index.js';

// =============================================================================
// PHOTO
// =============================================================================

describe('PhotoSchema', () => {
  it('validates a valid photo', () => {
    const photo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      albumId: 'album-1',
      url: 'https://example.com/photo.jpg',
      photographerId: 'p-1',
      title: 'Test Photo',
    };
    expect(() => validateOrThrow(PhotoSchema, photo)).not.toThrow();
  });

  it('throws on invalid photo (missing required fields)', () => {
    const photo = { url: 'not-a-url', title: '' };
    expect(() => validateOrThrow(PhotoSchema, photo)).toThrow();
  });

  it('validates photo with manual edits', () => {
    const photo = {
      id: 'p-1', albumId: 'a-1', url: 'https://ex.com/img.jpg', photographerId: 1,
      manualEdits: { exposure: 50, contrast: -10, highlights: 0, shadows: 0, saturate: 0, vibrance: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 0, temperature: 0, tint: 0, whites: 0, blacks: 0, soften: 0, rotate: 0, straighten: 0, perspectiveX: 0, perspectiveY: 0, clarity: 0, dropShadow: 0 },
    };
    expect(() => validateOrThrow(PhotoSchema, photo)).not.toThrow();
  });
});

describe('PhotoCreateSchema', () => {
  it('validates minimal photo create input', () => {
    const input = {
      albumId: 'album-1',
      url: 'https://example.com/photo.jpg',
      photographerId: 'p-1',
    };
    expect(() => validateOrThrow(PhotoCreateSchema, input)).not.toThrow();
  });
});

// =============================================================================
// ALBUM
// =============================================================================

describe('AlbumSchema', () => {
  it('validates a valid album', () => {
    const album = {
      id: 'a-1',
      title: 'Wedding Album',
      date: '2026-07-09',
      photographerId: 'p-1',
    };
    expect(() => validateOrThrow(AlbumSchema, album)).not.toThrow();
  });

  it('rejects album with empty title', () => {
    const album = { id: 'a-1', title: '', date: '2026-07-09', photographerId: 'p-1' };
    expect(() => validateOrThrow(AlbumSchema, album)).toThrow();
  });
});

// =============================================================================
// USER & AUTH
// =============================================================================

describe('UserSchema', () => {
  it('validates a valid user', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'Admin' as const,
    };
    expect(() => validateOrThrow(UserSchema, user)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const user = { id: 'u-1', email: 'not-an-email', name: 'John', role: 'Admin' };
    expect(() => validateOrThrow(UserSchema, user)).toThrow();
  });

  it('rejects invalid role', () => {
    const user = { id: 'u-1', email: 'a@b.com', name: 'John', role: 'SuperAdmin' };
    expect(() => validateOrThrow(UserSchema, user)).toThrow();
  });
});

describe('UserCreateSchema', () => {
  it('validates user creation with password', () => {
    const input = { name: 'Jane', email: 'jane@ex.com', role: 'Photographer' as const, password: 'securePass123' };
    expect(() => validateOrThrow(UserCreateSchema, input)).not.toThrow();
  });

  it('rejects short password', () => {
    const input = { name: 'Jane', email: 'jane@ex.com', role: 'Admin' as const, password: 'short' };
    expect(() => validateOrThrow(UserCreateSchema, input)).toThrow();
  });
});

describe('LoginSchema', () => {
  it('validates login credentials', () => {
    expect(() => validateOrThrow(LoginSchema, { email: 'a@b.com', password: 'pass' })).not.toThrow();
  });
});

describe('MagicLinkSchema', () => {
  it('validates a valid token', () => {
    const token = 'a'.repeat(64);
    expect(() => validateOrThrow(MagicLinkSchema, { token })).not.toThrow();
  });

  it('rejects short token', () => {
    expect(() => validateOrThrow(MagicLinkSchema, { token: 'abc' })).toThrow();
  });
});

// =============================================================================
// ORDERS & CART
// =============================================================================

describe('OrderCreateSchema', () => {
  it('validates a complete order', () => {
    const order = {
      date: '2026-07-09',
      clientName: 'John Doe',
      email: 'john@example.com',
      total: 150.00,
      photographerId: 'p-1',
      items: [{ photoId: 'ph-1', name: 'Print 8x10', quantity: 2, price: 75 }],
    };
    expect(() => validateOrThrow(OrderCreateSchema, order)).not.toThrow();
  });

  it('rejects order with empty items', () => {
    const order = { date: '2026-07-09', clientName: 'John', email: 'j@e.com', total: 0, photographerId: 'p-1', items: [] };
    expect(() => validateOrThrow(OrderCreateSchema, order)).toThrow();
  });
});

describe('CartItemSchema', () => {
  it('validates a valid cart item', () => {
    const item = { id: 'c-1', photoId: 'p-1', name: 'Print', quantity: 1, price: 25 };
    expect(() => validateOrThrow(CartItemSchema, item)).not.toThrow();
  });

  it('rejects negative quantity', () => {
    const item = { id: 'c-1', photoId: 'p-1', name: 'Print', quantity: -1, price: 25 };
    expect(() => validateOrThrow(CartItemSchema, item)).toThrow();
  });
});

// =============================================================================
// BOOKINGS & CLIENTS
// =============================================================================

describe('BookingSchema', () => {
  it('validates a valid booking', () => {
    const booking = {
      id: 'b-1', clientName: 'Jane', email: 'jane@ex.com',
      date: '2026-08-01', time: '10:00',
    };
    expect(() => validateOrThrow(BookingSchema, booking)).not.toThrow();
  });
});

describe('ClientSchema', () => {
  it('validates a valid client', () => {
    const client = { id: 'cl-1', name: 'John', email: 'john@ex.com' };
    expect(() => validateOrThrow(ClientSchema, client)).not.toThrow();
  });
});

// =============================================================================
// PRODUCTS
// =============================================================================

describe('ProductSchema', () => {
  it('validates a valid product', () => {
    const product = { id: 'pr-1', name: 'Photo Print 8x10', price: 29.99 };
    expect(() => validateOrThrow(ProductSchema, product)).not.toThrow();
  });
});

describe('SessionTypeSchema', () => {
  it('validates a session type', () => {
    const st = { id: 'st-1', name: 'Family Session', numberOfPhotos: 50, price: 199 };
    expect(() => validateOrThrow(SessionTypeSchema, st)).not.toThrow();
  });
});

// =============================================================================
// SYSTEM
// =============================================================================

describe('DestinationSchema', () => {
  it('validates a destination', () => {
    const dest = { id: 'd-1', name: 'Maldives Resort', country: 'Maldives', type: 'Resort' as const };
    expect(() => validateOrThrow(DestinationSchema, dest)).not.toThrow();
  });
});

describe('LicenseKeySchema', () => {
  it('validates a license key', () => {
    const key = { key: 'a'.repeat(64), studioName: 'ClickFlash Studio' };
    expect(() => validateOrThrow(LicenseKeySchema, key)).not.toThrow();
  });
});

// =============================================================================
// VALIDATION UTILS
// =============================================================================

describe('validateOrNull', () => {
  it('returns data for valid input', () => {
    const photo = { id: 'p-1', albumId: 'a-1', url: 'https://ex.com/img.jpg', photographerId: 'p-1' };
    const result = validateOrNull(PhotoSchema, photo);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('p-1');
  });

  it('returns null for invalid input', () => {
    expect(validateOrNull(PhotoSchema, { url: 'bad' })).toBeNull();
  });
});

describe('validateSafe', () => {
  it('returns success for valid data', () => {
    const result = validateSafe(UserSchema, { id: 'u-1', name: 'John', email: 'j@e.com', role: 'Admin' });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('John');
  });

  it('returns errors for invalid data', () => {
    const result = validateSafe(UserSchema, { id: 'u-1', name: '', email: 'bad' });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});

describe('PaginationSchema', () => {
  it('uses defaults when empty', () => {
    expect(validateOrThrow(PaginationSchema, {})).toEqual({ page: 1, limit: 20 });
  });

  it('validates explicit values', () => {
    expect(validateOrThrow(PaginationSchema, { page: 2, limit: 50 })).toEqual({ page: 2, limit: 50 });
  });

  it('rejects invalid limit', () => {
    expect(() => validateOrThrow(PaginationSchema, { limit: 150 })).toThrow();
  });
});

describe('SortSchema', () => {
  it('uses defaults when empty', () => {
    expect(validateOrThrow(SortSchema, {})).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' });
  });

  it('validates explicit values', () => {
    expect(validateOrThrow(SortSchema, { sortBy: 'name', sortOrder: 'asc' })).toEqual({ sortBy: 'name', sortOrder: 'asc' });
  });

  it('rejects invalid sortOrder', () => {
    expect(() => validateOrThrow(SortSchema, { sortOrder: 'random' })).toThrow();
  });
});

describe('validatePartial', () => {
  it('validates partial data correctly', () => {
    const partialUser = { name: 'Jane Doe' };
    expect(validatePartial(UserSchema, partialUser)).toEqual({ name: 'Jane Doe' });
  });

  it('throws on invalid partial data', () => {
    const partialUser = { email: 'not-an-email' };
    expect(() => validatePartial(UserSchema, partialUser)).toThrow('Partial validation failed');
  });
});

// =============================================================================
// SECURITY UTILS
// =============================================================================

describe('sanitizeHtml', () => {
  it('escapes HTML entities', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizeHtml('<img onerror="alert(1)">')).not.toContain('onerror=');
  });

  it('strips javascript: protocol', () => {
    expect(sanitizeHtml('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('handles non-string input', () => {
    expect(sanitizeHtml('' as string)).toBe('');
  });
});

describe('sanitizeObject', () => {
  it('sanitizes all string values recursively', () => {
    const obj = { name: '<script>bad</script>', nested: { value: '<img onerror="hack">' } };
    const result = sanitizeObject(obj);
    expect(result.name).not.toContain('<script>');
    expect(result.nested.value).not.toContain('onerror=');
  });
});

describe('CSRF tokens', () => {
  it('generates unique tokens', () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThan(10);
  });

  it('validates matching tokens', () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it('rejects mismatched tokens', () => {
    expect(validateCsrfToken('abc', 'def')).toBe(false);
  });

  it('rejects empty tokens', () => {
    expect(validateCsrfToken(undefined, 'abc')).toBe(false);
    expect(validateCsrfToken('', 'abc')).toBe(false);
  });
});
