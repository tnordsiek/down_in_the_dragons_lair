import { describe, expect, it } from 'vitest';

import { generateRandomSeed } from './randomSeed';

describe('generateRandomSeed', () => {
  it('returns a non-empty string', () => {
    const seed = generateRandomSeed();
    expect(typeof seed).toBe('string');
    expect(seed.length).toBeGreaterThan(0);
  });

  it('produces distinct values across many calls', () => {
    const seeds = new Set(
      Array.from({ length: 100 }, () => generateRandomSeed()),
    );
    // Allow for an astronomically unlikely collision but expect near-uniqueness.
    expect(seeds.size).toBeGreaterThan(95);
  });
});
