import { useEffect, useState } from 'react'

type Phase = 'spinner' | 'logo' | 'tagline' | 'out'

interface Props {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('spinner')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'),    1000)
    const t2 = setTimeout(() => setPhase('tagline'), 2000)
    const t3 = setTimeout(() => setPhase('out'),     3200)
    const t4 = setTimeout(() => onDone(),            3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundImage: 'url("/Rectangle.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        opacity: phase === 'out' ? 0 : 1,
        transition: 'opacity 450ms ease',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          position: 'absolute',
          opacity: phase === 'spinner' ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      >
        <img
          src="/loading.png"
          alt=""
          className="w-14 h-14"
          style={{ animation: 'spin 0.9s linear infinite' }}
        />
      </div>

      {/* Logo + tagline */}
      <div
        className="flex flex-col items-center gap-3"
        style={{
          opacity: phase === 'logo' || phase === 'tagline' ? 1 : 0,
          transition: 'opacity 350ms ease',
        }}
      >
        <img src="/Frame 333.png" alt="VCommerce" className="h-20" />
        <img
          src="/Visão que transforma..png"
          alt="Visão que transforma."
          className="h-8 mt-1"
          style={{
            opacity: phase === 'tagline' ? 1 : 0,
            transition: 'opacity 350ms ease',
          }}
        />
      </div>
    </div>
  )
}
