import { test, expect } from '@playwright/test';

/**
 * Installer E2E Tests
 * 
 * Tests for the Electron installer wizard
 */

test.describe('Installer - Welcome Screen', () => {
  test('welcome screen displays', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('[data-testid="installer-welcome"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-title"]')).toContainText('Welcome');
  });

  test('license agreement link works', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="license-link"]');
    
    await expect(page.locator('[data-testid="license-modal"]')).toBeVisible();
  });

  test('next button disabled without agreement', async ({ page }) => {
    await page.goto('/');
    
    const nextButton = await page.locator('[data-testid="next-button"]');
    await expect(nextButton).toBeDisabled();
  });

  test('next button enabled after agreement', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="agree-checkbox"]');
    
    const nextButton = await page.locator('[data-testid="next-button"]');
    await expect(nextButton).toBeEnabled();
  });
});

test.describe('Installer - Installation Type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
  });

  test('installation type screen', async ({ page }) => {
    await expect(page.locator('[data-testid="installation-type"]')).toBeVisible();
  });

  test('select standard installation', async ({ page }) => {
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="installation-location"]')).toBeVisible();
  });

  test('select custom installation', async ({ page }) => {
    await page.click('[data-testid="custom-install"]');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="component-selection"]')).toBeVisible();
  });

  test('select portable installation', async ({ page }) => {
    await page.click('[data-testid="portable-install"]');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="portable-location"]')).toBeVisible();
  });
});

test.describe('Installer - Component Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="custom-install"]');
    await page.click('[data-testid="next-button"]');
  });

  test('all components selected by default', async ({ page }) => {
    const masterCheck = await page.locator('[data-testid="component-master"]').isChecked();
    const touchCheck = await page.locator('[data-testid="component-touch"]').isChecked();
    
    expect(masterCheck).toBe(true);
    expect(touchCheck).toBe(true);
  });

  test('deselect component', async ({ page }) => {
    await page.click('[data-testid="component-touch"]');
    
    const touchCheck = await page.locator('[data-testid="component-touch"]').isChecked();
    expect(touchCheck).toBe(false);
  });

  test('disk space calculation', async ({ page }) => {
    await expect(page.locator('[data-testid="required-space"]')).toBeVisible();
    await expect(page.locator('[data-testid="available-space"]')).toBeVisible();
  });

  test('insufficient space warning', async ({ page }) => {
    // Mock insufficient space
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('space-check', { detail: { required: 1000000, available: 100 } }));
    });
    
    await expect(page.locator('[data-testid="space-warning"]')).toBeVisible();
  });
});

test.describe('Installer - Installation Location', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
  });

  test('default location displayed', async ({ page }) => {
    await expect(page.locator('[data-testid="install-path"]')).toBeVisible();
    const path = await page.locator('[data-testid="install-path"]').inputValue();
    expect(path).toContain('ClickFlash');
  });

  test('browse for location', async ({ page }) => {
    await page.click('[data-testid="browse-button"]');
    
    await expect(page.locator('[data-testid="file-browser"]')).toBeVisible();
  });

  test('invalid location shows error', async ({ page }) => {
    await page.fill('[data-testid="install-path"]', 'C:\\Windows\\System32');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="path-error"]')).toBeVisible();
  });
});

test.describe('Installer - Installation Progress', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="install-button"]');
  });

  test('progress bar visible', async ({ page }) => {
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
  });

  test('installation steps displayed', async ({ page }) => {
    await expect(page.locator('[data-testid="install-step"]')).toBeVisible();
    const steps = await page.locator('[data-testid="install-step"]').count();
    expect(steps).toBeGreaterThan(0);
  });

  test('cancel installation', async ({ page }) => {
    await page.click('[data-testid="cancel-button"]');
    await page.click('[data-testid="confirm-cancel-button"]');
    
    await expect(page.locator('[data-testid="installation-cancelled"]')).toBeVisible();
  });

  test('installation completes', async ({ page }) => {
    // Wait for installation to complete (mock)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('installation-complete'));
    });
    
    await expect(page.locator('[data-testid="installation-complete"]')).toBeVisible();
  });
});

test.describe('Installer - Completion', () => {
  test('completion screen', async ({ page }) => {
    await page.goto('/');
    // Navigate through to completion
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="install-button"]');
    
    // Mock completion
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('installation-complete'));
    });
    
    await expect(page.locator('[data-testid="completion-title"]')).toContainText('Complete');
  });

  test('launch application checkbox', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="install-button"]');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('installation-complete'));
    });
    
    const launchCheck = await page.locator('[data-testid="launch-checkbox"]');
    await expect(launchCheck).toBeChecked();
  });

  test('finish button', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="install-button"]');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('installation-complete'));
    });
    
    await page.click('[data-testid="finish-button"]');
    
    // Verify app closes or redirects
  });
});

test.describe('Installer - Update Flow', () => {
  test('detect existing installation', async ({ page }) => {
    await page.goto('/');
    
    // Mock existing installation
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('existing-installation-detected', { 
        detail: { version: '1.0.0', path: 'C:\\ClickFlash' } 
      }));
    });
    
    await expect(page.locator('[data-testid="update-prompt"]')).toBeVisible();
  });

  test('choose update option', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('existing-installation-detected', { 
        detail: { version: '1.0.0', path: 'C:\\ClickFlash' } 
      }));
    });
    
    await page.click('[data-testid="update-button"]');
    
    await expect(page.locator('[data-testid="update-progress"]')).toBeVisible();
  });

  test('choose fresh install option', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('existing-installation-detected', { 
        detail: { version: '1.0.0', path: 'C:\\ClickFlash' } 
      }));
    });
    
    await page.click('[data-testid="fresh-install-button"]');
    
    await expect(page.locator('[data-testid="installer-welcome"]')).toBeVisible();
  });
});

test.describe('Installer - Error Handling', () => {
  test('handle installation error', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="install-button"]');
    
    // Mock error
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('installation-error', { 
        detail: { message: 'Disk full', code: 'DISK_FULL' } 
      }));
    });
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Disk full');
  });

  test('handle network error during download', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="install-button"]');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('download-error', { 
        detail: { message: 'Network timeout', retryable: true } 
      }));
    });
    
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('retry failed download', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="agree-checkbox"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="standard-install"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="install-button"]');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('download-error', { 
        detail: { message: 'Network timeout', retryable: true } 
      }));
    });
    
    await page.click('[data-testid="retry-button"]');
    
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
  });
});

test.describe('Installer - Uninstallation', () => {
  test('uninstall option', async ({ page }) => {
    await page.goto('/uninstall');
    
    await expect(page.locator('[data-testid="uninstall-confirm"]')).toBeVisible();
  });

  test('confirm uninstall', async ({ page }) => {
    await page.goto('/uninstall');
    
    await page.click('[data-testid="confirm-uninstall-button"]');
    
    await expect(page.locator('[data-testid="uninstall-progress"]')).toBeVisible();
  });

  test('keep settings option', async ({ page }) => {
    await page.goto('/uninstall');
    
    await page.click('[data-testid="keep-settings-checkbox"]');
    await page.click('[data-testid="confirm-uninstall-button"]');
    
    // Verify settings preserved
  });
});
