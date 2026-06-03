import type { ReactNode } from 'react';

import { cx } from './cx';

export type ChipTone =
  | 'neutral'
  | 'torch'
  | 'jade'
  | 'blood'
  | 'arcane'
  | 'portal';

type ChipProps = {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
  title?: string;
  'data-asset-id'?: string;
};

const chipTone: Record<ChipTone, string> = {
  neutral: 'border-obsidian-600 text-parchment-200',
  torch: 'border-torch-500 text-torch-200',
  jade: 'border-jade-400 text-jade-200',
  blood: 'border-blood-500 text-blood-200',
  arcane: 'border-arcane-400 text-arcane-200',
  portal: 'border-portal-400 text-portal-200',
};

/**
 * Small forged status tag. Single `<span>` root; forwarded `className` wins so
 * callers keep mono/size tokens that tests assert.
 */
export function Chip({
  tone = 'neutral',
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-carve border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]',
        chipTone[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
