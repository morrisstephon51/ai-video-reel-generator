// Coercers for fields read out of model-returned JSON.
//
// `chat(..., true)` asks the model for JSON, but nothing checks the SHAPE of
// what comes back. A model that answers `"score": "85/100"` or
// `"fixes": "Tighten the hook"` used to flow straight into arithmetic and
// array spreads: the score became NaN (NaN composite, NaN rows the DB rejects,
// a compliance gate that can never pass) and a string `fixes` was spread into
// one-character "fixes". These helpers clamp those fields at the parse site.
//
// No path aliases or runtime-only TS syntax here, so node --test can import it
// directly under --experimental-strip-types.

/** Finite score clamped to [0, 100]. Numeric strings ("85", " 72.5 ") are accepted. */
export function coerceScore(value: unknown, fallback: number): number {
  let n: number = NaN
  if (typeof value === 'number') n = value
  else if (typeof value === 'string' && value.trim() !== '') n = Number(value.trim())
  if (!Number.isFinite(n)) n = fallback
  return Math.min(100, Math.max(0, n))
}

/** Array of non-empty strings. A bare string becomes a one-item list; anything else is dropped. */
export function coerceStringList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  return items
    .filter((x): x is string => typeof x === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/** Plain string, or the fallback when the model returned a non-string. */
export function coerceText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}
