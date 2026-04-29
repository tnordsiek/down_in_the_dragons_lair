export const aiHeuristicConfig = {
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
} as const;

export type AiHeuristicConfig = typeof aiHeuristicConfig;
