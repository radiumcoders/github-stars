import { contrastTextColor } from './text-for-background'

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
function palette(primary: string, shader: string): PresetColors {
  return {
    primary,
    shader,
    text: contrastTextColor(primary),
  }
}

export const presets: { id: PresetId; label: string; colors: PresetColors }[] =
  [
    {
      id: 'generic',
      label: 'Generic',
      colors: palette('#ffffff', '#ffffff'),
    },
    {
      id: 'confetti',
      label: 'Confetti Celebration',
      colors: palette('#ffffff', '#ffffff'),
    },
    {
      id: 'editorial',
      label: 'Editorial',
      colors: palette('#ffffff', '#ffffff'),
    },
    {
      id: 'aurora',
      label: 'Aurora Glass',
      colors: palette('#0b1120', '#7c3aed'),
    },
  ]

export function presetColors(id: PresetId): PresetColors {
  return presets.find((p) => p.id === id)?.colors ?? presets[0].colors
}

// Defaults for a freshly generated video (the generic preset's palette).
export const defaultPrimaryColor = presetColors('generic').primary
export const defaultShaderColor = presetColors('generic').shader
export const defaultTextColor = presetColors('generic').text
