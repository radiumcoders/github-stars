import { loadFont } from '@remotion/google-fonts/Inter'
import {
  AbsoluteFill,
  Img,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { withAlpha } from './color'
import { FluidBackground } from './fluid-background'
import { Props } from './schema'

const { fontFamily } = loadFont('normal', {
  weights: ['400', '500', '600'],
  subsets: ['latin'],
})

// 5×7 dot-matrix glyphs; every lit cell holds a stargazer's face.
const glyphs: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ',': ['..', '..', '..', '..', '..', '.#', '#.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
}

// Dot matrices stop reading as numbers past ~5 glyphs, so big totals are
// drawn compact (12.3K, 1.2M) and the exact figure goes in the caption.
function matrixText(stars: number) {
  if (stars < 10_000) return { text: String(stars), compact: false }
  const [value, suffix] =
    stars >= 1_000_000 ? [stars / 1_000_000, 'M'] : [stars / 1_000, 'K']
  const digits = value >= 100 ? 0 : 1
  const rounded = Math.floor(value * 10 ** digits) / 10 ** digits
  return { text: `${rounded.toFixed(digits).replace(/\.0$/, '')}${suffix}`, compact: true }
}

const rows = 7
const maxWidth = 1120
const maxHeight = 430
const sweepStartAt = 0.15
const sweepEndAt = 1.6

type Cell = { col: number; row: number; on: boolean }

function layout(text: string) {
  const cells: Cell[] = []
  let col = 0
  text.split('').forEach((char, i) => {
    const glyph = glyphs[char] ?? glyphs['0']
    glyph.forEach((line, row) =>
      line.split('').forEach((c, x) => cells.push({ col: col + x, row, on: c === '#' })),
    )
    col += glyph[0].length + (i < text.length - 1 ? 1 : 0)
  })
  return { cells, cols: col }
}

export function MosaicPreset({
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
  const { text, compact } = matrixText(stars)
  const { cells, cols } = layout(text)
  const cell = Math.min(maxWidth / cols, maxHeight / rows)
  const gridWidth = cols * cell
  const gridHeight = rows * cell
  const captionHeight = 64
  const top = (height - gridHeight - captionHeight) / 2
  const left = (width - gridWidth) / 2
  const lit = cells.filter((c) => c.on)
  // Shuffle faces deterministically so repeats don't cluster.
  const order = lit
    .map((_, i) => i)
    .sort((a, b) => random(`mosaic-order-${a}`) - random(`mosaic-order-${b}`))
  const caption = spring({
    frame: frame - (sweepEndAt + 0.1) * fps,
    fps,
    config: { damping: 200 },
  })

  return (
    <AbsoluteFill style={{ fontFamily, color: textColor }}>
      <FluidBackground primaryColor={primaryColor} shaderColor={shaderColor} />
      {cells.map((c, i) => {
        const x = left + c.col * cell + cell / 2
        const y = top + c.row * cell + cell / 2
        if (!c.on) {
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: x - 3,
                top: y - 3,
                width: 6,
                height: 6,
                backgroundColor: withAlpha(textColor, 7),
              }}
            />
          )
        }
        const litIndex = lit.indexOf(c)
        const avatarUrl =
          stargazers.length > 0
            ? stargazers[order[litIndex] % stargazers.length]
            : null
        // A diagonal sweep from top-left to bottom-right.
        const sweep = (c.col / Math.max(1, cols - 1)) * 0.8 + (c.row / (rows - 1)) * 0.2
        const enter = spring({
          frame: frame - (sweepStartAt + sweep * (sweepEndAt - sweepStartAt)) * fps,
          fps,
          durationInFrames: 0.5 * fps,
          config: { damping: 13, stiffness: 190 },
        })
        const size = cell * 0.9
        return (
          <div
            key={i}
            className="absolute overflow-hidden rounded-full"
            style={{
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              backgroundColor: textColor,
              opacity: Math.min(1, enter * 1.5),
              transform: `scale(${enter})`,
            }}
          >
            {avatarUrl ? (
              <Img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : null}
            {/* A thin ink ring on top keeps pale avatars from vanishing
                into the background, so every digit stays legible. */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: `inset 0 0 0 ${Math.max(2, cell * 0.045)}px ${withAlpha(textColor, 85)}`,
              }}
            />
          </div>
        )
      })}
      <div
        className="absolute inset-x-16 flex items-center justify-center gap-3 text-[28px]"
        style={{
          top: top + gridHeight + 28,
          opacity: caption,
          transform: `translateY(${(1 - caption) * 10}px)`,
        }}
      >
        <Img src={userAvatarUrl} alt={user} className="size-9 shrink-0 rounded-full" />
        <span className="truncate">
          <span className="opacity-60">
            {compact ? `${stars.toLocaleString('en-US')} stars on ` : ''}
            {user}
          </span>
          <span className="mx-2 opacity-30">/</span>
          <span className="font-semibold">{repository}</span>
        </span>
      </div>
    </AbsoluteFill>
  )
}
