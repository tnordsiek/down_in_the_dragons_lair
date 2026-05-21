import { heroIds } from '../../data/heroes';
import { playerHeroLabel } from '../../data/playerLabels';
import { tilePoolCounts } from '../../data/tiles';
import { createTokenBag } from '../../data/tokens';
import { createSeededRng, type SeededRng } from '../../utils/rng';
import type {
  GameEvent,
  GameEventStartPlayerDetails,
  GameState,
  HeroId,
  PlacedTile,
  Player,
  TileBlueprintId,
} from '../core/types';

export type CreateGameOptions = {
  humanHeroId: HeroId;
  aiCount: number;
  seed: string;
};

export function createNewGame(options: CreateGameOptions): GameState {
  if (options.aiCount < 1 || options.aiCount > 4) {
    throw new Error('aiCount must be between 1 and 4');
  }

  const rng = createSeededRng(options.seed);
  const assignedHeroIds = assignHeroes(
    options.humanHeroId,
    options.aiCount,
    rng,
  );
  const players = createPlayers(assignedHeroIds);
  const startPlayerRoll = rollStartPlayer(players, rng);
  const activePlayerIndex = startPlayerRoll.activePlayerIndex;
  const board: PlacedTile[] = [
    {
      tileInstanceId: 'tile-0',
      blueprintId: 'start_cross_healing',
      rotation: 0,
      boardX: 0,
      boardY: 0,
      discovered: true,
      looseItems: [],
    },
  ];

  return {
    schemaVersion: 1,
    phase: 'turn_start',
    players,
    board,
    tileStack: shuffle(expandTileStack(), rng),
    tokenBag: shuffle(createTokenBag(), rng),
    activePlayerIndex,
    remainingSteps: 4,
    eventLog: createInitialEventLog(
      players,
      activePlayerIndex,
      startPlayerRoll.details,
    ),
    rng: rng.snapshot(),
  };
}

function assignHeroes(
  humanHeroId: HeroId,
  aiCount: number,
  rng: SeededRng,
): HeroId[] {
  if (!heroIds.includes(humanHeroId)) {
    throw new Error(`Unknown human hero: ${humanHeroId}`);
  }

  const remainingHeroes = heroIds.filter((heroId) => heroId !== humanHeroId);
  const aiHeroIds = shuffle(remainingHeroes, rng).slice(0, aiCount);

  return [humanHeroId, ...aiHeroIds];
}

function createPlayers(assignedHeroIds: HeroId[]): Player[] {
  return assignedHeroIds.map((heroId, index) => ({
    id: index === 0 ? 'player_human' : `player_ai_${index}`,
    kind: index === 0 ? 'human' : 'ai',
    heroId,
    hp: 5,
    maxHp: 5,
    inventory: {
      weapons: [],
      spells: [],
      keyCount: 0,
    },
    treasurePoints: 0,
    isCursed: false,
    skipNextTurn: false,
    position: { boardX: 0, boardY: 0 },
  }));
}

function rollStartPlayer(
  players: Player[],
  rng: SeededRng,
): { activePlayerIndex: number; details: GameEventStartPlayerDetails } {
  let candidateIndexes = players.map((_, index) => index);
  const rounds: GameEventStartPlayerDetails['rounds'] = [];

  while (candidateIndexes.length > 1) {
    const rolls = candidateIndexes.map((playerIndex) => ({
      playerIndex,
      roll: rng.rollDie(6),
    }));
    rounds.push({
      roundType: rounds.length === 0 ? 'initial' : 'tiebreak',
      rolls: rolls.map((entry) => ({
        playerId: players[entry.playerIndex].id,
        playerHeroId: players[entry.playerIndex].heroId,
        playerLabel: playerHeroLabel(
          players[entry.playerIndex],
          entry.playerIndex,
        ),
        roll: entry.roll,
      })),
    });
    const highRoll = Math.max(...rolls.map((entry) => entry.roll));
    candidateIndexes = rolls
      .filter((entry) => entry.roll === highRoll)
      .map((entry) => entry.playerIndex);
  }

  return {
    activePlayerIndex: candidateIndexes[0],
    details: {
      rounds,
    },
  };
}

function expandTileStack(): TileBlueprintId[] {
  return Object.entries(tilePoolCounts).flatMap(([blueprintId, count]) => {
    if (blueprintId === 'start_cross_healing') {
      return [];
    }

    return Array.from({ length: count }, () => blueprintId as TileBlueprintId);
  });
}

export function shuffle<T>(items: T[], rng: SeededRng): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function createInitialEventLog(
  players: Player[],
  activePlayerIndex: number,
  startPlayer: GameEventStartPlayerDetails,
): GameEvent[] {
  const activePlayer = players[activePlayerIndex];

  return [
    {
      id: 'event-0',
      type: 'game_started',
      message: `Game started. ${playerHeroLabel(activePlayer, activePlayerIndex)} takes the first turn.`,
      playerId: activePlayer.id,
      playerHeroId: activePlayer.heroId,
      playerLabel: playerHeroLabel(activePlayer, activePlayerIndex),
      startPlayer,
    },
  ];
}
