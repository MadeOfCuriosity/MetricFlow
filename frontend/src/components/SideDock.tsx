import { useNavigate, useLocation } from 'react-router-dom'
import { Cog6ToothIcon, FolderIcon } from '@heroicons/react/24/outline'
import { Dock, DockIcon, DockItem, DockLabel } from './ui/dock'

interface SideDockProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function SideDock({ sidebarOpen, onToggleSidebar }: SideDockProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const isSettingsActive =
    location.pathname.startsWith('/settings') && !location.pathname.startsWith('/settings/rooms')

  return (
    <div className="fixed left-4 bottom-4 z-50">
      <Dock orientation="vertical" panelHeight={52} magnification={68} baseItemSize={40}>
        <DockItem onClick={onToggleSidebar} aria-label="Rooms" className="rounded-full">
          <DockLabel>Rooms</DockLabel>
          <DockIcon>
            <FolderIcon className={`h-full w-full ${sidebarOpen ? 'text-foreground' : 'text-dark-300'}`} />
          </DockIcon>
        </DockItem>
        <DockItem
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="rounded-full"
        >
          <DockLabel>Settings</DockLabel>
          <DockIcon>
            <Cog6ToothIcon
              className={`h-full w-full ${isSettingsActive ? 'text-foreground' : 'text-dark-300'}`}
            />
          </DockIcon>
        </DockItem>
      </Dock>
    </div>
  )
}
