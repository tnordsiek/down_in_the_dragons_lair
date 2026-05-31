import type { ReactNode } from 'react';

import { cx } from './cx';

export type PanelTone = 'stone' | 'parchment' | 'sunken';

type PanelProps = {
  /** Surface treatment. `stone` = forged metal plate (default). */
  tone?: PanelTone;
  children: ReactNode;
  className?: string;
  /** Passed through so existing asset hooks (e.g. ui_modal_frame) survive. */
  'data-asset-id'?: string;
  'data-testid'?: string;
};

const panelTone: Record<PanelTone, string> = {
  stone: 'border border-obsidian-700 bg-obsidian-800/85 shadow-forged',
  parchment:
    'border border-torch-600 bg-parchment text-parchment-800 shadow-forged',
  sunken: 'border border-obsidian-600 bg-obsidian-950/80 shadow-carve',
};

/**
 * Forged-metal / parchment surface wrapper. Renders a single `<div>` root and
 * appends the forwarded `className` last so callers can keep layout/test-locked
 * classes and override padding.
 */
export function Panel({ tone = 'stone', className, children, ...rest }: PanelProps) {
  return (
    <div className={cx('rounded-forged p-4', panelTone[tone], className)} {...rest}>
      {children}
    </div>
  );
}
