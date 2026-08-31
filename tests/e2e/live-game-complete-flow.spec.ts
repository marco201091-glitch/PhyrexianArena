import { expect, test } from '@playwright/test';

test('wizard → damage → Last Standing → recap', async ({ page }) => {
  test.skip(process.env.E2E_LIVE_GAME_FLOW !== '1', 'Set E2E_LIVE_GAME_FLOW=1 for the state-changing live flow.');
  const identifier = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(!identifier || !password, 'E2E credentials are required.');

  await page.goto('/auth/login');
  await page.getByLabel('Email or username').fill(identifier!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: /^Enter(?: Playgroup)?$/ }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('button', { name: /Open|Apri/ }).first().click();
  await page.getByRole('button', { name: /Play Game|Gioca live/ }).click();
  await page.getByRole('button', { name: /^2$/ }).click();
  await page.getByRole('button', { name: /Step 4|Passaggio 4/ }).click();

  for (let seatIndex = 0; seatIndex < 2; seatIndex += 1) {
    await page.getByRole('button', { name: new RegExp(`^(Seat|Posto) ${seatIndex + 1}`) }).click();
    const select = page.getByTestId('live-player-select');
    const option = select.locator('option:not([disabled])').filter({ hasNotText: /Choose player|Scegli giocatore/ }).nth(seatIndex);
    await select.selectOption((await option.getAttribute('value'))!);
    await page.getByTestId('live-deck-option').first().click();
  }

  await page.evaluate(() => localStorage.setItem('live-onboarding-v1', 'done'));
  await page.getByTestId('live-start').click();
  await expect(page.getByTestId('live-end')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Reduce life for|Riduci punti vita di/ }).first().click();
  await page.getByTestId('live-end').click();
  await page.getByTestId('live-winner').first().click();
  await page.getByTestId('live-win-last_standing').click();
  await page.getByTestId('live-save').click();
  await expect(page.getByText(/Game saved|Partita salvata/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /Share|Condividi/ })).toBeVisible();
});
