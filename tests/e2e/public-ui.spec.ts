import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public landing is accessible and visually stable', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(accessibility.violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious'
  )).toEqual([]);
  await expect(page).toHaveScreenshot('landing.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('Archidekt settings and username import are connected', async ({ page }) => {
  const identifier = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(!identifier || !password, 'Set E2E_USERNAME and E2E_PASSWORD for authenticated smoke tests.');

  await page.goto('/auth/login');
  await page.getByLabel('Email or username').fill(identifier!);
  await page.getByLabel('Password').fill(password!);
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/login') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Enter Arena' }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await page.goto('/profile');

  await expect(page.getByRole('heading', { name: 'Archidekt sync' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Your Archidekt username')).toBeVisible();
  await expect(page.getByText('Automatically import new decks')).toBeVisible();
});
