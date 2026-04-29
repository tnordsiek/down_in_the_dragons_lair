import { expect, test } from '@playwright/test';

test('resumes a saved dragon fight and shows final ranking', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'down-in-the-dragons-lair.gameState.v1',
      JSON.stringify({
        schemaVersion: 1,
        phase: 'combat',
        players: [
          {
            id: 'player_human',
            kind: 'human',
            heroId: 'hero_thief',
            hp: 5,
            maxHp: 5,
            inventory: {
              weapons: [
                { type: 'weapon', bonus: 3 },
                { type: 'weapon', bonus: 3 },
              ],
              spells: [],
              keyCount: 0,
            },
            treasurePoints: 1,
            isCursed: false,
            skipNextTurn: false,
            position: { boardX: 0, boardY: -1 },
          },
          {
            id: 'player_ai_1',
            kind: 'ai',
            heroId: 'hero_mage',
            hp: 5,
            maxHp: 5,
            inventory: { weapons: [], spells: [], keyCount: 0 },
            treasurePoints: 0,
            isCursed: false,
            skipNextTurn: false,
            position: { boardX: 0, boardY: 0 },
          },
        ],
        board: [
          {
            tileInstanceId: 'tile-0',
            blueprintId: 'start_cross_healing',
            rotation: 0,
            boardX: 0,
            boardY: 0,
            discovered: true,
            looseItems: [],
          },
          {
            tileInstanceId: 'tile-dragon',
            blueprintId: 'room_cross',
            rotation: 0,
            boardX: 0,
            boardY: -1,
            discovered: true,
            looseItems: [],
            roomToken: { id: 'dragon', kind: 'monster' },
          },
        ],
        tileStack: [],
        tokenBag: [],
        activePlayerIndex: 0,
        remainingSteps: 3,
        lastMoveFrom: { boardX: 0, boardY: 0 },
        combat: {
          playerId: 'player_human',
          monsterId: 'dragon',
          position: { boardX: 0, boardY: -1 },
          enteredFrom: { boardX: 0, boardY: 0 },
        },
        eventLog: [
          {
            id: 'event-0',
            type: 'test_setup',
            message: 'Saved endgame loaded',
          },
        ],
        rng: { seed: 'dragon-e2e-1', state: 3876810955 },
      }),
    );
  });

  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Resolve Combat' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Resolve Combat' }).click();

  await expect(page.getByRole('heading', { name: 'Game Over' })).toBeVisible();
  await expect(page.getByText('Dragon defeated by player_human')).toBeVisible();
  await expect(
    page
      .locator('[data-asset-id="bg_end_screen"]')
      .getByText('player_human', { exact: true }),
  ).toBeVisible();
});
