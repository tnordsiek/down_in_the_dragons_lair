import type { Token, TokenId } from '../engine/core/types';

export const bagTokenCounts = {
  dragon: 1,
  soulburner: 2,
  skeleton_key_guardian: 12,
  skeleton_lord: 3,
  skeleton_soldier: 5,
  kitchen_rat: 8,
  creepy_spider: 4,
  mummified_priest: 8,
  treasure_chest: 10,
} as const satisfies Record<TokenId, number>;

export const tokenBagEntries = Object.entries(bagTokenCounts).map(
  ([tokenId, count]) => ({
    tokenId: tokenId as TokenId,
    count,
  }),
);

export const totalTokenCount = tokenBagEntries.reduce(
  (sum, entry) => sum + entry.count,
  0,
);

export function getScaledTokenCount(tokenId: TokenId, poolScale = 1): number {
  if (tokenId === 'dragon') {
    return 1;
  }

  return Math.ceil(bagTokenCounts[tokenId] * poolScale);
}

export function createToken(tokenId: TokenId): Token {
  return {
    id: tokenId,
    kind: tokenId === 'treasure_chest' ? 'chest' : 'monster',
  };
}

export function createTokenBag(poolScale = 1): Token[] {
  return tokenBagEntries.flatMap((entry) =>
    Array.from(
      { length: getScaledTokenCount(entry.tokenId, poolScale) },
      () => createToken(entry.tokenId),
    ),
  );
}
