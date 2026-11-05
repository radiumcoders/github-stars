// Hex color + opacity → rgba(). A plain rgba() string (not color-mix) so the
// in-browser exporter, which parses shadow and gradient colors itself,
// always understands it.
export function withAlpha(hex: string, percent: number) {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h.slice(0, 6), 16)
  if (h.length < 6 || Number.isNaN(n)) return `rgba(17, 24, 39, ${percent / 100})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${percent / 100})`
}
