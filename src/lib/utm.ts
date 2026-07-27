// Shared UTM source normalizer.
// Trims + lowercases. Maps known aliases to one canonical value so a
// single platform never gets split into multiple entries in analytics.

export function normalizeUtmSource(input: string | null | undefined): string | null {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  const metaAliases = new Set([
    "fb", "facebook", "facebook.com",
    "ig", "instagram", "instagram.com",
    "meta", "meta ads", "meta-ads", "metaads",
  ]);
  if (metaAliases.has(s)) return "meta";
  return s;
}

// Short opaque click id ("pw_cid").
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export function generateClickId(len = 10): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}
