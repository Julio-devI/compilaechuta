interface Props {
  flip?: boolean
}

export function DecorativePanel({ flip = false }: Props) {
  return (
    <div
      className="hidden lg:block w-[45%] relative overflow-hidden shrink-0"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <img
        src="/Rectangle.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Glass rectangle */}
      <div
        className="absolute rounded-3xl"
        style={{
          top: '8%',
          left: '7%',
          width: '52%',
          aspectRatio: '1',
          background: 'rgba(30, 80, 220, 0.18)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          border: '1px solid rgba(255,255,255,0.20)',
          animation: 'glass-float 6s ease-in-out infinite',
          transform: 'rotate(15deg)',
        }}
      />

      {/* Rings */}
      <img
        src="/circulo.png"
        alt=""
        className="absolute drop-shadow-2xl"
        style={{ width: '60%', bottom: '-2%', left: '40%' }}
      />
    </div>
  )
}
