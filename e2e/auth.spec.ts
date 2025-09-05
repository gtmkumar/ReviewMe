import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the homepage
    await page.goto('/');
  });

  test('should display homepage with sign in button', async ({ page }) => {
    // Check if the homepage loads correctly
    await expect(page).toHaveTitle(/ReviewMe/);
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: /professional profile platform/i })).toBeVisible();
    
    // Check for sign in button
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    // Click sign in button
    await page.getByRole('link', { name: /sign in/i }).click();
    
    // Should be on sign in page
    await expect(page).toHaveURL('/auth/signin');
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Go to sign in page first
    await page.goto('/auth/signin');
    
    // Click sign up link
    await page.getByRole('link', { name: /create account/i }).click();
    
    // Should be on sign up page
    await expect(page).toHaveURL('/auth/signup');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill in invalid email
    await page.getByRole('textbox', { name: /email/i }).fill('invalid-email');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should show OAuth sign in options', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check for OAuth buttons
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should handle sign up form validation', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Fill in the form with invalid data
    await page.getByRole('textbox', { name: /full name/i }).fill('Test User');
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /^password$/i }).fill('weak');
    await page.getByRole('textbox', { name: /confirm password/i }).fill('different');
    
    // Check password requirements
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page.getByText(/one uppercase letter/i)).toBeVisible();
    
    // Submit button should be disabled
    await expect(page.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  test('should enable submit button with valid form data', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Fill in valid form data
    await page.getByRole('textbox', { name: /full name/i }).fill('Test User');
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /^password$/i }).fill('ValidPassword123!');
    await page.getByRole('textbox', { name: /confirm password/i }).fill('ValidPassword123!');
    await page.getByRole('checkbox', { name: /agree to terms/i }).check();
    
    // Submit button should be enabled
    await expect(page.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should be redirected to sign in page
    await expect(page).toHaveURL('/auth/signin');
  });

  test('should show password visibility toggle', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    const toggleButton = page.getByRole('button', { name: /toggle password visibility/i });
    
    // Password should be hidden initially
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle button
    await toggleButton.click();
    
    // Password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle button again
    await toggleButton.click();
    
    // Password should be hidden again
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate back to home from auth pages', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Click back to home link
    await page.getByRole('link', { name: /back to home/i }).click();
    
    // Should be on homepage
    await expect(page).toHaveURL('/');
  });

  test('should handle loading states', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Mock slow network response
    await page.route('/api/auth/signin', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    // Fill in form
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();
    
    // Should show loading state
    await expect(submitButton).toBeDisabled();
  });
});