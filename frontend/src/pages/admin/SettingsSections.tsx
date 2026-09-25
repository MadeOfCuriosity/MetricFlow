import { useEffect, useState, ComponentType, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export interface SettingsSection {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  content: ReactNode
}

/**
 * Settings tab body: a "Jump to" strip plus stacked, anchor-linked sections.
 * Deep links like /settings#users scroll to the matching section.
 */
export function SettingsSections({ sections }: { sections: SettingsSection[] }) {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) {
      setActiveSection(hash)
      const scrollToEl = () => {
        const el = document.getElementById(hash)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
      scrollToEl()
      const t = setTimeout(scrollToEl, 150)
      return () => clearTimeout(t)
    }
  }, [location.hash])

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Jump Strip matching Rooms.tsx */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider mr-1">
          Jump to:
        </span>
        {sections.map((sec) => {
          const Icon = sec.icon
          const isCurrent = activeSection === sec.id
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                isCurrent
                  ? 'bg-dark-800 border border-dark-600 text-foreground shadow-xs font-semibold'
                  : 'bg-dark-900 border border-dark-700/80 text-dark-300 hover:text-foreground hover:border-dark-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0 stroke-[2]" />
              <span>{sec.label}</span>
            </button>
          )
        })}
      </div>

      {sections.map((sec) => (
        <div key={sec.id} id={sec.id} className="scroll-mt-6">
          {sec.content}
        </div>
      ))}
    </div>
  )
}
