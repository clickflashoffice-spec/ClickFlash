import { test, expect, AxeResults } from './fixtures';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173/login');
    await electronPage.waitForLoadState('domcontentloaded');
  });

  test('login page should have no accessibility violations', async ({ electronPage }) => {
    const results = await electronPage.evaluate(async () => {
      const { axe } = await import('axe-core');
      return axe.run(document);
    }) as AxeResults;
    
    if (results && results.violations) {
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      if (criticalViolations.length > 0) {
        console.log('Accessibility violations:', JSON.stringify(criticalViolations, null, 2));
      }
      
      expect(criticalViolations.length).toBe(0);
    }
  });

  test('should have proper focus management', async ({ electronPage }) => {
    const emailInput = electronPage.getByLabel(/email/i);
    const passwordInput = electronPage.getByLabel(/password/i);
    const submitButton = electronPage.getByRole('button', { name: /sign in/i });
    
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    
    await electronPage.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
    
    await electronPage.keyboard.press('Tab');
    await expect(submitButton).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ electronPage }) => {
    const buttons = await electronPage.getByRole('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const hasLabel = text?.trim() || ariaLabel;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ electronPage }) => {
    const results = await electronPage.evaluate(async () => {
      const { axe } = await import('axe-core');
      return axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa'],
        },
      });
    }) as AxeResults;
    
    if (results && results.violations) {
      const contrastViolations = results.violations.filter(
        v => v.id === 'color-contrast'
      );
      
      expect(contrastViolations.length).toBe(0);
    }
  });
});
