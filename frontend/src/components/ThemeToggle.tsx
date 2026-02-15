import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../context/ThemeContext'

const options = [
  { value: 'light' as const, icon: SunIcon, label: 'Light' },
  { value: 'dark' as const, icon: MoonIcon, label: 'Dark' },
  { value: 'system' as const, icon: ComputerDesktopIcon, label: 'System' },
]

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  if (collapsed) {
    const active = options.find((o) => o.value === theme) || options[0]
    return (
      <button
        onClick={() => {
          const idx = options.findIndex((o) => o.value === theme)
          setTheme(options[(idx + 1) % options.length].value)
        }}
        className="flex items-center justify-center p-2 text-dark-300 hover:text-foreground rounded-lg transition-colors"
        title={`Theme: ${active.label}`}
      >
        <active.icon className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center bg-dark-800 rounded-full p-1 gap-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`p-2 rounded-full transition-all duration-200 ${
              theme === option.value
                ? 'bg-primary-500/20 text-primary-400 shadow-sm'
                : 'text-dark-400 hover:text-dark-200'
            }`}
            title={option.label}
          >
            <option.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  )
}
