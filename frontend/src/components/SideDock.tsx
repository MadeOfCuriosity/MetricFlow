import { useNavigate, useLocation } from 'react-router-dom'
import { Cog6ToothIcon, FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { LiquidBridge } from './LiquidBridge'
import { Sidebar } from './Sidebar'

interface SideDockProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function SideDock({ sidebarOpen, onToggleSidebar }: SideDockProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const isSettingsActive =
    location.pathname.startsWith('/settings') && !location.pathname.startsWith('/settings/rooms')

  // When expanded, the dock itself has expanded into the sidebar panel
  if (sidebarOpen) {
    return (
      <div className="fixed left-4 bottom-4 top-4 z-40 w-72 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
        <Sidebar
          className="flex flex-col h-full bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden"
          onCollapse={onToggleSidebar}
          footer={
            <div className="p-3 border-t border-dark-700/80 bg-dark-850/60 flex items-center justify-between">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground text-dark-950 font-semibold text-xs shadow-sm hover:opacity-90 transition-all focus:outline-none"
                title="Collapse Rooms"
              >
                <FolderIcon className="w-4 h-4 text-dark-950 stroke-[2.2]" />
                <span>Rooms</span>
                <ChevronDownIcon className="w-3.5 h-3.5 text-dark-950/70" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/settings')}
                className={`p-2 rounded-full transition-all focus:outline-none ${
                  isSettingsActive
                    ? 'bg-foreground text-dark-950'
                    : 'text-dark-300 hover:text-foreground hover:bg-dark-800'
                }`}
                title="Settings"
              >
                <Cog6ToothIcon
                  className={`w-4 h-4 ${
                    isSettingsActive ? 'text-dark-950 stroke-[2.2]' : 'stroke-[2]'
                  }`}
                />
              </button>
            </div>
          }
        />
      </div>
    )
  }

  // Collapsed: sleek vertical liquid metaball pill
  return (
    <div className="fixed left-4 bottom-4 z-40 pointer-events-none">
      <nav
        aria-label="Sidebar Controls"
        className="flex flex-col items-center pointer-events-auto"
      >
        {/* Pod 1: Rooms Toggle (Top Cap) - Clicking this expands into the sidebar */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="w-12 h-12 rounded-t-full border-t border-l border-r border-dark-700 bg-dark-900 flex-shrink-0 flex items-center justify-center relative group focus:outline-none cursor-pointer hover:bg-dark-850 transition-colors"
          title="Rooms (Click to expand)"
          aria-label="Rooms (Click to expand)"
        >
          {/* Tooltip on right */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-medium text-foreground bg-dark-850/95 border border-dark-700 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
            Rooms (Click to expand)
          </div>

          <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-dark-300 group-hover:text-foreground group-hover:bg-dark-800/80">
            <FolderIcon className="w-4 h-4 stroke-[2]" />
          </div>
        </button>

        {/* Vertical Liquid Bridge */}
        <LiquidBridge orientation="vertical" width={48} height={20} waistDepth={11} />

        {/* Pod 2: Settings (Bottom Cap) */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="w-12 h-12 rounded-b-full border-b border-l border-r border-dark-700 bg-dark-900 flex-shrink-0 flex items-center justify-center relative group focus:outline-none cursor-pointer hover:bg-dark-850 transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          {/* Tooltip on right */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-medium text-foreground bg-dark-850/95 border border-dark-700 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
            Settings
          </div>

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              isSettingsActive
                ? 'bg-foreground text-dark-950 shadow-sm'
                : 'text-dark-300 group-hover:text-foreground group-hover:bg-dark-800/80'
            }`}
          >
            <Cog6ToothIcon
              className={`w-4 h-4 ${
                isSettingsActive ? 'text-dark-950 stroke-[2.2]' : 'stroke-[2]'
              }`}
            />
          </div>
        </button>
      </nav>
    </div>
  )
}
