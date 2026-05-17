import { useEffect, useState } from 'react'

export function useRotatingPlaceholder(
  texts: string[],
  displayMs: number = 7000,
  fadeMs: number = 500,
): { text: string; opacity: number } {
  const [index, setIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (texts.length <= 1) return

    let cancelled = false
    let isFirstCycle = true
    const timers: number[] = []

    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        if (cancelled) return
        fn()
      }, delay)
      timers.push(id)
    }

    const queueCycle = () => {
      const visibleDelay = isFirstCycle ? displayMs : displayMs + fadeMs
      isFirstCycle = false

      schedule(() => {
        setOpacity(0)
        schedule(() => {
          setIndex(prev => (prev + 1) % texts.length)
          schedule(() => {
            setOpacity(1)
            queueCycle()
          }, 50)
        }, fadeMs)
      }, visibleDelay)
    }

    queueCycle()

    return () => {
      cancelled = true
      timers.forEach(id => window.clearTimeout(id))
    }
  }, [texts, displayMs, fadeMs])

  return { text: texts[index] ?? '', opacity }
}

export const AGENT_PLACEHOLDERS: string[] = [
  'Pergunte ao V-Commerce Agent...',
  'Sem ideias? Digite /sugestao para receber sugestões de perguntas do V-Commerce Agent',
]

export const AGENT_PLACEHOLDERS_COMPACT: string[] = [
  'Pergunte ao V-Commerce Agent...',
  'Sem ideias? Digite /sugestao',
]
