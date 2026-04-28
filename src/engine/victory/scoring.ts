import type { GameState, VictoryState } from '../core/types';

export function calculateWinners(state: GameState): string[] {
  const highScore = Math.max(
    ...state.players.map((player) => player.treasurePoints),
  );

  return state.players
    .filter((player) => player.treasurePoints === highScore)
    .map((player) => player.id);
}

export function createVictoryState(
  state: GameState,
  defeatedDragonByPlayerId: string,
): VictoryState {
  return {
    defeatedDragonByPlayerId,
    winnerPlayerIds: calculateWinners(state),
  };
}
