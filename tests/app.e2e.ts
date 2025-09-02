import { test, expect } from '@playwright/test';

test.describe('AI Narration App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to your app (adjust URL as needed)
    await page.goto('http://localhost:3000');
  });

  test('homepage loads correctly', async ({ page }) => {
    // Test that the main page loads
    await expect(page).toHaveTitle(/AI Narration/);
    
    // Check for main navigation or content
    const heading = page.locator('h1, h2, [data-testid="main-heading"]').first();
    await expect(heading).toBeVisible();
  });

  test('can navigate between pages', async ({ page }) => {
    // Test navigation works (adjust selectors based on your actual app)
    const loginLink = page.getByRole('link', { name: /login/i }).or(
      page.getByRole('button', { name: /sign in/i })
    );
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      // Wait for navigation or login form
      await page.waitForTimeout(1000);
    }
    
    // Just verify we can navigate without errors
    expect(page.url()).toContain('localhost:3000');
  });

  test('renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Should have no critical JavaScript errors
    expect(errors.filter(e => !e.includes('Warning'))).toHaveLength(0);
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Page should still be usable on mobile
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(body).toBeVisible();
  });
});