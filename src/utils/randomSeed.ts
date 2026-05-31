/**
 * Generates a fresh, non-deterministic seed string for a new game.
 *
 * Kept separate from `rng.ts` so the deterministic, replayable engine RNG stays
 * free of any non-deterministic source. This helper is only used at the setup
 * boundary to pick a starting seed; the resulting string is then hashed by
 * {@link createSeededRng} like any other seed.
 */
export function generateRandomSeed(): string {
  const cryptoObj = globalThis.crypto;

  if (cryptoObj?.getRandomValues) {
    const buffer = new Uint32Array(2);
    cryptoObj.getRandomValues(buffer);
    return `${buffer[0].toString(36)}${buffer[1].toString(36)}`;
  }

  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}
