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

const chart = { left: 96, right: 1184, top: 330, bottom: 620 }
const drawStartAt = 0.35
const drawEndAt = 2.3
const sampleCount = 240
const pileSize = 44
const pileCount = 5

type Point = { x: number; y: number }

export function HistoryPreset({
  user,
  userAvatarUrl,
  repository,
  stargazers,
  stars,
  starHistory,
  primaryColor,
  shaderColor,
  textColor,
}: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const seconds = frame / fps
  const { samples, startLabel } = buildCurve(starHistory, stars)
  const progress = interpolate(seconds, [drawStartAt, drawEndAt], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  })
  const visible = samples.slice(0, Math.max(2, Math.ceil(progress * sampleCount) + 1))
  const tip = visible[visible.length - 1]
  const count = Math.round(tip.stars)
  const header = spring({ frame, fps, config: { damping: 200 } })

  return (
    <AbsoluteFill style={{ fontFamily, color: textColor }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />

      <div
        className="absolute left-24 top-[72px] flex max-w-[1000px] items-center gap-3 text-[28px]"
        style={{ opacity: header, transform: `translateY(${(1 - header) * 12}px)` }}
      >
        <Img src={userAvatarUrl} alt={user} className="size-10 shrink-0 rounded-full" />
        <span className="truncate">
          <span className="opacity-60">{user}</span>
          <span className="mx-2 opacity-30">/</span>
          <span className="font-semibold">{repository}</span>
        </span>
      </div>

      <div
        className="absolute left-24 top-[136px] flex items-baseline gap-4"
        style={{ opacity: header }}
      >
        <span className="text-[128px] font-extrabold leading-none tracking-tighter tabular-nums">
          {count.toLocaleString('en-US')}
        </span>
        <span className="text-[40px] font-medium opacity-40">
          {stars === 1 ? 'star' : 'stars'}
        </span>
      </div>

      <Chart
        visible={visible}
        tip={tip}
        progress={progress}
        startLabel={startLabel}
        textColor={textColor}
      />

      <RecentPile stargazers={stargazers} tip={samples[samples.length - 1]} textColor={textColor} />
    </AbsoluteFill>
  )
}

function Chart({
  visible,
  tip,
  progress,
  startLabel,
  textColor,
}: {
  visible: (Point & { stars: number })[]
  tip: Point
  progress: number
  startLabel: string | null
  textColor: string
}) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const line = visible
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${tip.x.toFixed(1)} ${chart.bottom} L${chart.left} ${chart.bottom} Z`
  const labels = interpolate(frame / fps, [0.2, 0.6], [0, 1], clamp)
  const tipVisible = progress > 0 ? 1 : 0

  return (
    <>
      <svg
        aria-hidden
        className="absolute inset-0"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="history-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fbbf24" stopOpacity={0.28} />
            <stop offset="1" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
        </defs>
        <line
          x1={chart.left}
          x2={chart.right}
          y1={chart.bottom}
          y2={chart.bottom}
          stroke={textColor}
          strokeOpacity={0.12}
          strokeWidth={2}
        />
        <path d={area} fill="url(#history-area)" />
        <path
          d={line}
          fill="none"
          stroke={textColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={tip.x}
          cy={tip.y}
          r={11}
          fill="#fbbf24"
          stroke={withAlpha('#ffffff', 100)}
          strokeWidth={4}
          opacity={tipVisible}
        />
      </svg>
      <div
        className="absolute flex justify-between text-[20px] font-medium"
        style={{
          left: chart.left,
          width: chart.right - chart.left,
          top: chart.bottom + 18,
          opacity: labels * 0.45,
        }}
      >
        <span>{startLabel ?? ''}</span>
        <span>Today</span>
      </div>
    </>
  )
}

// The newest stargazers gather beside the finished line.
function RecentPile({
  stargazers,
  tip,
  textColor,
}: {
  stargazers: Props['stargazers']
  tip: Point
  textColor: string
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const recent = stargazers.slice(-pileCount).reverse()
  if (recent.length === 0) return null
  const overlap = 14
  const pileWidth = recent.length * pileSize - (recent.length - 1) * overlap

  return (
    <div
      className="absolute flex"
      style={{ left: tip.x - pileWidth + 8, top: tip.y - pileSize - 30 }}
    >
      {recent.map((avatarUrl, i) => {
        const enter = spring({
          frame: frame - (drawEndAt - 0.1 + i * 0.06) * fps,
          fps,
          config: { damping: 14, stiffness: 180 },
        })
        return (
          <Img
            key={i}
            src={avatarUrl}
            alt=""
            className="shrink-0 rounded-full"
            style={{
              width: pileSize,
              height: pileSize,
              marginLeft: i === 0 ? 0 : -overlap,
              boxShadow: `0 0 0 3px #ffffff, 0 4px 10px ${withAlpha(textColor, 18)}`,
              opacity: Math.min(1, enter * 1.5),
              transform: `translateY(${(1 - enter) * 16}px) scale(${0.6 + enter * 0.4})`,
              zIndex: recent.length - i,
            }}
          />
        )
      })}
    </div>
  )
}

// Turns [timestamp, stars] samples into evenly spaced screen points along
// a monotone curve (so it never dips below a real value). Without history,
// falls back to a plain rising curve with no date label.
function buildCurve(history: Props['starHistory'], stars: number) {
  const real = history.length >= 2
  const raw: [number, number][] = real
    ? [[history[0][0], 0], ...history]
    : [
        [0, 0],
        [0.5, stars * 0.22],
        [0.8, stars * 0.55],
        [1, stars],
      ]
  const t0 = raw[0][0]
  const t1 = raw[raw.length - 1][0]
  const maxStars = Math.max(1, ...raw.map(([, s]) => s))
  const xs = raw.map(([t]) => (t1 === t0 ? 0 : (t - t0) / (t1 - t0)))
  const ys = raw.map(([, s]) => s)
  const curve = monotoneCubic(xs, ys)

  const samples = Array.from({ length: sampleCount + 1 }, (_, i) => {
    const u = i / sampleCount
    const value = Math.max(0, curve(u))
    return {
      x: chart.left + u * (chart.right - chart.left),
      y: chart.bottom - (value / maxStars) * (chart.bottom - chart.top),
      stars: value,
    }
  })
  // The count must land exactly on the real total.
  samples[sampleCount].stars = stars

  const startLabel = real
    ? new Date(history[0][0]).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null
  return { samples, startLabel }
}

// Fritsch–Carlson monotone cubic interpolation.
function monotoneCubic(xs: number[], ys: number[]) {
  const n = xs.length
  const dx = xs.slice(1).map((x, i) => Math.max(1e-9, x - xs[i]))
  const slope = ys.slice(1).map((y, i) => (y - ys[i]) / dx[i])
  const tangent = new Array<number>(n)
  tangent[0] = slope[0]
  tangent[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    tangent[i] =
      slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0
      tangent[i + 1] = 0
      continue
    }
    const a = tangent[i] / slope[i]
    const b = tangent[i + 1] / slope[i]
    const h = a * a + b * b
    if (h > 9) {
      const t = 3 / Math.sqrt(h)
      tangent[i] = t * a * slope[i]
      tangent[i + 1] = t * b * slope[i]
    }
  }
  return (x: number) => {
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const h = dx[i]
    const t = Math.min(1, Math.max(0, (x - xs[i]) / h))
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * tangent[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * tangent[i + 1]
    )
  }
}
