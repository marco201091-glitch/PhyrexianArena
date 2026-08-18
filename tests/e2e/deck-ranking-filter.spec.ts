import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  const identifier = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(!identifier || !password, 'Set E2E credentials for deck-ranking checks.');
  await page.goto('/auth/login');
  await page.getByLabel('Email or username').fill(identifier!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: /^Enter(?: Playgroup)?$/ }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
}

test('low-sample decks are hidden by default in personal and Arena rankings', async ({ page }) => {
  await login(page);

  await expect(page.getByText(/No deck has reached 5 games|Nessun mazzo ha ancora raggiunto 5 partite/).first()).toBeVisible();
  await page.getByRole('button', { name: /Show .* decks? under 5 games|Mostra .* mazzi con meno di 5 partite/ }).click();
  await expect(page.locator('span:visible').filter({ hasText: /^(Low sample|Campione ridotto)$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /Open|Apri/ }).first().click();
  await page.waitForURL(/\/table\/[^/]+$/, { timeout: 20_000 });
  await page.getByRole('tab', { name: /Decks|Mazzi/ }).click();
  await expect(page.getByText(/No deck has reached 5 games|Nessun mazzo ha ancora raggiunto 5 partite/)).toBeVisible();
  await page.getByRole('button', { name: /Show .* decks? under 5 games|Mostra .* mazzi con meno di 5 partite/ }).click();
  await expect(page.locator('span:visible').filter({ hasText: /^(Low sample|Campione ridotto)$/ }).first()).toBeVisible();
});
