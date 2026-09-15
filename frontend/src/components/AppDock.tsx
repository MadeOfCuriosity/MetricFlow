import { Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  ChartBarIcon,
  CircleStackIcon,
  DocumentTextIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'
import { LiquidBridge } from './LiquidBridge'

const dockItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'KPIs', href: '/kpis', icon: ChartBarIcon },
  { name: 'Data', href: '/data', icon: CircleStackIcon },
  { name: 'Data Entry', href: '/entries', icon: DocumentTextIcon },
  { name: 'Insights', href: '/insights', icon: LightBulbIcon },
]

export function AppDock() {
  const navigate = useNavigate()
  const location = useLocation()

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname.startsWith('/dashboard')
    }
    if (href === '/data') {
      return location.pathname === '/data' || (location.pathname.startsWith('/data') && !location.pathname.startsWith('/entries'))
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <nav
        aria-label="Application Navigation"
        className="flex items-center pointer-events-auto filter drop-shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)] max-w-full"
      >
        {dockItems.map((item, index) => {
          const isActive = isItemActive(item.href)
          const isFirst = index === 0
          const isLast = index === dockItems.length - 1

          let podClasses =
            'h-12 w-12 bg-dark-900 flex-shrink-0 flex items-center justify-center relative group focus:outline-none cursor-pointer hover:bg-dark-850 transition-colors'
          if (isFirst) {
            podClasses += ' rounded-l-full border-t border-b border-l border-dark-700'
          } else if (isLast) {
            podClasses += ' rounded-r-full border-t border-b border-r border-dark-700'
          } else {
            podClasses += ' border-t border-b border-dark-700'
          }

          return (
            <Fragment key={item.name}>
              {index > 0 && <LiquidBridge width={20} height={48} waistDepth={11} />}
              <button
                type="button"
                onClick={() => navigate(item.href)}
                className={podClasses}
                title={item.name}
                aria-label={item.name}
              >
                {/* Floating Tooltip above pod */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[11px] font-medium text-foreground bg-dark-850/95 border border-dark-700 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                  {item.name}
                </div>

                {/* Inner Icon Container */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-foreground text-dark-950 shadow-sm'
                      : 'text-dark-300 group-hover:text-foreground group-hover:bg-dark-800/80'
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-dark-950 stroke-[2.2]' : 'stroke-[2]'
                    }`}
                  />
                </div>
              </button>
            </Fragment>
          )
        })}
      </nav>
    </div>
  )
}
