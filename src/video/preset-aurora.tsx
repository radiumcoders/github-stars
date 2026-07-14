import { loadFont } from '@remotion/google-fonts/Inter'
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
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

// Golden-angle placement around the card: evenly spread, never clumped,
// and always outside the center where the glass card sits.
const GOLDEN_ANGLE = 2.399963
const floatingAvatarCount = 16

export function AuroraPreset({
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
      <FloatingAvatars stargazers={stargazers} shaderColor={shaderColor} />
      <GlassCard
        user={user}
        userAvatarUrl={userAvatarUrl}
        repository={repository}
        stars={stars}
      />
    </AbsoluteFill>
  )
}

function FloatingAvatars({
  stargazers,
  shaderColor,
}: {
  stargazers: Props['stargazers']
  shaderColor: string
}) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const avatars = stargazers.slice(0, floatingAvatarCount)
  const centerX = width / 2
  const centerY = height / 2

  return (
    <AbsoluteFill>
      {avatars.map((avatarUrl, i) => {
        // Alternate near/far for depth; far ones are small, dim and soft.
        const near = i % 3 === 0
        const size = near
          ? 60 + random(`size-${i}`) * 16
          : 36 + random(`size-${i}`) * 14
        const angle = i * GOLDEN_ANGLE + random(`a-${i}`) * 0.5
        const reach = 0.62 + random(`r-${i}`) * 0.38
        const x = centerX + Math.cos(angle) * 560 * reach
        const y = centerY + Math.sin(angle) * 300 * reach
        const phase = random(`phase-${i}`) * Math.PI * 2
        const speed = 0.012 + random(`speed-${i}`) * 0.012
        const driftX = Math.sin(frame * speed + phase) * 14
        const driftY = Math.cos(frame * speed * 0.8 + phase) * 10
        const enter = spring({
          frame: frame - 10 - i * 2,
          fps,
          config: { damping: 200 },
        })

        return (
          <Img
            key={i}
            src={avatarUrl}
            width={size}
            height={size}
            className="absolute rounded-full"
            style={{
              left: x + driftX - size / 2,
              top: y + driftY - size / 2,
              opacity: enter * (near ? 0.95 : 0.55),
              filter: near ? undefined : 'blur(1.5px)',
              transform: `scale(${enter})`,
              boxShadow: `0 0 ${size * 0.6}px ${shaderColor}55`,
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}

function GlassCard({
  user,
  userAvatarUrl,
  repository,
  stars,
}: {
  user: string
  userAvatarUrl: string
  repository: string
  stars: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const starsToDisplay = Math.round(
    interpolate(frame, [0, animationDurationInSeconds * fps], [0, stars], {
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.5, 1, 0.5, 1),
    }),
  )

  const enter = spring({ frame: frame - 4, fps, config: { damping: 18 } })
  // Gentle idle float so the card never feels frozen.
  const bob = Math.sin(frame / 45) * 4

  return (
    <AbsoluteFill className="items-center justify-center">
      <div
        className="relative overflow-hidden rounded-[32px] border border-white/20 px-16 py-12 backdrop-blur-2xl"
        style={{
          opacity: enter,
          transform: `scale(${0.94 + enter * 0.06}) translateY(${bob}px)`,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)',
          boxShadow:
            '0 24px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        <ShineSweep />
        <div className="relative flex items-center gap-3">
          <StarIcon size={30} />
          <span className="text-[24px] font-light uppercase tracking-[0.3em] opacity-70">
            Total stars
          </span>
        </div>
        <div className="relative mt-5 text-[136px] font-light leading-none tracking-tighter tabular-nums">
          {starsToDisplay.toLocaleString('en-US', { useGrouping: true })}
        </div>
        <div className="relative mt-9 h-px w-full bg-current opacity-20" />
        <div className="relative mt-7 flex items-center gap-4 text-[32px]">
          <Img
            src={userAvatarUrl}
            alt={user}
            className="size-[44px] rounded-full"
          />
          <span className="font-light opacity-80">
            {user}
            <span className="mx-[0.25em] opacity-50">/</span>
            <span className="font-normal opacity-100">{repository}</span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function ShineSweep() {
  const frame = useCurrentFrame()
  // A light band sweeps the card every 2.5s, then rests off-screen.
  const left = interpolate(frame % 150, [10, 70], [-60, 160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      className="pointer-events-none absolute inset-y-0 w-[45%]"
      style={{
        left: `${left}%`,
        background:
          'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
        transform: 'skewX(-15deg)',
      }}
    />
  )
}

function StarIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#fbbf24"
      stroke="#f59e0b"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
