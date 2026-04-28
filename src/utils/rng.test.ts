import { describe, expect, it } from 'vitest';

import { createSeededRng, restoreSeededRng } from './rng';

describe('seeded rng', () => {
  it('produces deterministic sequences for the same seed', () => {
    const first = createSeededRng('fixed-seed');
    const second = createSeededRng('fixed-seed');

    expect([first.next(), first.next(), first.rollDie(6)]).toEqual([
      second.next(),
      second.next(),
      second.rollDie(6),
    ]);
  });

  it('can resume from a serialized snapshot', () => {
    const rng = createSeededRng('resume-seed');

    rng.next();
    const snapshot = rng.snapshot();

    expect(restoreSeededRng(snapshot).nextInt(10)).toBe(rng.nextInt(10));
  });

  it('bounds dice rolls inclusively from 1 to the requested side count', () => {
    const rng = createSeededRng('dice-seed');
    const rolls = Array.from({ length: 100 }, () => rng.rollDie(6));

    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...rolls)).toBeLessThanOrEqual(6);
  });
});
