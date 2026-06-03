import type { ButtonHTMLAttributes } from 'react';

import { cx } from './cx';

export type ButtonVariant =
  | 'primary' // torch-gold CTA
  | 'secondary' // stone outline
  | 'danger' // blood fill
  | 'choice' // torch-amber outline
  | 'portal' // teal outline
  | 'spell'; // arcane-violet outline

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const buttonVariant: Record<ButtonVariant, string> = {
  primary:
    'bg-torch-300 text-obsidian-950 font-semibold shadow-forged transition-colors hover:bg-torch-400',
  secondary:
    'border border-obsidian-600 text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200',
  danger:
    'bg-blood-600 text-white font-semibold shadow-forged transition-colors hover:bg-blood-500',
  choice:
    'border border-torch-500 text-torch-200 transition-colors hover:bg-torch-500/10',
  portal:
    'border border-portal-400 text-portal-200 transition-colors hover:bg-portal-400/10',
  spell:
    'border border-arcane-400 text-arcane-200 transition-colors hover:bg-arcane-400/10',
};

/**
 * Forged button. Renders a single `<button>` and appends the forwarded
 * `className` last. Two call sites with identical props produce byte-identical
 * `className` strings (relied on by the Center Map / End Turn equality test).
 */
export function Button({
  variant = 'secondary',
  className,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(
        'rounded-forged px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40',
        buttonVariant[variant],
        className,
      )}
      {...rest}
    />
  );
}
