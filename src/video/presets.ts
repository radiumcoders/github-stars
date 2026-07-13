// Preset metadata only — no Remotion imports, so it is safe to use from
// server components and anything that must not evaluate Remotion during SSR.
// The preset id → component mapping lives in composition.tsx.

export const presetIds = ['generic', 'confetti', 'editorial'] as const

export type PresetId = (typeof presetIds)[number]

export const defaultPreset: PresetId = 'generic'

export const presets: { id: PresetId; label: string }[] = [
  { id: 'generic', label: 'Generic' },
  { id: 'confetti', label: 'Confetti Celebration' },
  { id: 'editorial', label: 'Editorial' },
]

// Background colors: primary is the base, shader is the fluid moving tint.
export const defaultPrimaryColor = '#ffffff'
export const defaultShaderColor = '#c7d2fe'
export const defaultTextColor = '#111827'
