import type { ReactNode } from 'react';

import { cx } from './cx';

type SectionHeadingProps = {
  /** Real heading tag rendered, so heading-role queries keep working. */
  level?: 2 | 3;
  /** Small uppercase tracked label style (the recurring panel sub-heading). */
  eyebrow?: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
};

/**
 * Consistent panel heading. Chooses the real `<h2>`/`<h3>` tag explicitly (no
 * `as` cast) and appends the forwarded `className` last.
 */
export function SectionHeading({
  level = 2,
  eyebrow = false,
  children,
  id,
  className,
}: SectionHeadingProps) {
  const base = eyebrow
    ? 'text-xs font-semibold uppercase tracking-wide text-parchment-200'
    : 'font-display text-amber-100';

  if (level === 3) {
    return (
      <h3 id={id} className={cx(base, className)}>
        {children}
      </h3>
    );
  }

  return (
    <h2 id={id} className={cx(base, className)}>
      {children}
    </h2>
  );
}
