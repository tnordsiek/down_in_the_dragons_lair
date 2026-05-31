// Single source of truth for the operator contact address.
// Both values are assembled from fragments so the plain address never appears
// as a literal string in the bundle (basic protection against e-mail harvesting).

/** Real, machine-usable address for `mailto:` links, e.g. tnordsiek@web.de */
export const contactEmailAddress = ['tnordsiek', '@', 'web', '.', 'de'].join('');

/** Human-readable, obfuscated form shown in the imprint / privacy policy. */
export const contactEmailDisplay = [
  'tnordsiek',
  ' [at] ',
  'web',
  ' [dot] ',
  'de',
].join('');
