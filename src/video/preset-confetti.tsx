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

const confettiColors = [
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#facc15', // yellow
  '#a78bfa', // purple
  '#4ade80', // green
  '#fb923c', // orange
]
const confettiCount = 90
// Concentric elliptical rings: capacity, radii, and avatar size per ring.
// Rings fill inside-out; the last ring absorbs any remaining stargazers.
const orbitRings = [
  { capacity: 10, rx: 240, ry: 185, size: 84 },
  { capacity: 16, rx: 400, ry: 265, size: 68 },
  { capacity: 24, rx: 560, ry: 330, size: 56 },
]

export function ConfettiPreset({
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
    <AbsoluteFill style={{ color: textColor }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />
      <Confetti />
      <OrbitingAvatars stargazers={stargazers} />
      <CenterCount stars={stars} />
      <RepositoryInformation
        user={user}
        userAvatarUrl={userAvatarUrl}
        repository={repository}
      />
    </AbsoluteFill>
  )
}

function Confetti() {
  const frame = useCurrentFrame()
  const { width, height, durationInFrames } = useVideoConfig()

  return (
    <AbsoluteFill>
      {Array.from({ length: confettiCount }, (_, i) => {
        const x = random(`x-${i}`) * width
        const size = 8 + random(`size-${i}`) * 10
        const fallDuration = durationInFrames * (0.5 + random(`fall-${i}`) * 0.5)
        const delay = random(`delay-${i}`) * durationInFrames * 0.6
        const drift = (random(`drift-${i}`) - 0.5) * 200
        const color = confettiColors[i % confettiColors.length]
        const progress = (frame - delay) / fallDuration

        if (progress < 0) return null

        const y = interpolate(progress, [0, 1], [-40, height + 40])
        const rotate = random(`rot-${i}`) * 360 + frame * (2 + random(`spin-${i}`) * 6)
        // Fake 3D tumble by squashing width over time.
        const squash = Math.sin(frame / (4 + random(`sq-${i}`) * 6) + i)

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: x + drift * progress,
              top: y,
              width: size,
              height: size * 0.6,
              backgroundColor: color,
              transform: `rotate(${rotate}deg) scaleX(${squash})`,
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}

function OrbitingAvatars({ stargazers }: { stargazers: Props['stargazers'] }) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const centerX = width / 2
  const centerY = height / 2 - 20

  // Assign every stargazer to a ring, filling inside-out; overflow goes to
  // the outermost ring.
  const ringAvatars: { avatarUrl: string; index: number }[][] = orbitRings.map(
    () => [],
  )
  stargazers.forEach((avatarUrl, index) => {
    let remaining = index
    let ring = orbitRings.length - 1
    for (let r = 0; r < orbitRings.length; r++) {
      if (remaining < orbitRings[r].capacity) {
        ring = r
        break
      }
      remaining -= orbitRings[r].capacity
    }
    ringAvatars[ring].push({ avatarUrl, index })
  })

  return (
    <AbsoluteFill>
      {ringAvatars.flatMap((avatars, ring) => {
        const { rx, ry, size } = orbitRings[ring]
        // Alternate direction per ring, slower on the outside.
        const rotation = frame * 0.008 * (ring % 2 === 0 ? 1 : -1) / (ring + 1)

        return avatars.map(({ avatarUrl, index }, i) => {
          const angle =
            (i / avatars.length) * Math.PI * 2 - Math.PI / 2 + rotation
          // One-by-one entrance: each avatar pops in place on its ring.
          const enter = spring({
            frame: frame - index * 3,
            fps,
            config: { damping: 11 },
          })
          const x = centerX + Math.cos(angle) * rx
          const y = centerY + Math.sin(angle) * ry

          return (
            <Img
              key={index}
              src={avatarUrl}
              width={size}
              height={size}
              className="absolute rounded-full shadow-lg border-4 border-white"
              style={{
                left: x - size / 2,
                top: y - size / 2,
                transform: `scale(${enter})`,
              }}
            />
          )
        })
      })}
    </AbsoluteFill>
  )
}

function CenterCount({ stars }: { stars: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const landFrame = animationDurationInSeconds * fps

  const starsToDisplay = Math.round(
    interpolate(frame, [0, landFrame], [0, stars], {
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.5, 1, 0.5, 1),
    }),
  )

  const enter = spring({ frame, fps, config: { damping: 12 } })
  // Pop when the counter lands on the final number.
  const pop = spring({
    frame: frame - landFrame,
    fps,
    config: { damping: 7, stiffness: 180 },
  })
  const scale = frame < landFrame ? enter : 1 + 0.18 * (1 - pop)

  return (
    <AbsoluteFill className="items-center justify-center">
      <div
        className="flex flex-col items-center -mt-16"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="text-[150px] leading-none font-extrabold tabular-nums drop-shadow-sm">
          {starsToDisplay.toLocaleString('en-US', { useGrouping: true })}
        </div>
        <div className="text-[40px] font-bold uppercase tracking-[0.3em] text-amber-500">
          ⭐ stars ⭐
        </div>
      </div>
    </AbsoluteFill>
  )
}

function RepositoryInformation({
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
  const enter = spring({ frame: frame - 10, fps, config: { damping: 14 } })

  return (
    <div
      className="absolute bottom-0 inset-x-0 flex justify-center pb-12"
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 40}px)`,
      }}
    >
      {/* Pill is always a white box, so it keeps its own dark text. */}
      <div className="flex items-center gap-4 rounded-full bg-white border border-gray-200 shadow-xl px-8 py-3 text-[44px] text-gray-800">
        <Img
          src={userAvatarUrl}
          alt={user}
          className="rounded-full w-[1.4em] h-[1.4em]"
        />
        <span>
          {user}
          <span className="opacity-40 mx-[0.2em]">/</span>
          <strong>{repository}</strong>
        </span>
      </div>
    </div>
  )
}
