import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  UserCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { SettingsProfile } from './SettingsProfile'
import { SettingsMyActivity } from './SettingsMyActivity'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserCircleIcon },
  { id: 'my-activity', label: 'My Activity', icon: ClockIcon },
]

export function SettingsAccount() {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('profile')

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
        {SECTIONS.map((sec) => {
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

      {/* 1. Profile */}
      <div id="profile" className="scroll-mt-6">
        <SettingsProfile />
      </div>

      {/* 2. My Activity */}
      <div id="my-activity" className="scroll-mt-6">
        <SettingsMyActivity />
      </div>
    </div>
  )
}
