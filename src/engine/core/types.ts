export type HeroId =
  | 'hero_mage'
  | 'hero_warrior'
  | 'hero_warlock'
  | 'hero_thief'
  | 'hero_swordsman'
  | 'hero_oracle';

export type MonsterId =
  | 'giant_rat'
  | 'giant_spider'
  | 'mummy'
  | 'skeleton_turnkey'
  | 'skeleton_warrior'
  | 'skeleton_king'
  | 'fallen'
  | 'dragon';

export type TokenId = MonsterId | 'treasure_chest';

export type TileBlueprintId =
  | 'start_cross_healing'
  | 'tunnel_straight'
  | 'tunnel_corner'
  | 'tunnel_t_junction'
  | 'tunnel_cross'
  | 'room_straight'
  | 'room_corner'
  | 'room_t_junction'
  | 'room_cross'
  | 'healing_corner'
  | 'teleport_straight';

export type WeaponBonus = 1 | 2 | 3;
export type SpellKind = 'flame' | 'healing';

export interface WeaponItem {
  type: 'weapon';
  bonus: WeaponBonus;
}

export interface SpellItem {
  type: 'spell';
  spellKind: SpellKind;
}

export interface KeyItem {
  type: 'key';
}

export type Item = WeaponItem | SpellItem | KeyItem;

export interface Inventory {
  weapons: WeaponItem[];
  spells: SpellItem[];
  keyCount: 0 | 1;
}

export interface BoardPosition {
  boardX: number;
  boardY: number;
}

export interface Player {
  id: string;
  kind: 'human' | 'ai';
  heroId: HeroId;
  hp: number;
  maxHp: number;
  inventory: Inventory;
  treasurePoints: number;
  isCursed: boolean;
  skipNextTurn: boolean;
  position: BoardPosition;
}

export type TileSide = 'A' | 'B' | 'C' | 'D';
export type TileShape = 'straight' | 'corner' | 't_junction' | 'cross';
export type TileCategory = 'start' | 'tunnel' | 'room' | 'teleport' | 'healing';
export type Rotation = 0 | 90 | 180 | 270;

export interface TileBlueprint {
  id: TileBlueprintId;
  category: TileCategory;
  shape: TileShape;
  openSides: TileSide[];
  isStartTile?: boolean;
  grantsHealing?: boolean;
  grantsTeleport?: boolean;
  spawnsRoomToken?: boolean;
}

export interface PlacedTile {
  tileInstanceId: string;
  blueprintId: TileBlueprintId;
  rotation: Rotation;
  boardX: number;
  boardY: number;
  discovered: boolean;
  looseItems: Item[];
  roomToken?: Token;
}

export interface TilePoolEntry {
  blueprintId: TileBlueprintId;
  count: number;
}

export interface Token {
  id: TokenId;
  kind: 'monster' | 'chest';
}

export type RewardDefinition =
  | { type: 'weapon'; bonus: WeaponBonus }
  | { type: 'spell'; spellKind: SpellKind }
  | { type: 'key' }
  | { type: 'treasure'; points: number };

export interface MonsterDefinition {
  id: MonsterId;
  displayName: string;
  strength: number;
  reward: RewardDefinition;
  onDefeatEffect?: 'curse_other_player';
  isAncientDragon?: boolean;
  blocksMovement: boolean;
}

export interface HeroDefinition {
  id: HeroId;
  displayName: string;
  passiveRules: string[];
  activeRules: string[];
}

export type GamePhase =
  | 'setup'
  | 'turn_start'
  | 'await_move'
  | 'draw_pending_tile'
  | 'choose_pending_tile_rotation'
  | 'place_pending_tile'
  | 'resolve_room_token'
  | 'combat'
  | 'loot_resolution'
  | 'optional_post_combat'
  | 'turn_end'
  | 'game_over';

export interface PendingTileDraw {
  origin: BoardPosition;
  target: BoardPosition;
  direction: TileSide;
  blueprintId: TileBlueprintId;
  legalRotations: Rotation[];
  skippedBlueprintIds: TileBlueprintId[];
}

export interface CombatContext {
  playerId: string;
  monsterId: MonsterId;
  position: BoardPosition;
  enteredFrom: BoardPosition;
  source?: 'movement' | 'warlock_swap';
}

export interface GameEvent {
  id: string;
  type: string;
  message: string;
  turn?: number;
}

export interface VictoryState {
  defeatedDragonByPlayerId: string;
  winnerPlayerIds: string[];
}

export interface SerializedRngState {
  seed: string;
  state: number;
}

export interface GameState {
  schemaVersion: 1;
  phase: GamePhase;
  players: Player[];
  board: PlacedTile[];
  tileStack: TileBlueprintId[];
  pendingTile?: PendingTileDraw;
  tokenBag: Token[];
  activePlayerIndex: number;
  remainingSteps: number;
  lastMoveFrom?: BoardPosition;
  combat?: CombatContext;
  eventLog: GameEvent[];
  victory?: VictoryState;
  rng: SerializedRngState;
}

export type StartGameAction = {
  type: 'startGame';
  humanHeroId: HeroId;
  aiCount: number;
  seed: string;
};

export type MovePlayerAction = {
  type: 'movePlayer';
  direction: TileSide;
};

export type DeclareExplorationDirectionAction = {
  type: 'declareExplorationDirection';
  direction: TileSide;
};

export type PlacePendingTileAction = {
  type: 'placePendingTile';
  rotation: Rotation;
};

export type ResolveRoomTokenAction = {
  type: 'resolveRoomToken';
};

export type ResolveCombatAction = {
  type: 'resolveCombat';
  dice?: [number, number];
  flameSpellCount?: number;
  curseTargetPlayerId?: string;
  warriorRerollDice?: [number, number];
  useWarriorReroll?: boolean;
  useWarlockSacrifice?: boolean;
  swordsmanOneRerolls?: number[];
};

export type OpenChestAction = {
  type: 'openChest';
};

export type UseHealingSpellAction = {
  type: 'useHealingSpell';
  targetPlayerId: string;
  healingPosition: BoardPosition;
};

export type SwapWarlockPositionAction = {
  type: 'swapWarlockPosition';
  targetPlayerId: string;
};

export type EndTurnAction = {
  type: 'endTurn';
};

export type GameAction =
  | StartGameAction
  | MovePlayerAction
  | DeclareExplorationDirectionAction
  | PlacePendingTileAction
  | ResolveRoomTokenAction
  | ResolveCombatAction
  | OpenChestAction
  | UseHealingSpellAction
  | SwapWarlockPositionAction
  | EndTurnAction;
