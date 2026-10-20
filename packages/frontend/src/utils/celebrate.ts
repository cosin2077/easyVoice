import confetti from 'canvas-confetti'

/**
 * Confetti burst from an element. Scaled to the viewport so it stays a short accent on
 * phones instead of covering the whole screen, and skipped for reduced-motion users.
 * The canvas is pointer-events:none, so it never blocks taps.
 */
export function celebrate(from: Element | null | undefined, particles = 100) {
  const rect = from?.getBoundingClientRect()
  if (!rect) return
  const small = window.innerWidth < 640
  confetti({
    particleCount: Math.round(small ? particles * 0.35 : particles),
    spread: 360,
    startVelocity: small ? 22 : 30,
    ticks: small ? 120 : 200,
    scalar: small ? 0.8 : 1,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    zIndex: 40,
    disableForReducedMotion: true,
  })
}
