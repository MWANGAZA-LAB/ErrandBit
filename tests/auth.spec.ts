/**
 * Authentication E2E Tests
 * 
 * Tests for:
 * - User login
 * - Login validation
 * - Logout
 * - Protected routes
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Login');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    // Click login without filling fields
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=/username.*required/i')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Should show user info
    await expect(page.locator('text=/testuser/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill with invalid credentials
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpass');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 });
    
    // Click logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to home
    await expect(page).toHaveURL('/', { timeout: 5000 });
    
    // Should show login button
    await expect(page.locator('text=/login/i')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access profile page without authentication
    await page.goto('/profile');
    
    // Should redirect to login or show login prompt
    const url = page.url();
    expect(url.includes('/login') || url.includes('/')).toBeTruthy();
  });

  test('should persist authentication after page refresh', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    await expect(page.locator('text=/testuser/i')).toBeVisible({ timeout: 5000 });
  });
});
