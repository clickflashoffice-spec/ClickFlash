import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import {
  PhotoSchema,
  CartItemSchema,
  UserSchema,
  OrderSchema,
  UserRoleSchema,
  DayOfWeekSchema,
} from '../index';

describe('Photo Schema', () => {
  it('should validate a valid photo object', () => {
    const validPhoto = {
      id: 'photo-123',
      albumId: 'album-456',
      url: 'https://example.com/photo.jpg',
      watermarkUrl: 'https://example.com/watermark.jpg',
      width: 1920,
      height: 1080,
      resolution: 300,
      size: 2048000,
      capturedAt: '2026-04-14T10:30:00Z',
      hotelId: 'hotel-789',
      mimeType: 'image/jpeg',
      fileSize: 2048000,
      cullingStatus: 'Selected',
      proofingStatus: 'approved',
    };

    const result = PhotoSchema.safeParse(validPhoto);
    expect(result.success).toBe(true);
  });

  it('should reject photo with invalid url', () => {
    const invalidPhoto = {
      id: 'photo-123',
      albumId: 'album-456',
      url: 'not-a-valid-url',
    };

    const result = PhotoSchema.safeParse(invalidPhoto);
    expect(result.success).toBe(false);
  });

  it('should reject photo with invalid culling status', () => {
    const invalidPhoto = {
      id: 'photo-123',
      albumId: 'album-456',
      url: 'https://example.com/photo.jpg',
      cullingStatus: 'InvalidStatus',
    };

    const result = PhotoSchema.safeParse(invalidPhoto);
    expect(result.success).toBe(false);
  });

  it('should accept photo with optional fields missing', () => {
    const minimalPhoto = {
      id: 'photo-123',
      albumId: 'album-456',
      url: 'https://example.com/photo.jpg',
    };

    const result = PhotoSchema.safeParse(minimalPhoto);
    expect(result.success).toBe(true);
  });
});

describe('CartItem Schema', () => {
  it('should validate a valid cart item', () => {
    const validItem = {
      id: 'cart-item-123',
      photoId: 'photo-456',
      name: 'Professional Photo Print',
      format: '8x10',
      quantity: 2,
      price: 29.99,
      deliveryType: 'print',
      productId: 'product-789',
    };

    const result = CartItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('should reject cart item with negative quantity', () => {
    const invalidItem = {
      id: 'cart-item-123',
      photoId: 'photo-456',
      name: 'Photo Print',
      quantity: -1,
      price: 29.99,
    };

    const result = CartItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });

  it('should reject cart item with negative price', () => {
    const invalidItem = {
      id: 'cart-item-123',
      photoId: 'photo-456',
      name: 'Photo Print',
      quantity: 1,
      price: -10,
    };

    const result = CartItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });
});

describe('User Schema', () => {
  it('should validate a valid user', () => {
    const validUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Photographer',
      destinationId: 'dest-456',
    };

    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject user with invalid email', () => {
    const invalidUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'not-an-email',
      role: 'Photographer',
    };

    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should reject user with empty name', () => {
    const invalidUser = {
      id: 'user-123',
      name: '',
      email: 'john@example.com',
      role: 'Photographer',
    };

    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});

describe('UserRole Schema', () => {
  it('should validate valid user roles', () => {
    const validRoles = ['CEO', 'Manager', 'Team Leader', 'Admin', 'Photographer'];
    
    for (const role of validRoles) {
      const result = UserRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid user role', () => {
    const result = UserRoleSchema.safeParse('InvalidRole');
    expect(result.success).toBe(false);
  });
});

describe('Order Schema', () => {
  it('should validate a valid order', () => {
    const validOrder = {
      id: 'order-123',
      date: '2026-04-14T10:30:00Z',
      clientName: 'Jane Smith',
      email: 'jane@example.com',
      status: 'Completed',
      total: 149.99,
      photographerId: 'user-456',
      items: [
        {
          id: 'item-1',
          name: 'Photo Print',
          format: '8x10',
          quantity: 2,
          price: 29.99,
        },
      ],
      paymentMethod: 'Card',
      source: 'kiosk',
    };

    const result = OrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it('should reject order with invalid status', () => {
    const invalidOrder = {
      id: 'order-123',
      date: '2026-04-14T10:30:00Z',
      clientName: 'Jane Smith',
      email: 'jane@example.com',
      status: 'InvalidStatus',
      total: 149.99,
      photographerId: 'user-456',
      items: [],
    };

    const result = OrderSchema.safeParse(invalidOrder);
    expect(result.success).toBe(false);
  });

  it('should reject order with negative total', () => {
    const invalidOrder = {
      id: 'order-123',
      date: '2026-04-14T10:30:00Z',
      clientName: 'Jane Smith',
      email: 'jane@example.com',
      status: 'Completed',
      total: -50,
      photographerId: 'user-456',
      items: [],
    };

    const result = OrderSchema.safeParse(invalidOrder);
    expect(result.success).toBe(false);
  });
});