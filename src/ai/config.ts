import type { AiDifficulty } from '../engine/core/types';

export interface AiHeuristicConfig {
  readonly criticalHp: number;
  readonly preferHealingBelowHp: number;
  readonly minimumRepeatCombatWinChance: number;
  readonly minimumDragonWinChance: number;
  readonly exploreRoomBonus: number;
  readonly exploreTileBonus: number;
  readonly knownChestBonus: number;
  readonly knownHealingBonus: number;
  readonly knownMonsterPenalty: number;
  readonly objectiveProgressBonus: number;
  readonly dragonObjectiveBonus: number;
  readonly backtrackPenalty: number;
  readonly mistakeRate: number;
  readonly staleActionThreshold: number;
}

export const aiHeuristicConfig: AiHeuristicConfig = {
  criticalHp: 2,
  preferHealingBelowHp: 3,
  minimumRepeatCombatWinChance: 0.2,
  minimumDragonWinChance: 0.35,
  exploreRoomBonus: 8,
  exploreTileBonus: 9,
  knownChestBonus: 10,
  knownHealingBonus: 12,
  knownMonsterPenalty: -6,
  objectiveProgressBonus: 6,
  dragonObjectiveBonus: 20,
  backtrackPenalty: -2,
  mistakeRate: 0,
  staleActionThreshold: 40,
};

export const easyAiConfig: AiHeuristicConfig = {
  criticalHp: 3,
  preferHealingBelowHp: 4,
  minimumRepeatCombatWinChance: 0.1,
  minimumDragonWinChance: 0.2,
  exploreRoomBonus: 6,
  exploreTileBonus: 7,
  knownChestBonus: 8,
  knownHealingBonus: 14,
  knownMonsterPenalty: -3,
  objectiveProgressBonus: 4,
  dragonObjectiveBonus: 12,
  backtrackPenalty: -1,
  mistakeRate: 0.2,
  staleActionThreshold: 40,
};

export const normalAiConfig: AiHeuristicConfig = aiHeuristicConfig;

export const hardAiConfig: AiHeuristicConfig = {
  criticalHp: 2,
  preferHealingBelowHp: 4,
  minimumRepeatCombatWinChance: 0.3,
  minimumDragonWinChance: 0.5,
  exploreRoomBonus: 10,
  exploreTileBonus: 11,
  knownChestBonus: 12,
  knownHealingBonus: 10,
  knownMonsterPenalty: -8,
  objectiveProgressBonus: 8,
  dragonObjectiveBonus: 25,
  backtrackPenalty: -3,
  mistakeRate: 0,
  staleActionThreshold: 40,
};

export function getDifficultyConfig(difficulty: AiDifficulty): AiHeuristicConfig {
  const configs: Record<AiDifficulty, AiHeuristicConfig> = {
    easy: easyAiConfig,
    normal: normalAiConfig,
    hard: hardAiConfig,
  };

  return configs[difficulty];
}
