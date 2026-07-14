import { loadFont } from '@remotion/google-fonts/Inter'
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { animationDurationInSeconds } from './config'
import { FluidBackground } from './fluid-background'
import { Props } from './schema'

const { fontFamily } = loadFont('normal', {
  weights: ['300', '400', '500'],
  subsets: ['latin'],
})

const pileAvatarSize = 68
const pileOverlap = 22
const maxPileAvatars = 12

// Shared "calm" entrance: heavily damped spring, fade + rise, no bounce.
function useReveal(delay: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config: { damping: 200 } })
}

export function EditorialPreset({
  user,
  userAvatarUrl,
  repository,
  stargazers,
  stars,
  primaryColor,
  shaderColor,
  textColor,
}: Props) {
  return (
    <AbsoluteFill className="font-light" style={{ fontFamily, color: textColor }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />
      <div className="relative flex h-full flex-col justify-center px-24 pb-10">
        <Eyebrow
          user={user}
          userAvatarUrl={userAvatarUrl}
          repository={repository}
        />
        <BigCount stars={stars} />
        <Rule />
        <FacePile stargazers={stargazers} stars={stars} />
      </div>
    </AbsoluteFill>
  )
}

function Eyebrow({
  user,
  userAvatarUrl,
  repository,
}: {
  user: string
  userAvatarUrl: string
  repository: string
}) {
  const enter = useReveal(0)

  return (
    <div
      className="flex items-center gap-4 text-[34px]"
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 20}px)`,
      }}
    >
      <Img
        src={userAvatarUrl}
        alt={user}
        className="size-[52px] rounded-full"
      />
      <span className="font-light tracking-wide opacity-60">
        {user}
        <span className="mx-[0.35em] opacity-50">/</span>
        <span className="font-normal opacity-90">{repository}</span>
      </span>
    </div>
  )
}

function BigCount({ stars }: { stars: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = useReveal(6)

  const starsToDisplay = Math.round(
    interpolate(frame, [0, animationDurationInSeconds * fps], [0, stars], {
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.5, 1, 0.5, 1),
    }),
  )

  return (
    <div
      className="mt-6 flex items-baseline gap-8"
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 28}px)`,
      }}
    >
      <span className="text-[200px] font-light leading-none tracking-tighter tabular-nums">
        {starsToDisplay.toLocaleString('en-US', { useGrouping: true })}
      </span>
      <span className="text-[68px] font-light leading-none tracking-tight opacity-40">
        stars
      </span>
    </div>
  )
}

function Rule() {
  const enter = useReveal(16)

  return (
    <div
      className="mt-16 h-px w-[640px] origin-left bg-current opacity-25"
      style={{ transform: `scaleX(${enter})` }}
    />
  )
}

function FacePile({
  stargazers,
  stars,
}: {
  stargazers: Props['stargazers']
  stars: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const avatars = stargazers.slice(0, maxPileAvatars)
  const remaining = stars - avatars.length

  return (
    <div className="mt-10 flex items-center">
      {avatars.map((avatarUrl, i) => {
        const enter = spring({
          frame: frame - 24 - i * 3,
          fps,
          config: { damping: 200 },
        })
        return (
          <Img
            key={i}
            src={avatarUrl}
            width={pileAvatarSize}
            height={pileAvatarSize}
            className="rounded-full border-2 border-white shadow-sm"
            style={{
              marginLeft: i === 0 ? 0 : -pileOverlap,
              opacity: enter,
              transform: `translateX(${(1 - enter) * -14}px)`,
              zIndex: avatars.length - i,
            }}
          />
        )
      })}
      {remaining > 0 && (
        <Caption remaining={remaining} delay={24 + avatars.length * 3} />
      )}
    </div>
  )
}

function Caption({ remaining, delay }: { remaining: number; delay: number }) {
  const enter = useReveal(delay)

  return (
    <span
      className="ml-6 text-[30px] font-light tracking-wide"
      style={{ opacity: enter * 0.5 }}
    >
      and {remaining.toLocaleString('en-US', { useGrouping: true })} others
    </span>
  )
}
