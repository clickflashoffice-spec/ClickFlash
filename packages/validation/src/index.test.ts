import { describe, it, expect } from 'vitest';
import { PhotoSchema, AlbumSchema, UserSchema, validateOrThrow, validateOrNull } from './index.js';

describe('PhotoSchema', () => {
  it('validates a valid photo', () => {
    const photo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/photo.jpg',
      title: 'Test Photo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => validateOrThrow(PhotoSchema, photo)).not.toThrow();
  });

  it('throws on invalid photo', () => {
    const photo = { url: 'not-a-url', title: '' };
    expect(() => validateOrThrow(PhotoSchema, photo)).toThrow();
  });
});

describe('AlbumSchema', () => {
  it('validates a valid album', () => {
    const album = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Wedding Album',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => validateOrThrow(AlbumSchema, album)).not.toThrow();
  });
});

describe('UserSchema', () => {
  it('validates a valid user', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'John Doe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => validateOrThrow(UserSchema, user)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'not-an-email',
      name: 'John',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => validateOrThrow(UserSchema, user)).toThrow();
  });
});

describe('validateOrNull', () => {
  it('returns data for valid input', () => {
    const photo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/photo.jpg',
      title: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(validateOrNull(PhotoSchema, photo)).toEqual(photo);
  });

  it('returns null for invalid input', () => {
    expect(validateOrNull(PhotoSchema, { url: 'bad' })).toBeNull();
  });
});
