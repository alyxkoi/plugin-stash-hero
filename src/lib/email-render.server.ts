// Shared string helpers for the hand-written Resend email templates.
// Server-only. The templates are literal HTML with {{VARIABLE}} placeholders,
// one repeatable EXTRA_ITEMS block, and a few rows that must disappear
// entirely when their data does not exist.

export function money(n: number): string {
  return n === 0 ? "FREE" : `$${n.toFixed(2)}`;
}

export function fill(html: string, vars: Record<string, string>): string {
  return dropEmptyOriginals(
    html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, k: string) => vars[k] ?? ""),
  );
}

/** Strikethrough "was" prices collapse to nothing when there is no retail price. */
function dropEmptyOriginals(html: string): string {
  return html
    .replace(/<br>\s*<span[^>]*line-through[^>]*>\s*<\/span>/g, "")
    .replace(/<div[^>]*class="code"[^>]*>\s*<\/div>/g, "")
    .replace(/<span[^>]*line-through[^>]*>\s*<\/span>/g, "");
}

/** Mint chips whose only content was a percentage/amount are removed. */
export function removeEmptyChips(html: string): string {
  return html.replace(
    /<table role="presentation"[^>]*><tr>\s*<td bgcolor="#7DF5AD"[\s\S]*?<\/tr><\/table>/g,
    (block) => {
      const text = block
        .replace(/<[^>]+>/g, "")
        .replace(/&#8595;|&nbsp;|\s/g, "")
        .trim();
      return text.length === 0 ? "" : block;
    },
  );
}

/** Positions of every `<tr` open tag enclosing `index`, outermost first. */
function enclosingRows(html: string, index: number): number[] {
  const re = /<tr[\s>]|<\/tr>/g;
  const stack: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index >= index) break;
    if (m[0] === "</tr>") stack.pop();
    else stack.push(m.index);
  }
  return stack;
}

function rowEnd(html: string, start: number): number {
  const re = /<tr[\s>]|<\/tr>/g;
  re.lastIndex = start;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0] === "</tr>") {
      depth -= 1;
      if (depth === 0) return m.index + "</tr>".length;
    } else {
      depth += 1;
    }
  }
  return html.length;
}

/**
 * Deletes the table row that wraps `needle`.
 * `level: "innermost"` removes the closest row; `"parent"` removes the row one
 * level further out (used for chips that live inside their own nested table).
 */
export function removeRowContaining(
  html: string,
  needle: string,
  level: "innermost" | "parent" = "parent",
): string {
  const idx = html.indexOf(needle);
  if (idx === -1) return html;
  const rows = enclosingRows(html, idx);
  if (rows.length === 0) return html;
  const pick = level === "innermost" ? rows.length - 1 : Math.max(0, rows.length - 2);
  const start = rows[pick]!;
  return html.slice(0, start) + html.slice(rowEnd(html, start));
}

const START_RE = /<!--\s*\{\{EXTRA_ITEMS\}\}[\s\S]*?-->/;
const END_MARKER = "<!-- end repeat -->";

/**
 * Repeats the EXTRA_ITEMS block once per extra item. With no extra items the
 * entire row holding the extra-items table is removed, so no orphan dividers
 * are left behind.
 */
export function renderExtras(html: string, rows: Record<string, string>[]): string {
  const startMatch = START_RE.exec(html);
  const endIdx = html.indexOf(END_MARKER);
  if (!startMatch || endIdx === -1) return html;

  const blockStart = startMatch.index;
  const tplStart = blockStart + startMatch[0].length;
  const blockEnd = endIdx + END_MARKER.length;

  if (rows.length === 0) {
    // Remove the innermost row that contains both markers.
    const enclosing = enclosingRows(html, blockStart);
    const containing = enclosing.filter((s) => rowEnd(html, s) >= blockEnd);
    if (containing.length === 0) return html.slice(0, blockStart) + html.slice(blockEnd);
    const start = containing[containing.length - 1]!;
    return html.slice(0, start) + html.slice(rowEnd(html, start));
  }

  const tpl = html.slice(tplStart, endIdx);
  const body = rows.map((r) => fill(tpl, r)).join("");
  return html.slice(0, blockStart) + body + html.slice(blockEnd);
}
