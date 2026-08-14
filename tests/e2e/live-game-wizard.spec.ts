import { expect, test } from '@playwright/test';

async function openLiveGameWizard(page: import('@playwright/test').Page) {
  const identifier = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(!identifier || !password, 'Set E2E credentials for the live-game wizard checks.');

  await page.goto('/auth/login');
  await page.getByLabel('Email or username').fill(identifier!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: /^Enter(?: Playgroup)?$/ }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await page.getByRole('button', { name: /Open|Apri/ }).first().click();
  await page.waitForURL(/\/table\/[^/]+$/, { timeout: 20_000 });
  await page.getByRole('button', { name: /Play Game|Gioca live/ }).click();
  await expect(page.getByRole('heading', { name: /How many players|Quanti giocatori/ })).toBeVisible({ timeout: 20_000 });
}

test('wizard layout previews represent every pod size and remain visually stable', async ({ page }) => {
  await openLiveGameWizard(page);

  for (const playerCount of [2, 3, 4, 5, 6]) {
    await page.getByRole('button', { name: /Step 1|Passaggio 1/ }).click();
    await page.getByRole('button', { name: new RegExp(`^${playerCount}$`) }).click();
    await page.getByRole('button', { name: /Next|Avanti/ }).click();
    await page.getByRole('button', { name: /Next|Avanti/ }).click();
    await expect(page.getByRole('heading', { name: /Choose the layout|Scegli il layout/ })).toBeVisible();

    for (const layoutName of [/Around the table|Intorno al tavolo/, /Opposing sides|Lati contrapposti/]) {
      const preview = page.getByRole('button', { name: layoutName });
      await expect(preview).toBeVisible();
      await expect(preview.locator('span.sr-only')).toHaveCount(playerCount);
    }
  }

  await page.getByRole('button', { name: /Step 1|Passaggio 1/ }).click();
  await page.getByRole('button', { name: /^4$/ }).click();
  await page.getByRole('button', { name: /Next|Avanti/ }).click();
  await page.getByRole('button', { name: /Next|Avanti/ }).click();
  const layoutStep = page.getByText(/The preview matches the game table|L’anteprima rispecchia il tavolo di gioco/)
    .locator('xpath=ancestor::section[1]');
  await expect(layoutStep).toHaveScreenshot('wizard-layouts-4-players.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.04,
  });
});
