import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('vcommerce-theme') as Theme) ?? 'light'
  )

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = (dark: boolean) => root.classList.toggle('dark', dark)
      apply(mq.matches)
      const handler = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('vcommerce-theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
