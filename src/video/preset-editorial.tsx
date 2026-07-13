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
  weights: ['400', '500', '600', '800'],
  subsets: ['latin'],
})

const pileAvatarSize = 72
const pileOverlap = 24
const maxPileAvatars = 14

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
    <AbsoluteFill style={{ fontFamily, color: textColor }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />
      <div className="relative flex h-full flex-col justify-center px-28">
        <BigCount stars={stars} />
        <FacePile stargazers={stargazers} stars={stars} />
        <RepositoryLine
          user={user}
          userAvatarUrl={userAvatarUrl}
          repository={repository}
        />
      </div>
    </AbsoluteFill>
  )
}

function BigCount({ stars }: { stars: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const starsToDisplay = Math.round(
    interpolate(frame, [0, animationDurationInSeconds * fps], [0, stars], {
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.5, 1, 0.5, 1),
    }),
  )

  const enter = spring({ frame, fps, config: { damping: 200 } })
  const rule = spring({ frame: frame - 8, fps, config: { damping: 200 } })

  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 30}px)`,
      }}
    >
      <div className="text-[168px] font-extrabold leading-none tracking-tighter tabular-nums">
        {starsToDisplay.toLocaleString('en-US', { useGrouping: true })}
      </div>
      <div
        className="mt-6 h-px w-[560px] origin-left bg-current opacity-30"
        style={{ transform: `scaleX(${rule})` }}
      />
      <div className="mt-5 text-[26px] font-medium uppercase tracking-[0.5em] opacity-60">
        Stars
      </div>
    </div>
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
    <div className="mt-14 flex items-center">
      {avatars.map((avatarUrl, i) => {
        const enter = spring({
          frame: frame - 25 - i * 4,
          fps,
          config: { damping: 14 },
        })
        return (
          <Img
            key={i}
            src={avatarUrl}
            width={pileAvatarSize}
            height={pileAvatarSize}
            className="rounded-full border-[3px] border-white shadow-sm"
            style={{
              marginLeft: i === 0 ? 0 : -pileOverlap,
              opacity: enter,
              transform: `translateX(${(1 - enter) * -16}px) scale(${enter})`,
              zIndex: avatars.length - i,
            }}
          />
        )
      })}
      {remaining > 0 && (
        <PileRemainder remaining={remaining} delay={25 + avatars.length * 4} />
      )}
    </div>
  )
}

function PileRemainder({
  remaining,
  delay,
}: {
  remaining: number
  delay: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame: frame - delay, fps, config: { damping: 14 } })

  return (
    <span
      className="ml-5 text-[26px]"
      style={{ opacity: enter * 0.5 }}
    >
      +{remaining.toLocaleString('en-US', { useGrouping: true })} more
    </span>
  )
}

function RepositoryLine({
  user,
  userAvatarUrl,
  repository,
}: {
  user: string
  userAvatarUrl: string
  repository: string
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame: frame - 45, fps, config: { damping: 200 } })

  return (
    <div
      className="mt-14 flex items-center gap-4 text-[30px]"
      style={{
        opacity: enter * 0.75,
        transform: `translateY(${(1 - enter) * 16}px)`,
      }}
    >
      <Img
        src={userAvatarUrl}
        alt={user}
        className="w-[1.3em] h-[1.3em] rounded-full"
      />
      <span>
        {user}
        <span className="mx-[0.3em] opacity-50">/</span>
        <strong className="font-semibold">{repository}</strong>
      </span>
    </div>
  )
}
