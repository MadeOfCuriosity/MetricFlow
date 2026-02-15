import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_VARS = {
  dark: {
    '--color-dark-50': '247 247 248',
    '--color-dark-100': '227 227 230',
    '--color-dark-200': '200 200 205',
    '--color-dark-300': '161 161 170',
    '--color-dark-400': '113 113 122',
    '--color-dark-500': '82 82 91',
    '--color-dark-600': '63 63 70',
    '--color-dark-700': '42 42 46',
    '--color-dark-800': '31 31 35',
    '--color-dark-850': '24 24 27',
    '--color-dark-900': '18 18 20',
    '--color-dark-950': '13 13 15',
    '--color-foreground': '255 255 255',
    '--shadow-card': '0 2px 8px rgba(0, 0, 0, 0.3)',
    '--shadow-card-hover': '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  light: {
    '--color-dark-50': '17 24 39',
    '--color-dark-100': '31 41 55',
    '--color-dark-200': '55 65 81',
    '--color-dark-300': '75 85 99',
    '--color-dark-400': '107 114 128',
    '--color-dark-500': '156 163 175',
    '--color-dark-600': '209 213 219',
    '--color-dark-700': '229 231 235',
    '--color-dark-800': '255 255 255',
    '--color-dark-850': '249 250 251',
    '--color-dark-900': '249 250 251',
    '--color-dark-950': '243 244 246',
    '--color-foreground': '17 24 39',
    '--shadow-card': '0 2px 8px rgba(0, 0, 0, 0.08)',
    '--shadow-card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
  },
} as const

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.setAttribute('data-theme', resolved)

  // Set CSS variables directly as inline styles (bulletproof override)
  const vars = THEME_VARS[resolved]
  const el = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    () => {
      const t = getStoredTheme()
      return t === 'system' ? getSystemTheme() : t
    }
  )

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
    setResolvedTheme(newTheme === 'system' ? getSystemTheme() : newTheme)
  }

  useEffect(() => {
    applyTheme(theme)
  }, [])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      applyTheme('system')
      setResolvedTheme(getSystemTheme())
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
