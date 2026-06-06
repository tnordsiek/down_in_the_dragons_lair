import { playerHeroLabelFor } from '../../data/playerLabels';
import type { GameEvent, GameState, Player } from './types';

type EventDetails = Omit<GameEvent, 'id'>;

export function appendGameEvent(
  state: GameState,
  event: EventDetails,
): GameState {
  return {
    ...state,
    eventLog: [
      ...state.eventLog,
      {
        ...event,
        id: `event-${state.eventLog.length}`,
      },
    ],
  };
}

export function createPlayerEventFields(player: Player, players: Player[]) {
  const playerIndex = players.findIndex((entry) => entry.id === player.id);

  return {
    playerId: player.id,
    playerHeroId: player.heroId,
    playerLabel:
      playerIndex >= 0 ? playerHeroLabelFor(player, players) : undefined,
  } as const;
}
