import type { Token, TokenId } from '../engine/core/types';

export const bagTokenCounts = {
  dragon: 1,
  fallen: 2,
  skeleton_turnkey: 12,
  skeleton_king: 3,
  skeleton_warrior: 5,
  giant_rat: 8,
  giant_spider: 4,
  mummy: 8,
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

export function createToken(tokenId: TokenId): Token {
  return {
    id: tokenId,
    kind: tokenId === 'treasure_chest' ? 'chest' : 'monster',
  };
}

export function createTokenBag(): Token[] {
  return tokenBagEntries.flatMap((entry) =>
    Array.from({ length: entry.count }, () => createToken(entry.tokenId)),
  );
}
