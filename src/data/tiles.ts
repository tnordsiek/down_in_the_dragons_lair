import type {
  TileBlueprint,
  TileBlueprintId,
  TilePoolEntry,
} from '../engine/core/types';

export const tileBlueprints = {
  start_cross_healing: {
    id: 'start_cross_healing',
    category: 'start',
    shape: 'cross',
    openSides: ['A', 'B', 'C', 'D'],
    isStartTile: true,
    grantsHealing: true,
  },
  tunnel_straight: {
    id: 'tunnel_straight',
    category: 'tunnel',
    shape: 'straight',
    openSides: ['A', 'C'],
  },
  tunnel_corner: {
    id: 'tunnel_corner',
    category: 'tunnel',
    shape: 'corner',
    openSides: ['A', 'B'],
  },
  tunnel_t_junction: {
    id: 'tunnel_t_junction',
    category: 'tunnel',
    shape: 't_junction',
    openSides: ['A', 'B', 'C'],
  },
  tunnel_cross: {
    id: 'tunnel_cross',
    category: 'tunnel',
    shape: 'cross',
    openSides: ['A', 'B', 'C', 'D'],
  },
  room_straight: {
    id: 'room_straight',
    category: 'room',
    shape: 'straight',
    openSides: ['A', 'C'],
    spawnsRoomToken: true,
  },
  room_corner: {
    id: 'room_corner',
    category: 'room',
    shape: 'corner',
    openSides: ['A', 'B'],
    spawnsRoomToken: true,
  },
  room_t_junction: {
    id: 'room_t_junction',
    category: 'room',
    shape: 't_junction',
    openSides: ['A', 'B', 'C'],
    spawnsRoomToken: true,
  },
  room_cross: {
    id: 'room_cross',
    category: 'room',
    shape: 'cross',
    openSides: ['A', 'B', 'C', 'D'],
    spawnsRoomToken: true,
  },
  healing_corner: {
    id: 'healing_corner',
    category: 'healing',
    shape: 'corner',
    openSides: ['A', 'B'],
    grantsHealing: true,
  },
  teleport_straight: {
    id: 'teleport_straight',
    category: 'teleport',
    shape: 'straight',
    openSides: ['A', 'C'],
    grantsTeleport: true,
  },
} as const satisfies Record<TileBlueprintId, TileBlueprint>;

export const tilePoolCounts = {
  start_cross_healing: 1,
  tunnel_straight: 4,
  tunnel_corner: 4,
  tunnel_t_junction: 5,
  tunnel_cross: 7,
  room_straight: 17,
  room_corner: 9,
  room_t_junction: 13,
  room_cross: 14,
  healing_corner: 2,
  teleport_straight: 4,
} as const satisfies Record<TileBlueprintId, number>;

export const tilePoolEntries = Object.entries(tilePoolCounts).map(
  ([blueprintId, count]) =>
    ({
      blueprintId: blueprintId as TileBlueprintId,
      count,
    }) satisfies TilePoolEntry,
);

export const totalTileCount = tilePoolEntries.reduce(
  (sum, entry) => sum + entry.count,
  0,
);

export const drawableTileCount =
  totalTileCount - tilePoolCounts.start_cross_healing;
