import { cx } from './cx';

type RunicDividerProps = {
  className?: string;
};

/**
 * Decorative heraldic section break — a centered diamond flanked by rules,
 * drawn entirely from a CSS SVG data-URI (no asset, no network). Marked as a
 * separator for assistive tech.
 */
export function RunicDivider({ className }: RunicDividerProps) {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className={cx(
        'my-3 h-4 w-full bg-runic-divider bg-center bg-no-repeat',
        className,
      )}
    />
  );
}
