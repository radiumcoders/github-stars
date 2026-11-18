import { ComponentType } from 'react'
import { AuroraPreset } from './preset-aurora'
import { ConfettiPreset } from './preset-confetti'
import { EditorialPreset } from './preset-editorial'
import { GenericPreset } from './preset-generic'
import { HistoryPreset } from './preset-history'
import { MarqueePreset } from './preset-marquee'
import { MilestonePreset } from './preset-milestone'
import { MosaicPreset } from './preset-mosaic'
import { OrbitPreset } from './preset-orbit'
import { StackBurstPreset } from './preset-stack-burst'
import { PresetId, defaultPreset } from './presets'
import { Props } from './schema'

export { animationDurationInSeconds, fps, height, width } from './config'

const presetComponents: Record<PresetId, ComponentType<Props>> = {
  generic: GenericPreset,
  confetti: ConfettiPreset,
  editorial: EditorialPreset,
  aurora: AuroraPreset,
  'stack-burst': StackBurstPreset,
  history: HistoryPreset,
  marquee: MarqueePreset,
  mosaic: MosaicPreset,
  orbit: OrbitPreset,
  milestone: MilestonePreset,
}

export function GitHubStarsComposition(props: Props) {
  const Preset =
    presetComponents[props.preset] ?? presetComponents[defaultPreset]
  return <Preset {...props} />
}
