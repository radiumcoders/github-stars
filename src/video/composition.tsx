import { ComponentType } from 'react'
import { AuroraPreset } from './preset-aurora'
import { ConfettiPreset } from './preset-confetti'
import { EditorialPreset } from './preset-editorial'
import { GenericPreset } from './preset-generic'
import { PresetId, defaultPreset } from './presets'
import { Props } from './schema'

export { animationDurationInSeconds, fps, height, width } from './config'

const presetComponents: Record<PresetId, ComponentType<Props>> = {
  generic: GenericPreset,
  confetti: ConfettiPreset,
  editorial: EditorialPreset,
  aurora: AuroraPreset,
}

export function GitHubStarsComposition(props: Props) {
  const Preset =
    presetComponents[props.preset] ?? presetComponents[defaultPreset]
  return <Preset {...props} />
}
