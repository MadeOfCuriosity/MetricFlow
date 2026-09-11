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
    '--color-dark-50': '255 255 255',
    '--color-dark-100': '244 244 245',
    '--color-dark-200': '228 228 231',
    '--color-dark-300': '212 212 216',
    '--color-dark-400': '161 161 170',
    '--color-dark-500': '113 113 122',
    '--color-dark-600': '63 63 70',
    '--color-dark-700': '39 39 42',
    '--color-dark-800': '24 24 27',
    '--color-dark-850': '18 18 20',
    '--color-dark-900': '12 12 14',
    '--color-dark-950': '0 0 0',
    '--color-foreground': '255 255 255',
    // Monochrome primary scale
    '--color-primary-50': '24 24 27',
    '--color-primary-100': '39 39 42',
    '--color-primary-200': '63 63 70',
    '--color-primary-300': '161 161 170',
    '--color-primary-400': '244 244 245',
    '--color-primary-500': '255 255 255',
    '--color-primary-600': '244 244 245',
    '--color-primary-700': '228 228 231',
    '--color-primary-800': '212 212 216',
    '--color-primary-900': '161 161 170',
    '--color-primary-950': '113 113 122',
    '--shadow-card': '0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 2px -1px rgba(0, 0, 0, 0.6)',
    '--shadow-card-hover': '0 4px 14px 0 rgba(0, 0, 0, 0.8)',
  },
  light: {
    '--color-dark-50': '9 9 11',
    '--color-dark-100': '24 24 27',
    '--color-dark-200': '39 39 42',
    '--color-dark-300': '82 82 91',
    '--color-dark-400': '113 113 122',
    '--color-dark-500': '161 161 170',
    '--color-dark-600': '212 212 216',
    '--color-dark-700': '228 228 231',
    '--color-dark-800': '255 255 255',
    '--color-dark-850': '244 244 245',
    '--color-dark-900': '250 250 250',
    '--color-dark-950': '255 255 255',
    '--color-foreground': '9 9 11',
    // Monochrome primary scale
    '--color-primary-50': '244 244 245',
    '--color-primary-100': '228 228 231',
    '--color-primary-200': '212 212 216',
    '--color-primary-300': '113 113 122',
    '--color-primary-400': '24 24 27',
    '--color-primary-500': '9 9 11',
    '--color-primary-600': '24 24 27',
    '--color-primary-700': '39 39 42',
    '--color-primary-800': '63 63 70',
    '--color-primary-900': '113 113 122',
    '--color-primary-950': '161 161 170',
    '--shadow-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    '--shadow-card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
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

const DEFAULT_THEME_CONTEXT: ThemeContextType = {
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
}

export function useTheme() {
  const context = useContext(ThemeContext)
  return context ?? DEFAULT_THEME_CONTEXT
}

