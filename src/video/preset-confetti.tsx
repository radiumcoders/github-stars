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

const confettiColors = [
  '#f472b6', // pink
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb923c', // orange
]
const confettiCount = 70
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
    <AbsoluteFill className="font-light" style={{ color: textColor, fontFamily }}>
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
        const baseX = random(`x-${i}`) * width
        const size = 9 + random(`size-${i}`) * 9
        // Bigger pieces fall faster for a hint of depth.
        const cycle = durationInFrames * (1.6 - (size - 9) / 9 * 0.5)
        const phase = random(`phase-${i}`)
        // Particles are spread through the whole fall cycle, so the air is
        // already full of confetti on frame one; the wrap happens off-screen.
        const progress = (frame / cycle + phase) % 1
        const y = interpolate(progress, [0, 1], [-60, height + 60])
        const sway =
          Math.sin(frame * (0.02 + random(`sway-${i}`) * 0.02) + phase * 7) *
          (20 + random(`amp-${i}`) * 30)
        const rotate = phase * 360 + frame * (0.8 + random(`spin-${i}`) * 1.6)
        // Slow tumble: squashing width reads as a piece turning in 3D.
        const tumble =
          0.25 + 0.75 * Math.abs(Math.sin(frame * 0.04 + phase * 11))
        const color = confettiColors[i % confettiColors.length]
        const shape = i % 3

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: baseX + sway,
              top: y,
              width: shape === 2 ? size * 0.45 : size,
              height: shape === 1 ? size : size * 0.62,
              backgroundColor: color,
              borderRadius: shape === 1 ? '50%' : 2,
              opacity: 0.85,
              transform: `rotate(${rotate}deg) scaleX(${tumble})`,
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
        const rotation = (frame * 0.006 * (ring % 2 === 0 ? 1 : -1)) / (ring + 1)

        return avatars.map(({ avatarUrl, index }, i) => {
          const angle =
            (i / avatars.length) * Math.PI * 2 - Math.PI / 2 + rotation
          // One-by-one entrance: each avatar pops in place on its ring,
          // starting after the count has appeared.
          const enter = spring({
            frame: frame - 12 - index * 2,
            fps,
            config: { damping: 12 },
          })
          const x = centerX + Math.cos(angle) * rx
          const y = centerY + Math.sin(angle) * ry

          return (
            <Img
              key={index}
              src={avatarUrl}
              width={size}
              height={size}
              className="absolute rounded-full border-[3px] border-white shadow-md"
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

  const enter = spring({ frame, fps, config: { damping: 14 } })
  // Gentle pop when the counter lands on the final number.
  const pop = spring({
    frame: frame - landFrame,
    fps,
    config: { damping: 9, stiffness: 160 },
  })
  const scale = frame < landFrame ? enter : 1 + 0.1 * (1 - pop)

  return (
    <AbsoluteFill className="items-center justify-center">
      <div
        className="flex flex-col items-center -mt-16"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="text-[150px] leading-none font-light tracking-tight tabular-nums">
          {starsToDisplay.toLocaleString('en-US', { useGrouping: true })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <StarIcon size={30} />
          <span className="text-[28px] font-light uppercase tracking-[0.35em] opacity-60">
            Stars
          </span>
          <StarIcon size={30} />
        </div>
      </div>
    </AbsoluteFill>
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
  const enter = spring({ frame: frame - 8, fps, config: { damping: 200 } })

  return (
    <div
      className="absolute bottom-0 inset-x-0 flex justify-center pb-10"
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 30}px)`,
      }}
    >
      {/* Pill is always a white box, so it keeps its own dark text. */}
      <div className="flex items-center gap-3 rounded-full bg-white border border-gray-100 shadow-lg px-7 py-3 text-[34px] font-light text-gray-800">
        <Img
          src={userAvatarUrl}
          alt={user}
          className="rounded-full w-[1.3em] h-[1.3em]"
        />
        <span>
          {user}
          <span className="mx-[0.2em] opacity-40">/</span>
          <span className="font-normal">{repository}</span>
        </span>
      </div>
    </div>
  )
}
