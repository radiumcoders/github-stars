// Preset metadata only — no Remotion imports, so it is safe to use from
// server components and anything that must not evaluate Remotion during SSR.
// The preset id → component mapping lives in composition.tsx.

export const presetIds = ['generic', 'confetti', 'editorial', 'aurora'] as const

export type PresetId = (typeof presetIds)[number]

export const defaultPreset: PresetId = 'generic'

export type PresetColors = {
  primary: string
  shader: string
  text: string
}

// Each preset ships with colors it was designed around; picking a preset
// applies them (the user can still override afterwards).
export const presets: { id: PresetId; label: string; colors: PresetColors }[] =
  [
    {
      id: 'generic',
      label: 'Generic',
      colors: { primary: '#ffffff', shader: '#ffffff', text: '#111827' },
    },
    {
      id: 'confetti',
      label: 'Confetti Celebration',
      colors: { primary: '#ffffff', shader: '#ffffff', text: '#111827' },
    },
    {
      id: 'editorial',
      label: 'Editorial',
      colors: { primary: '#ffffff', shader: '#ffffff', text: '#111827' },
    },
    {
      id: 'aurora',
      label: 'Aurora Glass',
      colors: { primary: '#0b1120', shader: '#7c3aed', text: '#ffffff' },
    },
  ]

export function presetColors(id: PresetId): PresetColors {
  return presets.find((p) => p.id === id)?.colors ?? presets[0].colors
}

// Defaults for a freshly generated video (the generic preset's palette).
export const defaultPrimaryColor = presetColors('generic').primary
export const defaultShaderColor = presetColors('generic').shader
export const defaultTextColor = presetColors('generic').text
