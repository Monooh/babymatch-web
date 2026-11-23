'use client'
import { useEffect, useRef } from 'react'

/** A silent looping capture. It only plays while on screen, and waits for a tap when the reader asked for less motion. */
export function Clip({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { v.controls = true; return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.35 })
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return (
    <video ref={ref} className="keep-motion" muted loop playsInline preload="none" poster={poster} width={540} height={1168} aria-label={label}>
      <source src={src} type="video/mp4" />
    </video>
  )
}
