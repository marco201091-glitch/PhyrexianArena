import { expect, test, type Page } from '@playwright/test';

const legacyDevices = [
  { name: 'iPad 5th gen', viewport: { width: 1024, height: 768 } },
  { name: 'Legacy Android', viewport: { width: 360, height: 640 } },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth, `Unexpected horizontal overflow: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('public screens fit legacy iPad and Android viewports', async ({ page }) => {
  for (const device of legacyDevices) {
    await page.setViewportSize(device.viewport);

    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/counter');
    await expect(page.getByText(/Players|Giocatori/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test('authenticated screens fit legacy iPad and Android viewports', async ({ page }) => {
  const identifier = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(!identifier || !password, 'Set E2E_USERNAME and E2E_PASSWORD for authenticated responsive checks.');

  await page.goto('/auth/login');
  await page.getByLabel('Email or username').fill(identifier!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Enter Playgroup' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });

  for (const device of legacyDevices) {
    await page.setViewportSize(device.viewport);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Your Playgroups|I tuoi playgroup/ })).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page);

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Archidekt sync' })).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page);
  }
});
