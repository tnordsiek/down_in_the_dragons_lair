import { useEffect, useRef, useState } from 'react';

import { buildFeedbackMailto } from '../../feedback/buildFeedbackMailto';
import { useSetupStore } from '../../state/setupStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Button } from '../primitives';

const fieldClassName =
  'rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 text-parchment-50 shadow-carve';

export function FeedbackModal() {
  const t = useTranslation();
  const open = useSetupStore((state) => state.feedbackModalOpen);
  const closeFeedbackModal = useSetupStore((state) => state.closeFeedbackModal);
  const gameState = useSetupStore((state) => state.gameState);

  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClose = () => {
    setMessage('');
    setReplyEmail('');
    setIncludeDiagnostics(false);
    closeFeedbackModal();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    textareaRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // handleClose is stable enough for this lifecycle; we only re-bind on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) {
    return null;
  }

  const canSend = message.trim().length > 0;
  const mailtoHref = buildFeedbackMailto({
    message,
    replyEmail,
    includeDiagnostics: includeDiagnostics && gameState !== undefined,
    gameState,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <button
        aria-label={t.feedbackModal.closeForm}
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={handleClose}
        type="button"
      />
      <section className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-forged border border-torch-300 bg-obsidian-900 p-5 shadow-[0_0_40px_rgba(224,165,52,0.2),inset_0_1px_0_rgba(247,240,223,0.1)]">
        <h2
          id="feedback-modal-title"
          className="font-display text-2xl text-amber-100"
        >
          {t.feedbackModal.title}
        </h2>
        <p className="mt-2 text-sm text-parchment-200">
          {t.feedbackModal.description}
        </p>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm text-parchment-200">
            {t.feedbackModal.messageLabel}
            <textarea
              ref={textareaRef}
              className={fieldClassName}
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t.feedbackModal.messagePlaceholder}
            />
          </label>

          <label className="grid gap-2 text-sm text-parchment-200">
            {t.feedbackModal.emailLabel}
            <input
              className={`${fieldClassName} font-mono`}
              type="email"
              value={replyEmail}
              onChange={(event) => setReplyEmail(event.target.value)}
              placeholder={t.feedbackModal.emailPlaceholder}
            />
          </label>

          {gameState ? (
            <div className="grid gap-2 rounded-carve border border-obsidian-700 bg-obsidian-950/60 p-3">
              <label className="flex items-start gap-2 text-sm text-parchment-100">
                <input
                  className="mt-1 accent-amber-300"
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(event) =>
                    setIncludeDiagnostics(event.target.checked)
                  }
                />
                <span>{t.feedbackModal.diagnosticsLabel}</span>
              </label>
              <p className="text-xs leading-5 text-parchment-300">
                {t.feedbackModal.diagnosticsNote}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            {t.feedbackModal.cancel}
          </Button>
          <a
            aria-disabled={!canSend}
            className={`rounded-forged bg-torch-300 px-3 py-2 text-sm font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400 ${
              canSend ? '' : 'pointer-events-none opacity-40'
            }`}
            href={canSend ? mailtoHref : undefined}
            onClick={(event) => {
              if (!canSend) {
                event.preventDefault();
                return;
              }
              handleClose();
            }}
          >
            {t.feedbackModal.openEmail}
          </a>
        </div>
      </section>
    </div>
  );
}
