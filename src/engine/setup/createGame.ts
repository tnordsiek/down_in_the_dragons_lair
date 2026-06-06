import { heroIds } from '../../data/heroes';
import { playerHeroLabelFor } from '../../data/playerLabels';
import { getScaledTileCount, tilePoolCounts } from '../../data/tiles';
import { createTokenBag } from '../../data/tokens';
import { createSeededRng, type SeededRng } from '../../utils/rng';
import type {
  AiDifficulty,
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
  /** Additional human players for Hotseat mode (first human uses `humanHeroId`). */
  additionalHumanHeroIds?: HeroId[];
  aiCount: number;
  seed: string;
  poolScale?: number;
  selectedAiHeroIds?: HeroId[];
  difficulty?: AiDifficulty;
};

export function createNewGame(options: CreateGameOptions): GameState {
  const humanHeroIds = [
    options.humanHeroId,
    ...(options.additionalHumanHeroIds ?? []),
  ];

  if (options.aiCount < 0 || options.aiCount > 4) {
    throw new Error('aiCount must be between 0 and 4');
  }

  if (humanHeroIds.length < 1 || humanHeroIds.length > 5) {
    throw new Error('humanHeroIds must contain between 1 and 5 heroes');
  }

  const totalPlayers = humanHeroIds.length + options.aiCount;
  if (totalPlayers < 2 || totalPlayers > 5) {
    throw new Error('Total player count must be between 2 and 5');
  }

  const rng = createSeededRng(options.seed);
  const poolScale = options.poolScale ?? 1;
  const assignedHeroIds = assignHeroes(
    humanHeroIds,
    options.aiCount,
    rng,
    options.selectedAiHeroIds,
  );
  const players = createPlayers(assignedHeroIds, humanHeroIds.length);
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
    schemaVersion: 2,
    phase: 'turn_start',
    players,
    board,
    tileStack: shuffle(expandTileStack(poolScale), rng),
    tokenBag: shuffle(createTokenBag(poolScale), rng),
    activePlayerIndex,
    remainingSteps: 4,
    eventLog: createInitialEventLog(
      players,
      activePlayerIndex,
      startPlayerRoll.details,
    ),
    rng: rng.snapshot(),
    difficulty: options.difficulty ?? 'normal',
  };
}

function assignHeroes(
  humanHeroIds: HeroId[],
  aiCount: number,
  rng: SeededRng,
  selectedAiHeroIds?: HeroId[],
): HeroId[] {
  for (const heroId of humanHeroIds) {
    if (!heroIds.includes(heroId)) {
      throw new Error(`Unknown human hero: ${heroId}`);
    }
  }

  if (new Set(humanHeroIds).size !== humanHeroIds.length) {
    throw new Error('humanHeroIds must be unique');
  }

  if (selectedAiHeroIds) {
    if (selectedAiHeroIds.length > aiCount) {
      throw new Error('selectedAiHeroIds must not exceed aiCount');
    }

    const uniqueSelectedAiHeroIds = new Set(selectedAiHeroIds);
    if (uniqueSelectedAiHeroIds.size !== selectedAiHeroIds.length) {
      throw new Error('selectedAiHeroIds must be unique');
    }

    for (const heroId of selectedAiHeroIds) {
      if (!heroIds.includes(heroId)) {
        throw new Error(`Unknown AI hero: ${heroId}`);
      }

      if (humanHeroIds.includes(heroId)) {
        throw new Error('selectedAiHeroIds must not include a human hero');
      }
    }
  }

  const remainingHeroes = heroIds.filter(
    (heroId) => !humanHeroIds.includes(heroId),
  );
  const selectedAiHeroes = selectedAiHeroIds ?? [];
  const fillableAiHeroes = remainingHeroes.filter(
    (heroId) => !selectedAiHeroes.includes(heroId),
  );
  const randomAiHeroes = shuffle(fillableAiHeroes, rng).slice(
    0,
    aiCount - selectedAiHeroes.length,
  );
  const aiHeroIds = [...selectedAiHeroes, ...randomAiHeroes];

  return [...humanHeroIds, ...aiHeroIds];
}

function createPlayers(assignedHeroIds: HeroId[], humanCount: number): Player[] {
  return assignedHeroIds.map((heroId, index) => ({
    id: createPlayerId(index, humanCount),
    kind: index < humanCount ? 'human' : 'ai',
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

function createPlayerId(index: number, humanCount: number): string {
  // Solo mode (single human) keeps the original id scheme for backward
  // compatibility: 'player_human', 'player_ai_1', 'player_ai_2', ...
  if (humanCount <= 1) {
    return index === 0 ? 'player_human' : `player_ai_${index}`;
  }

  // Hotseat mode: each human and AI gets a 1-based suffix.
  return index < humanCount
    ? `player_human_${index + 1}`
    : `player_ai_${index - humanCount + 1}`;
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
        playerLabel: playerHeroLabelFor(players[entry.playerIndex], players),
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

function expandTileStack(poolScale: number): TileBlueprintId[] {
  return Object.entries(tilePoolCounts).flatMap(([blueprintId]) => {
    if (blueprintId === 'start_cross_healing') {
      return [];
    }

    return Array.from(
      {
        length: getScaledTileCount(blueprintId as TileBlueprintId, poolScale),
      },
      () => blueprintId as TileBlueprintId,
    );
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
      message: `Game started. ${playerHeroLabelFor(activePlayer, players)} takes the first turn.`,
      playerId: activePlayer.id,
      playerHeroId: activePlayer.heroId,
      playerLabel: playerHeroLabelFor(activePlayer, players),
      startPlayer,
    },
  ];
}
