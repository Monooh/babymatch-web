import type { CSSProperties, ReactNode } from 'react'

// Seeded value noise → a ragged clip-path, so a band reads as a torn sheet of paper.
function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function edge(seed: number, steps: number, depth: number): number[] {
  const r = rng(seed)
  const out: number[] = []
  let y = r() * depth
  for (let i = 0; i <= steps; i++) {
    y = Math.max(0, Math.min(depth, y + (r() - 0.5) * depth * 0.9))
    out.push(Math.round((i % 5 === 0 ? y * 0.5 + r() * depth * 0.5 : y) * 10) / 10)
  }
  return out
}
export function tornPath(seed: number, opts: { top?: boolean; bottom?: boolean; depth?: number; steps?: number } = {}): string {
  const { top = true, bottom = true, depth = 12, steps = 56 } = opts
  const pts: string[] = []
  const t = top ? edge(seed, steps, depth) : null
  const b = bottom ? edge(seed + 97, steps, depth) : null
  for (let i = 0; i <= steps; i++) pts.push(`${((i / steps) * 100).toFixed(2)}% ${t ? t[i] + 'px' : '0'}`)
  for (let i = steps; i >= 0; i--) pts.push(`${((i / steps) * 100).toFixed(2)}% ${b ? `calc(100% - ${b[i]}px)` : '100%'}`)
  return `polygon(${pts.join(',')})`
}

export function Torn({ seed, className = '', top = true, bottom = true, depth, children, style }: {
  seed: number; className?: string; top?: boolean; bottom?: boolean; depth?: number; children?: ReactNode; style?: CSSProperties
}) {
  return (
    <div className={`torn ${className}`} style={style}>
      <i className="torn-fringe" aria-hidden="true" style={{ clipPath: tornPath(seed + 1, { top, bottom, depth }) }} />
      <i className="torn-sheet" aria-hidden="true" style={{ clipPath: tornPath(seed, { top, bottom, depth }) }} />
      {children ? <div className="torn-body">{children}</div> : null}
    </div>
  )
}
