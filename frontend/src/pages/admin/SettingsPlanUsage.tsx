import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CreditCardIcon,
  ChartBarSquareIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { SettingsPlan } from './SettingsPlan'
import { SettingsUsage } from './SettingsUsage'
import { SettingsUpgrade } from './SettingsUpgrade'

const SECTIONS = [
  { id: 'plan', label: 'Subscription & Plan', icon: CreditCardIcon },
  { id: 'usage', label: 'Usage & Quotas', icon: ChartBarSquareIcon },
  { id: 'upgrade', label: 'Upgrade Plan', icon: ArrowTrendingUpIcon },
]

export function SettingsPlanUsage() {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('plan')

  // Handle anchor scrolling
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) {
      setActiveSection(hash)
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
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

      {/* 1. Subscription & Plan Section */}
      <div id="plan" className="scroll-mt-6">
        <SettingsPlan />
      </div>

      {/* 2. Usage & Quotas Section */}
      <div id="usage" className="scroll-mt-6">
        <SettingsUsage />
      </div>

      {/* 3. Upgrade Plan Section */}
      <div id="upgrade" className="scroll-mt-6">
        <SettingsUpgrade />
      </div>
    </div>
  )
}
