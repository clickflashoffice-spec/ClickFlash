let galleryToken: string | null = null;

/**
 * Keeps the short-lived signed gallery token only for the current app process.
 * A restart intentionally requires the guest to reconnect to the event.
 */
export function setGalleryToken(token: string): void {
  const normalized = token.trim();
  if (!normalized) {
    throw new TypeError('Gallery token must not be empty.');
  }
  galleryToken = normalized;
}

export function getGalleryToken(): string | null {
  return galleryToken;
}

export function clearGalleryToken(): void {
  galleryToken = null;
}
