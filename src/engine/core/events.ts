import { heroDisplayNames } from '../../data/displayNames';
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

export function createPlayerEventFields(player: Player) {
  return {
    playerId: player.id,
    playerHeroId: player.heroId,
    playerLabel: `${heroDisplayNames[player.heroId]} (${player.id})`,
  } as const;
}
