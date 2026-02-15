import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AdminAIAgent } from './AdminAIAgent'
import { XMarkIcon } from '@heroicons/react/24/outline'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

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

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar
          collapsed={!desktopSidebarOpen}
          onToggleCollapse={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-dark-950 p-6">
          <Outlet />
        </main>
      </div>

      <AdminAIAgent />
    </div>
  )
}
