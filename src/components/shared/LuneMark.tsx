import { Sparkle } from 'lucide-react'

/**
 * Lune brand mark: a gradient crescent with two sparkles, laid out on a 64-unit grid and scaled to `size` px.
 * src/app/icon.svg draws the same crescent; keep the two in sync.
 */
export function LuneMark({ size = 64, className }: { size?: number; className?: string }) {
  const u = size / 64
  // Moon is 48 units at (8, 8); the cut-out is a 36-unit circle centred at (35, 22) of the moon.
  const mask = `radial-gradient(circle at ${35 * u}px ${22 * u}px, transparent ${17.5 * u}px, #000 ${18 * u}px)`

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} aria-hidden="true">
      {/* Masked rather than covered with a background-coloured disc, so it works on any background. */}
      <div
        className="absolute rounded-full bg-gradient-to-br from-[#9a8cff] via-[#725ff3] to-[#aa54ff]"
        style={{ inset: 8 * u, maskImage: mask, WebkitMaskImage: mask }}
      />
      <Sparkle
        className="absolute text-[#907cff]"
        style={{ right: 4 * u, top: 8 * u, width: 14 * u, height: 14 * u }}
        strokeWidth={2}
      />
      <Sparkle
        className="absolute text-[#a775ff]"
        style={{ right: 8 * u, top: 28 * u, width: 10 * u, height: 10 * u }}
        strokeWidth={2}
      />
    </div>
  )
}
