/**
 * Tiny class-name joiner. Falsy parts are dropped; truthy parts are space-joined.
 * Kept dependency-free and order-preserving so the last argument (a forwarded
 * `className`) always wins for Tailwind specificity and exact-string assertions.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
