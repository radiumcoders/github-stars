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
import { withAlpha } from './color'
import { FluidBackground } from './fluid-background'
import { Props } from './schema'

const { fontFamily } = loadFont('normal', {
  weights: ['400', '500', '600', '800'],
  subsets: ['latin'],
})

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const avatarSize = 120
const gap = 24
const pitch = avatarSize + gap
const rowCount = 6
const rowSpeeds = [58, -84, 70, -62, 90, -54] // px per second; sign is direction
const tilt = -5
const partAt = 1.25
const partDistance = 140
const stripWidth = 1700

export function MarqueePreset({
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
  const { fps, height } = useVideoConfig()
  const seconds = frame / fps
  const part = interpolate(seconds, [partAt, partAt + 0.7], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  })
  const blockHeight = rowCount * avatarSize + (rowCount - 1) * gap
  const blockTop = (height - blockHeight) / 2

  return (
    <AbsoluteFill style={{ fontFamily, color: textColor, overflow: 'hidden' }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />
      <AbsoluteFill style={{ transform: `rotate(${tilt}deg) scale(1.08)` }}>
        {Array.from({ length: rowCount }, (_, row) => (
          <Row
            key={row}
            row={row}
            top={
              blockTop +
              row * pitch +
              (row < rowCount / 2 ? -1 : 1) * part * partDistance
            }
            stargazers={stargazers}
            textColor={textColor}
          />
        ))}
      </AbsoluteFill>
      <Reveal
        user={user}
        userAvatarUrl={userAvatarUrl}
        repository={repository}
        stars={stars}
      />
    </AbsoluteFill>
  )
}

function Row({
  row,
  top,
  stargazers,
  textColor,
}: {
  row: number
  top: number
  stargazers: Props['stargazers']
  textColor: string
}) {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const seconds = frame / fps
  const tokens = stargazers.length > 0 ? stargazers : [null]
  const itemCount = Math.ceil(stripWidth / pitch) + 6
  // Each row starts at a different point in the list so rows don't mirror.
  const items = Array.from(
    { length: itemCount },
    (_, i) => tokens[(i + row * 7) % tokens.length],
  )
  const speed = rowSpeeds[row % rowSpeeds.length]
  const travel = (seconds * speed) % pitch
  const enter = interpolate(seconds, [0, 0.35], [0, 1], clamp)

  return (
    <div
      className="absolute flex"
      style={{
        top,
        left: (width - stripWidth) / 2 - pitch * 3 + travel,
        gap,
        opacity: enter,
      }}
    >
      {items.map((avatarUrl, i) =>
        avatarUrl ? (
          <Img
            key={i}
            src={avatarUrl}
            alt=""
            className="shrink-0 rounded-full"
            style={{
              width: avatarSize,
              height: avatarSize,
              boxShadow: `0 0 0 1px ${withAlpha(textColor, 8)}`,
            }}
          />
        ) : (
          <div
            key={i}
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: avatarSize,
              height: avatarSize,
              backgroundColor: withAlpha(textColor, 5),
            }}
          >
            <StarIcon size={36} />
          </div>
        ),
      )}
    </div>
  )
}

function Reveal({
  user,
  userAvatarUrl,
  repository,
  stars,
}: Pick<Props, 'user' | 'userAvatarUrl' | 'repository' | 'stars'>) {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const enter = spring({
    frame: frame - (partAt + 0.3) * fps,
    fps,
    durationInFrames: 0.7 * fps,
    config: { damping: 200 },
  })
  const total = stars.toLocaleString('en-US')
  const fontSize = Math.min(168, (width * 0.7) / ((total.length + 3) * 0.6))

  return (
    <AbsoluteFill className="items-center justify-center">
      <div
        className="flex flex-col items-center"
        style={{ opacity: enter, transform: `scale(${0.94 + enter * 0.06})` }}
      >
        <div className="flex items-baseline gap-5 leading-none">
          <span
            className="font-extrabold tracking-tighter tabular-nums"
            style={{ fontSize }}
          >
            {total}
          </span>
          <span className="font-medium opacity-40" style={{ fontSize: fontSize * 0.3 }}>
            {stars === 1 ? 'star' : 'stars'}
          </span>
        </div>
        <div className="mt-5 flex max-w-[900px] items-center gap-3 text-[26px]">
          <Img src={userAvatarUrl} alt={user} className="size-8 shrink-0 rounded-full" />
          <span className="truncate">
            <span className="opacity-60">{user}</span>
            <span className="mx-2 opacity-30">/</span>
            <span className="font-semibold">{repository}</span>
          </span>
        </div>
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
