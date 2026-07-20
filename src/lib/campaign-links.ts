// Shared helpers for the campaign-links tool.
// Slugify friendly UI text into clean lowercase UTM values,
// and generate a short unique share code for /go/:code URLs.

export function slugifyUtm(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]+/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

// URL-safe short codes; unambiguous alphabet.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export function generateShareCode(len = 7): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

export function normalizePath(input: string): string {
  const s = (input || "/").trim();
  if (!s || s === "/") return "/";
  // strip protocol/host if user pasted a full URL
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return (u.pathname || "/") + u.search + u.hash;
    }
  } catch { /* fall through */ }
  return s.startsWith("/") ? s : "/" + s;
}
