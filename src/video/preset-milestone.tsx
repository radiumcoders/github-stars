import { loadFont } from '@remotion/google-fonts/Inter'
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { withAlpha } from './color'
import { Props } from './schema'

// Milestone: the repository's GitHub icon blurs in, rises, and the
// "<repo> just reached N stars on GitHub." line resolves word by word while
// confetti cannons fire from both bottom corners. Icon and name come straight
// from GitHub (owner avatar + repository name).

const { fontFamily } = loadFont('normal', {
  weights: ['500', '700'],
  subsets: ['latin'],
})

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Timeline, in seconds.
const iconInEnd = 0.7
const riseStart = 0.95
const riseEnd = 1.45
const captionStart = 1.25
const headlineStart = 1.4
const burstAt = 1.6
const outStart = 3.45
const outEnd = 3.95

const iconSize = 176
const iconRestScale = 0.48
const iconRestY = 262
const piecesPerCannon = 110

export function MilestonePreset({
  user,
  userAvatarUrl,
  repository,
  stars,
  primaryColor,
  shaderColor,
  textColor,
}: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  // Everything blurs and fades out together at the end.
  const out = interpolate(t, [outStart, outEnd], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  })

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        color: textColor,
        backgroundColor: primaryColor,
        backgroundImage: `linear-gradient(180deg, ${withAlpha(textColor, 7)} 0%, ${withAlpha(textColor, 0)} 55%)`,
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 1 - out,
          filter: out > 0 ? `blur(${out * 14}px)` : undefined,
        }}
      >
        <Icon src={userAvatarUrl} alt={user} t={t} />
        <Caption repository={repository} t={t} />
        <Headline stars={stars} t={t} />
        <Confetti accent={shaderColor} t={t} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

function Icon({ src, alt, t }: { src: string; alt: string; t: number }) {
  const { height } = useVideoConfig()
  const enter = interpolate(t, [0, iconInEnd], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  })
  const rise = interpolate(t, [riseStart, riseEnd], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.65, 0, 0.25, 1),
  })

  // Enters from below, blurred and oversized, settles in the center, then
  // shrinks up into its resting spot above the text.
  const centerY = interpolate(rise, [0, 1], [height / 2, iconRestY])
  const y = centerY + (1 - enter) * 160
  const scale = interpolate(rise, [0, 1], [1, iconRestScale]) * (1.35 - 0.35 * enter)
  const blur = (1 - enter) * 28

  return (
    <div
      className="absolute left-1/2"
      style={{
        top: y - iconSize / 2,
        marginLeft: -iconSize / 2,
        width: iconSize,
        height: iconSize,
        opacity: Math.min(1, enter * 1.6),
        transform: `scale(${scale})`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
      }}
    >
      <Img
        src={src}
        alt={alt}
        className="size-full object-cover"
        style={{ borderRadius: iconSize * 0.24 }}
      />
    </div>
  )
}

// Word-by-word reveal: each word fades up out of a blur.
function Words({
  text,
  start,
  stagger,
  rise,
  t,
}: {
  text: string
  start: number
  stagger: number
  rise: number
  t: number
}) {
  return text.split(' ').map((word, i) => {
    const p = interpolate(t, [start + i * stagger, start + i * stagger + 0.4], [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    })
    return (
      <span
        key={i}
        className="inline-block whitespace-pre"
        style={{
          opacity: p,
          transform: `translateY(${(1 - p) * rise}px)`,
          filter: p < 0.99 ? `blur(${(1 - p) * 10}px)` : undefined,
        }}
      >
        {i > 0 ? ' ' : ''}
        {word}
      </span>
    )
  })
}

function Caption({ repository, t }: { repository: string; t: number }) {
  return (
    <div className="absolute inset-x-0 top-[322px] flex justify-center">
      <div className="max-w-[1000px] truncate text-[22px] font-medium opacity-55">
        <Words text={`${repository} just reached`} start={captionStart} stagger={0.06} rise={10} t={t} />
      </div>
    </div>
  )
}

function Headline({ stars, t }: { stars: number; t: number }) {
  const count = stars.toLocaleString('en-US')
  const noun = stars === 1 ? 'star' : 'stars'
  return (
    <div className="absolute inset-x-0 top-[360px] flex justify-center">
      <div className="text-[76px] font-bold leading-[1.15] tracking-[-0.03em] tabular-nums">
        <Words text={`${count} ${noun} on GitHub.`} start={headlineStart} stagger={0.08} rise={22} t={t} />
      </div>
    </div>
  )
}

// Two cannons in the bottom corners fire up and inwards; pieces then fall
// under gravity with air drag, flutter, and fade near the end of their life.
function Confetti({ accent, t }: { accent: string; t: number }) {
  const { width, height } = useVideoConfig()
  const elapsed = t - burstAt
  if (elapsed <= 0) return null

  const colors = [accent, accent, '#ffffff', '#fbbf24', '#ef4444', withAlpha(accent, 70)]
  const gravity = 900
  const drag = 1.6

  return (
    <AbsoluteFill>
      {[0, 1].flatMap((side) =>
        Array.from({ length: piecesPerCannon }, (_, i) => {
          const key = `${side}-${i}`
          // Small per-piece launch delay so the burst reads as a spray.
          const age = elapsed - random(`delay-${key}`) * 0.18
          if (age <= 0) return null

          const dir = side === 0 ? 1 : -1
          const angle = ((55 + random(`angle-${key}`) * 30) * Math.PI) / 180
          const speed = 900 + random(`speed-${key}`) * 900
          const vx = Math.cos(angle) * speed * dir
          const vy = -Math.sin(angle) * speed

          // Closed-form motion with linear drag.
          const k = (1 - Math.exp(-drag * age)) / drag
          const terminal = gravity / drag
          const x = (side === 0 ? -10 : width + 10) + vx * k
          const y = height + 20 + vy * k + terminal * (age - k)

          const size = 7 + random(`size-${key}`) * 8
          const shape = i % 3
          const rotate = random(`rot-${key}`) * 360 + age * (200 + random(`spin-${key}`) * 500) * dir
          const flutter = 0.2 + 0.8 * Math.abs(Math.sin(age * (6 + random(`flut-${key}`) * 8)))
          const life = 1.6 + random(`life-${key}`) * 0.6
          const opacity = interpolate(age, [life - 0.5, life], [1, 0], clamp)
          if (opacity <= 0) return null

          return (
            <div
              key={key}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: shape === 2 ? size * 0.4 : size,
                height: shape === 1 ? size * 0.4 : size * 0.6,
                backgroundColor: colors[i % colors.length],
                borderRadius: shape === 0 ? 1 : 2,
                opacity,
                transform: `rotate(${rotate}deg) scaleY(${flutter})`,
              }}
            />
          )
        }),
      )}
    </AbsoluteFill>
  )
}
