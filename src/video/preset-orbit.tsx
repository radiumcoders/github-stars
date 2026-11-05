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
import { withAlpha } from './color'
import { FluidBackground } from './fluid-background'
import { Props } from './schema'

const { fontFamily } = loadFont('normal', {
  weights: ['400', '500', '600', '800'],
  subsets: ['latin'],
})

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const rings = [
  { rx: 320, ry: 172, capacity: 8, size: 64, speed: 0.32 },
  { rx: 530, ry: 286, capacity: 14, size: 52, speed: -0.2 },
]
const revealAt = 1.6

export function OrbitPreset({
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
  const { fps, width, height } = useVideoConfig()
  const seconds = frame / fps
  const cx = width / 2
  const cy = height / 2
  // Rings widen slightly to make room once the count arrives.
  const widen = 1 + 0.07 * interpolate(seconds, [revealAt - 0.1, revealAt + 0.6], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  })
  const ringsIn = interpolate(seconds, [0, 0.5], [0, 1], clamp)
  const recent = stargazers.slice(-(rings[0].capacity + rings[1].capacity)).reverse()

  // Newest stargazers fill the inner ring first; with no avatars, both
  // rings carry small star dots instead.
  const orbiters = rings.flatMap((ring, r) => {
    const start = r === 0 ? 0 : rings[0].capacity
    const slice: (string | null)[] =
      recent.length > 0
        ? recent.slice(start, start + ring.capacity)
        : Array<null>(ring.capacity).fill(null)
    return slice.map((avatarUrl, i) => ({ avatarUrl, ring, r, i, count: slice.length }))
  })

  return (
    <AbsoluteFill style={{ fontFamily, color: textColor, overflow: 'hidden' }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />
      <svg
        aria-hidden
        className="absolute inset-0"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {rings.map((ring, r) => (
          <ellipse
            key={r}
            cx={cx}
            cy={cy}
            rx={ring.rx * widen}
            ry={ring.ry * widen}
            fill="none"
            stroke={textColor}
            strokeOpacity={0.09 * ringsIn}
            strokeWidth={2}
          />
        ))}
      </svg>
      {orbiters.map(({ avatarUrl, ring, r, i, count }) => {
        const delay = 0.1 + r * 0.25 + i * 0.04
        const enter = spring({
          frame: frame - delay * fps,
          fps,
          durationInFrames: 0.7 * fps,
          config: { damping: 18, stiffness: 120 },
        })
        const angle =
          (i / count) * Math.PI * 2 +
          random(`orbit-${r}`) * Math.PI +
          seconds * ring.speed
        // Each avatar spirals out from the centre onto its ring.
        const reach = enter * widen
        const x = cx + Math.cos(angle) * ring.rx * reach
        const y = cy + Math.sin(angle) * ring.ry * reach
        // Front of the orbit (bottom) is a touch larger than the back.
        const depth = 0.86 + 0.14 * (Math.sin(angle) + 1) / 2
        const size = (avatarUrl ? ring.size : 14) * depth

        return (
          <div
            key={`${r}-${i}`}
            className="absolute overflow-hidden rounded-full"
            style={{
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              backgroundColor: avatarUrl ? textColor : '#fbbf24',
              boxShadow: avatarUrl
                ? `0 0 0 3px #ffffff, 0 6px 16px ${withAlpha(textColor, 14)}`
                : undefined,
              opacity: Math.min(1, enter * 1.4) * (0.75 + 0.25 * depth),
            }}
          >
            {avatarUrl ? <Img src={avatarUrl} alt="" className="size-full object-cover" /> : null}
          </div>
        )
      })}
      <Center
        user={user}
        userAvatarUrl={userAvatarUrl}
        repository={repository}
        stars={stars}
        textColor={textColor}
      />
    </AbsoluteFill>
  )
}

function Center({
  user,
  userAvatarUrl,
  repository,
  stars,
  textColor,
}: Pick<Props, 'user' | 'userAvatarUrl' | 'repository' | 'stars' | 'textColor'>) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const seconds = frame / fps
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 160 } })
  const reveal = spring({
    frame: frame - revealAt * fps,
    fps,
    durationInFrames: 0.7 * fps,
    config: { damping: 200 },
  })
  const count = Math.round(
    interpolate(seconds, [revealAt, revealAt + 0.9], [0, stars], {
      ...clamp,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  )
  const total = stars.toLocaleString('en-US')
  const fontSize = Math.min(136, 430 / (total.length * 0.6))
  // The owner's avatar starts large at the centre, then steps aside.
  const avatarSize = 132 - reveal * 76

  return (
    <AbsoluteFill className="items-center justify-center">
      <div className="flex flex-col items-center">
        <Img
          src={userAvatarUrl}
          alt={user}
          className="shrink-0 rounded-full"
          style={{
            width: avatarSize,
            height: avatarSize,
            boxShadow: `0 0 0 4px #ffffff, 0 10px 30px ${withAlpha(textColor, 18)}`,
            transform: `scale(${pop})`,
          }}
        />
        <div
          className="overflow-hidden"
          style={{ height: reveal * (fontSize + 64), opacity: reveal }}
        >
          <div className="mt-4 flex flex-col items-center">
            <span
              className="font-extrabold leading-none tracking-tighter tabular-nums"
              style={{ fontSize }}
            >
              {count.toLocaleString('en-US')}
            </span>
            <span className="mt-3 max-w-[400px] truncate text-[24px]">
              <span className="opacity-60">{stars === 1 ? 'star on' : 'stars on'} </span>
              <span className="font-semibold">{repository}</span>
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
