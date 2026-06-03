import { describe, expect, it } from 'vitest';

import { createNewGame } from '../engine/setup/createGame';
import { buildFeedbackMailto } from './buildFeedbackMailto';

function decodeBody(href: string): string {
  const match = href.match(/[?&]body=([^&]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function decodeSubject(href: string): string {
  const match = href.match(/[?&]subject=([^&]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

describe('buildFeedbackMailto', () => {
  it('targets the operator address with a version-tagged subject', () => {
    const href = buildFeedbackMailto({
      message: 'Found a bug',
      includeDiagnostics: false,
      version: 'v9.9',
    });

    expect(href.startsWith('mailto:tnordsiek@web.de?')).toBe(true);
    expect(decodeSubject(href)).toBe(
      '[Down in the Dragons Lair] Feedback (v9.9)',
    );
  });

  it('encodes the message into the body', () => {
    const href = buildFeedbackMailto({
      message: 'Tiles overlap & the dragon vanished',
      includeDiagnostics: false,
    });

    expect(decodeBody(href)).toContain('Tiles overlap & the dragon vanished');
  });

  it('adds a reply-to line when a reply e-mail is provided', () => {
    const href = buildFeedbackMailto({
      message: 'Ping me back',
      replyEmail: 'player@example.com',
      includeDiagnostics: false,
    });

    expect(decodeBody(href)).toContain('Reply to: player@example.com');
  });

  it('omits diagnostics when not opted in', () => {
    const game = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'seed-a',
    });
    const href = buildFeedbackMailto({
      message: 'No data please',
      includeDiagnostics: false,
      gameState: game,
    });

    expect(decodeBody(href)).not.toContain('Diagnostics');
    expect(decodeBody(href)).not.toContain('Seed:');
  });

  it('appends diagnostics with the seed when opted in', () => {
    const game = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'seed-xyz',
    });
    const href = buildFeedbackMailto({
      message: 'Here is my game',
      includeDiagnostics: true,
      gameState: game,
    });

    const body = decodeBody(href);
    expect(body).toContain('Diagnostics (voluntarily shared)');
    expect(body).toContain('Seed: seed-xyz');
  });

  it('does not append diagnostics when opted in but no game is running', () => {
    const href = buildFeedbackMailto({
      message: 'On the start screen',
      includeDiagnostics: true,
    });

    expect(decodeBody(href)).not.toContain('Diagnostics');
  });
});
