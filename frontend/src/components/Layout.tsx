import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AppDock } from './AppDock'
import { Header } from './Header'
import { AdminAIAgent } from './AdminAIAgent'
import { ImpersonationBanner } from './ImpersonationBanner'
import { InAppNotifications } from './InAppNotifications'
import { RadialMenu } from './RadialMenu'
import { XMarkIcon } from '@heroicons/react/24/outline'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAIAgentOpen, setIsAIAgentOpen] = useState(false)
  const location = useLocation()

  // Detect full-screen zero-scroll modes (like KPI Studio create tab or AI builder)
  const searchParams = new URLSearchParams(location.search)
  const isZeroScroll =
    (location.pathname === '/kpis' && searchParams.get('tab') === 'create') ||
    location.pathname.includes('/ai-builder')

  return (
    <div className="flex h-screen bg-dark-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex flex-col h-full">
          <button
            className="absolute top-4 right-4 p-2 text-dark-300 hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <Sidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ImpersonationBanner />
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onToggleAIAgent={() => setIsAIAgentOpen((prev) => !prev)}
          isAIAgentOpen={isAIAgentOpen}
        />

        <main
          className={`flex-1 bg-dark-950 transition-all ${
            isZeroScroll
              ? 'overflow-hidden p-4 pb-[4.5rem] flex flex-col'
              : 'overflow-y-auto p-6 pb-28'
          }`}
        >
          <InAppNotifications />
          <Outlet />
        </main>
      </div>

      <AdminAIAgent
        isOpen={isAIAgentOpen}
        onClose={() => setIsAIAgentOpen(false)}
      />
      <AppDock />
      <RadialMenu />
    </div>
  )
}
