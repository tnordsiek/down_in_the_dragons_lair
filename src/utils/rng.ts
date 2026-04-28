import type { SerializedRngState } from '../engine/core/types';

const maxUint32 = 0x100000000;

export type RngSeed = number | string;

export interface SeededRng {
  next: () => number;
  nextInt: (maxExclusive: number) => number;
  rollDie: (sides: number) => number;
  snapshot: () => SerializedRngState;
}

export function createSeededRng(seed: RngSeed): SeededRng {
  const seedText = String(seed);
  let state = hashSeed(seedText);

  return {
    next: () => {
      state = nextState(state);
      return state / maxUint32;
    },
    nextInt: (maxExclusive) => {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error('maxExclusive must be a positive integer');
      }

      state = nextState(state);
      return Math.floor((state / maxUint32) * maxExclusive);
    },
    rollDie: (sides) => {
      if (!Number.isInteger(sides) || sides <= 0) {
        throw new Error('sides must be a positive integer');
      }

      state = nextState(state);
      return Math.floor((state / maxUint32) * sides) + 1;
    },
    snapshot: () => ({ seed: seedText, state }),
  };
}

export function restoreSeededRng(snapshot: SerializedRngState): SeededRng {
  let state = snapshot.state >>> 0;

  return {
    next: () => {
      state = nextState(state);
      return state / maxUint32;
    },
    nextInt: (maxExclusive) => {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error('maxExclusive must be a positive integer');
      }

      state = nextState(state);
      return Math.floor((state / maxUint32) * maxExclusive);
    },
    rollDie: (sides) => {
      if (!Number.isInteger(sides) || sides <= 0) {
        throw new Error('sides must be a positive integer');
      }

      state = nextState(state);
      return Math.floor((state / maxUint32) * sides) + 1;
    },
    snapshot: () => ({ seed: snapshot.seed, state }),
  };
}

function nextState(state: number): number {
  let next = (state + 0x6d2b79f5) >>> 0;
  next = Math.imul(next ^ (next >>> 15), next | 1);
  next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
  return (next ^ (next >>> 14)) >>> 0;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
