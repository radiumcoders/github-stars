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
  weights: ['500', '600', '800'],
  subsets: ['latin'],
})

const maxAvatars = 50
const goldenAngle = Math.PI * (3 - Math.sqrt(5))
const burstAt = animationDurationInSeconds / 2
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export function StackBurstPreset({
  user,
  userAvatarUrl,
  repository,
  stargazers,
  stars,
  primaryColor,
  shaderColor,
  textColor,
}: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const introOpacity = interpolate(
    frame / fps,
    [0, 0.2, burstAt - 0.15, burstAt + 0.05],
    [0, 0.6, 0.6, 0],
    clamp,
  )

  return (
    <AbsoluteFill style={{ fontFamily, color: textColor, overflow: 'hidden' }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />
      <BurstRing color={textColor} />
      <RevealedTotal stars={stars} />
      <StackedAvatars stargazers={stargazers} primaryColor={primaryColor} />
      <div className="absolute inset-x-16 top-14 flex items-center justify-center gap-3 text-[28px]">
        <Img
          src={userAvatarUrl}
          alt={user}
          className="size-[40px] shrink-0 rounded-full"
        />
        <span className="truncate font-medium">
          {user}
          <span className="mx-2 opacity-40">/</span>
          <strong className="font-semibold">{repository}</strong>
        </span>
      </div>
      <div
        className="absolute inset-x-0 bottom-24 text-center text-[24px] font-medium tracking-wide"
        style={{ opacity: introOpacity }}
      >
        {stargazers.length > 0 ? 'Every star starts with someone.' : 'A little star power.'}
      </div>
    </AbsoluteFill>
  )
}

function StackedAvatars({
  stargazers,
  primaryColor,
}: Pick<Props, 'stargazers' | 'primaryColor'>) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const seconds = frame / fps
  const avatars = stargazers.slice(0, maxAvatars)
  // Count-only and zero-star videos get a star token, never fixture faces.
  const tokens = avatars.length > 0 ? avatars : [null]
  const squeeze = interpolate(
    seconds,
    [burstAt - 0.24, burstAt],
    [1, 0.82],
    { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) },
  )
  const burst = interpolate(seconds, [burstAt, burstAt + 0.82], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const fade = interpolate(seconds, [burstAt + 0.2, burstAt + 0.82], [1, 0], clamp)

  return (
    <AbsoluteFill aria-hidden>
      {tokens.map((avatarUrl, index) => {
        const angle = index * goldenAngle - Math.PI / 2
        const distance = Math.sqrt(index / Math.max(1, tokens.length - 1)) * 76
        const size = 116 + random(`stack-size-${index}`) * 32
        // Fit the entire stagger into the intro, even with a full avatar list.
        const delay = 0.06 + (index / Math.max(1, tokens.length - 1)) * 0.78
        const enter = spring({
          frame: frame - delay * fps,
          fps,
          durationInFrames: 0.4 * fps,
          config: { damping: 18, stiffness: 170, overshootClamping: true },
        })
        const stackX = Math.cos(angle) * distance * squeeze
        const stackY = Math.sin(angle) * distance * 0.65 * squeeze
        const reach = 0.9 + random(`stack-reach-${index}`) * 0.3
        // Entrances use independent seeds and start fully outside the frame.
        const incomingAngle = random(`stack-incoming-angle-${index}`) * Math.PI * 2
        const incomingDistance =
          Math.hypot(width / 2 + size / 2, height / 2 + 20 + size / 2) *
          (1.05 + random(`stack-incoming-distance-${index}`) * 0.3)
        const incomingX = Math.cos(incomingAngle) * incomingDistance
        const incomingY = Math.sin(incomingAngle) * incomingDistance
        const x = (1 - enter) * incomingX + stackX * (1 - burst) +
          Math.cos(angle) * width * 0.9 * reach * burst
        const y = (1 - enter) * incomingY + stackY * (1 - burst) +
          Math.sin(angle) * height * 0.9 * reach * burst
        const tilt = (random(`stack-tilt-${index}`) - 0.5) * 30
        const rotation = tilt * enter + burst * (index % 2 === 0 ? 100 : -100)
        const scale = (0.9 + enter * 0.1) * squeeze * (1 - burst * 0.35)

        return (
          <div
            key={`${index}-${avatarUrl ?? 'star'}`}
            className="absolute flex items-center justify-center overflow-hidden rounded-full border-4 shadow-lg"
            style={{
              left: width / 2 - size / 2,
              top: height / 2 - 20 - size / 2,
              width: size,
              height: size,
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              opacity: enter * fade,
              transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
            }}
          >
            {avatarUrl ? (
              <Img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <StarIcon size={64} />
            )}
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

function BurstRing({ color }: { color: string }) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const progress = interpolate(frame / fps, [burstAt, burstAt + 0.65], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const opacity = interpolate(frame / fps, [burstAt, burstAt + 0.1, burstAt + 0.65], [0, 0.18, 0], clamp)

  return (
    <div
      aria-hidden
      className="absolute rounded-full border-2"
      style={{
        left: width / 2 - 140,
        top: height / 2 - 160,
        width: 280,
        height: 280,
        borderColor: color,
        opacity,
        transform: `scale(${0.8 + progress * 3.8})`,
      }}
    />
  )
}

function RevealedTotal({ stars }: Pick<Props, 'stars'>) {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const revealFrame = (burstAt + 0.1) * fps
  const enter = spring({
    frame: frame - revealFrame,
    fps,
    durationInFrames: 0.55 * fps,
    config: { damping: 16, stiffness: 160 },
  })
  const opacity = interpolate(frame, [revealFrame, revealFrame + 0.16 * fps], [0, 1], clamp)
  const total = stars.toLocaleString('en-US', { useGrouping: true })
  const fontSize = Math.min(200, (width * 0.72) / (total.length * 0.64))

  return (
    <AbsoluteFill className="items-center justify-center">
      <div
        className="-mt-10 flex flex-col items-center gap-5"
        style={{
          opacity,
          transform: `translateY(${(1 - enter) * 24}px) scale(${0.88 + enter * 0.12})`,
        }}
      >
        <div
          className="font-extrabold leading-none tracking-tighter tabular-nums"
          style={{ fontSize }}
        >
          {total}
        </div>
        <div className="flex items-center gap-3 text-[28px] font-semibold uppercase tracking-[0.25em]">
          <StarIcon size={32} />
          <span>Total stars</span>
        </div>
        {stars === 0 && (
          <span className="mt-3 text-[24px] font-medium opacity-60">
            Your first stargazer is on the way.
          </span>
        )}
      </div>
    </AbsoluteFill>
  )
}

function StarIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#fbbf24"
      stroke="#d97706"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01Z" />
    </svg>
  )
}
