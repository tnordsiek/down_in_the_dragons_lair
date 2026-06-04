import { expect, test } from '@playwright/test';

import { savedDragonFight } from './fixtures/savedStates';

test('resumes a saved dragon fight and shows final ranking', async ({
  page,
}) => {
  await page.addInitScript(({ storageKey, serializedState }) => {
    window.localStorage.setItem(storageKey, serializedState);
  }, savedDragonFight);

  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Resolve Combat' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Resolve Combat' }).click();

  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  const endScreen = page.locator('[data-asset-id="bg_end_screen"]');

  await expect(endScreen.getByText('Winner')).toBeVisible();
  await expect(endScreen.getByText('Dragon Slayer')).toBeVisible();
  await expect(endScreen.getByText('Rogue (Human)').first()).toBeVisible();
  await expect(
    endScreen.getByText(
      'Dragon treasure worth 1.5 points is included in the final score.',
    ),
  ).toBeVisible();
  await expect(
    endScreen.getByTestId('end-screen-rank-player_human').getByText('2.5 pts'),
  ).toBeVisible();
});
