import { test, expect } from '@playwright/test';
import { GalleryAPI } from '../../utils/api-client';

/**
 * Gallery App E2E Tests
 * 
 * Tests for the public gallery and album sharing
 */

const api = new GalleryAPI(process.env.GALLERY_URL || 'https://gallery-backend.clickflash-office.workers.dev');

test.describe('Gallery - Public Album', () => {
  test('public album loads without auth', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    await expect(page.locator('[data-testid="gallery-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="album-title"]')).toBeVisible();
  });

  test('album displays photos', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    const photos = await page.locator('[data-testid="gallery-photo"]').count();
    expect(photos).toBeGreaterThan(0);
  });

  test('photo lightbox opens', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    await page.click('[data-testid="gallery-photo"]:first-child');
    
    await expect(page.locator('[data-testid="lightbox"]')).toBeVisible();
    await expect(page.locator('[data-testid="lightbox-image"]')).toBeVisible();
  });

  test('lightbox navigation works', async ({ page }) => {
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="gallery-photo"]:first-child');
    
    // Get first image src
    const firstSrc = await page.locator('[data-testid="lightbox-image"]').getAttribute('src');
    
    // Navigate next
    await page.click('[data-testid="lightbox-next"]');
    const secondSrc = await page.locator('[data-testid="lightbox-image"]').getAttribute('src');
    
    expect(secondSrc).not.toBe(firstSrc);
    
    // Navigate previous
    await page.click('[data-testid="lightbox-prev"]');
    const thirdSrc = await page.locator('[data-testid="lightbox-image"]').getAttribute('src');
    
    expect(thirdSrc).toBe(firstSrc);
  });

  test('lightbox closes', async ({ page }) => {
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="gallery-photo"]:first-child');
    
    await page.click('[data-testid="lightbox-close"]');
    
    await expect(page.locator('[data-testid="lightbox"]')).toBeHidden();
  });

  test('keyboard navigation in lightbox', async ({ page }) => {
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="gallery-photo"]:first-child');
    
    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="lightbox"]')).toBeHidden();
    
    // Reopen and test arrow keys
    await page.click('[data-testid="gallery-photo"]:first-child');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="lightbox-image"]')).toBeVisible();
    
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-testid="lightbox-image"]')).toBeVisible();
  });
});

test.describe('Gallery - Private Album', () => {
  test('private album requires access code', async ({ page }) => {
    await page.goto('/album/private-album-456');
    
    await expect(page.locator('[data-testid="access-code-form"]')).toBeVisible();
  });

  test('valid access code grants entry', async ({ page }) => {
    await page.goto('/album/private-album-456');
    
    await page.fill('[data-testid="access-code-input"]', 'ABC123');
    await page.click('[data-testid="submit-code-button"]');
    
    await expect(page.locator('[data-testid="gallery-container"]')).toBeVisible();
  });

  test('invalid access code shows error', async ({ page }) => {
    await page.goto('/album/private-album-456');
    
    await page.fill('[data-testid="access-code-input"]', 'WRONG');
    await page.click('[data-testid="submit-code-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');
  });

  test('expired access code shows error', async ({ page }) => {
    await page.goto('/album/private-album-456');
    
    await page.fill('[data-testid="access-code-input"]', 'EXPIRED');
    await page.click('[data-testid="submit-code-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('expired');
  });
});

test.describe('Gallery - Photo Download', () => {
  test('download single photo', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    await page.click('[data-testid="gallery-photo"]:first-child');
    await page.click('[data-testid="download-button"]');
    
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/\.(jpg|jpeg|png)$/);
  });

  test('download all photos as ZIP', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    await page.click('[data-testid="download-all-button"]');
    
    // Wait for ZIP generation
    await expect(page.locator('[data-testid="zip-progress"]')).toBeVisible();
    
    const download = await page.waitForEvent('download', { timeout: 60000 });
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });

  test('select photos to download', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    // Select photos
    await page.click('[data-testid="select-mode-button"]');
    await page.click('[data-testid="gallery-photo"]:first-child');
    await page.click('[data-testid="gallery-photo"]:nth-child(2)');
    
    await page.click('[data-testid="download-selected-button"]');
    
    const download = await page.waitForEvent('download', { timeout: 60000 });
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});

test.describe('Gallery - Share', () => {
  test('share link generation', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    await page.click('[data-testid="share-button"]');
    
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-link"]')).toBeVisible();
    
    const shareLink = await page.locator('[data-testid="share-link"]').inputValue();
    expect(shareLink).toContain('/album/');
  });

  test('copy share link', async ({ page }) => {
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="share-button"]');
    
    await page.click('[data-testid="copy-link-button"]');
    
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
  });

  test('email share', async ({ page }) => {
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="share-button"]');
    
    await page.fill('[data-testid="share-email-input"]', 'friend@example.com');
    await page.click('[data-testid="send-email-button"]');
    
    await expect(page.locator('[data-testid="email-sent"]')).toBeVisible();
  });

  test('set expiration on share', async ({ page }) => {
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="share-button"]');
    
    await page.selectOption('[data-testid="expiration-select"]', '7d');
    await page.click('[data-testid="generate-link-button"]');
    
    const shareLink = await page.locator('[data-testid="share-link"]').inputValue();
    expect(shareLink).toBeTruthy();
  });
});

test.describe('Gallery - Mobile', () => {
  test('responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/album/public-album-123');
    
    await expect(page.locator('[data-testid="gallery-container"]')).toBeVisible();
    
    const photos = await page.locator('[data-testid="gallery-photo"]').count();
    expect(photos).toBeGreaterThan(0);
  });

  test('swipe navigation in lightbox', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="gallery-photo"]:first-child');
    
    // Swipe left
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(100, 400);
    await page.mouse.up();
    
    await expect(page.locator('[data-testid="lightbox-image"]')).toBeVisible();
  });

  test('bottom sheet for actions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/album/public-album-123');
    await page.click('[data-testid="gallery-photo"]:first-child');
    
    await page.click('[data-testid="more-actions-button"]');
    
    await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible();
  });
});

test.describe('Gallery - Performance', () => {
  test('images load within threshold', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    const imageLoadTimes = await page.evaluate(() => {
      return new Promise((resolve) => {
        const images = document.querySelectorAll('img');
        const times = [];
        let loaded = 0;
        
        images.forEach((img) => {
          if (img.complete) {
            times.push(0);
            loaded++;
          } else {
            const start = performance.now();
            img.addEventListener('load', () => {
              times.push(performance.now() - start);
              loaded++;
              if (loaded === images.length) resolve(times);
            });
          }
        });
        
        if (loaded === images.length) resolve(times);
      });
    });
    
    const avgLoadTime = imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length;
    expect(avgLoadTime).toBeLessThan(2000); // 2 seconds
  });

  test('lazy loading works', async ({ page }) => {
    await page.goto('/album/public-album-123');
    
    const images = await page.locator('img[loading="lazy"]').all();
    expect(images.length).toBeGreaterThan(0);
  });
});

test.describe('Gallery - API', () => {
  test('list albums', async () => {
    const response = await api.get('/albums');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('albums');
  });

  test('get album by id', async () => {
    const response = await api.get('/albums/album-123');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  test('create share link', async () => {
    const response = await api.post('/albums/album-123/share', {
      expiresIn: '7d',
      accessCode: 'ABC123'
    });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('shareUrl');
  });

  test('download photos', async () => {
    const response = await api.post('/albums/album-123/download', {
      photoIds: ['photo-1', 'photo-2']
    });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/zip');
  });
});
