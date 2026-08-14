/**
 * Gallery Helper Utilities
 */

interface Photo {
  id: string;
  url?: string;
  createdAt?: string | null;
  tags?: string[];
}

interface CartItem {
  type: 'digital' | 'print' | 'product';
  price: number;
  quantity: number;
}

/**
 * Generate thumbnail URL from full photo URL
 */
export function generateThumbnailUrl(photoUrl: string): string {
  if (!photoUrl) {
    return '/placeholder-image.jpg';
  }
  
  // Remove query parameters
  const baseUrl = photoUrl.split('?')[0];
  
  // Replace with thumbnail path if URL pattern matches
  if (baseUrl.includes('/photos/')) {
    return baseUrl.replace('/photos/', '/thumbnails/');
  }
  
  return baseUrl;
}

/**
 * Sort photos by creation date
 */
export function sortPhotosByDate(
  photos: Photo[],
  order: 'asc' | 'desc' = 'desc'
): Photo[] {
  return [...photos].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/**
 * Filter photos by tags
 */
export function filterPhotosByTag(
  photos: Photo[],
  tags: string | string[]
): Photo[] {
  if (!tags || (Array.isArray(tags) && tags.length === 0)) {
    return photos;
  }
  
  const tagList = Array.isArray(tags) ? tags : [tags];
  
  return photos.filter(photo => {
    const photoTags = photo.tags || [];
    return tagList.every(tag => photoTags.includes(tag));
  });
}

/**
 * Calculate total price for cart items
 */
export function calculateTotalPrice(
  items: CartItem[],
  discountPercent: number = 0
): number {
  const subtotal = items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
  
  const discount = subtotal * discountPercent;
  return Math.round((subtotal - discount) * 100) / 100;
}

/**
 * Format and sanitize access code input
 */
export function formatAccessCode(input: string): string {
  if (!input) return '';
  
  return input
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_-]/g, '') // Only allow alphanumeric, hyphen, underscore
    .slice(0, 50); // Max 50 characters
}

/**
 * Check if photo is favorited
 */
export function isPhotoFavorited(photoId: string, favorites: string[]): boolean {
  return favorites.includes(photoId);
}

/**
 * Toggle favorite status
 */
export function toggleFavorite(photoId: string, favorites: string[]): string[] {
  if (favorites.includes(photoId)) {
    return favorites.filter(id => id !== photoId);
  }
  return [...favorites, photoId];
}

/**
 * Get photo count by tag
 */
export function getPhotoCountByTag(photos: Photo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  photos.forEach(photo => {
    const tags = photo.tags || [];
    tags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  
  return counts;
}
