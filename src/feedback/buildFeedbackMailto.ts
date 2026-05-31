import { contactEmailAddress } from '../legal/contact';
import type { GameState } from '../engine/core/types';
import { APP_VERSION } from './appVersion';
import { buildDiagnosticsSummary } from './diagnostics';

export type FeedbackMailtoInput = {
  /** The free-text message the player typed. */
  message: string;
  /** Optional reply address the player provided. */
  replyEmail?: string;
  /** Whether to append the technical game-state diagnostics. */
  includeDiagnostics: boolean;
  /** Current game state, if a game is running (required for diagnostics). */
  gameState?: GameState;
  /** App version, defaults to {@link APP_VERSION}. */
  version?: string;
};

/**
 * Assembles a `mailto:` URL targeting the operator address with a pre-filled
 * subject and body. The recipient address is never typed by the player; the
 * mail client opens with everything filled in so they only need to hit send.
 */
export function buildFeedbackMailto({
  message,
  replyEmail,
  includeDiagnostics,
  gameState,
  version = APP_VERSION,
}: FeedbackMailtoInput): string {
  const subject = `[Down in the Dragons Lair] Feedback (${version})`;

  const bodyParts: string[] = [message.trim()];

  if (replyEmail && replyEmail.trim().length > 0) {
    bodyParts.push(`\nReply to: ${replyEmail.trim()}`);
  }

  if (includeDiagnostics && gameState) {
    bodyParts.push(
      '\n--- Diagnostics (voluntarily shared) ---\n' +
        buildDiagnosticsSummary(gameState, version),
    );
  }

  const body = bodyParts.join('\n');

  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${contactEmailAddress}?${query}`;
}
