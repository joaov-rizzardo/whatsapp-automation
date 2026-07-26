/**
 * `{{variavel}}` placeholders inside a message text — the one place a block
 * references a variable by name instead of by id (a user types into a textarea;
 * an id there would be unreadable). That's why the content block implements
 * `renameVariable`.
 */

// Names are slugs (see schemas/variable.ts), so the pattern stays this narrow.
const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;

/** Every variable name referenced in the text, without duplicates. */
export function extractVariableNames(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    names.add(match[1]);
  }
  return [...names];
}

/** Rewrites `{{from}}` to `{{to}}`, preserving the rest of the text. */
export function renameInterpolation(
  text: string,
  from: string,
  to: string,
): string {
  return text.replace(PLACEHOLDER, (whole, name: string) =>
    name === from ? `{{${to}}}` : whole,
  );
}

export function formatPlaceholder(name: string): string {
  return `{{${name}}}`;
}
