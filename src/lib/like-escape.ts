/** Escape LIKE/ILIKE wildcards so user-supplied values match exactly. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}
