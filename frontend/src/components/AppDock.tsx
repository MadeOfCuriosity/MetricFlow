import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  ChartBarIcon,
  CircleStackIcon,
  DocumentTextIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'
import { Dock, DockActiveIndicator, DockIcon, DockItem, DockLabel } from './ui/dock'

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

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <Dock panelHeight={52} magnification={68} baseItemSize={40}>
        {dockItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <DockItem
              key={item.name}
              onClick={() => navigate(item.href)}
              aria-label={item.name}
              className="rounded-full"
            >
              <DockLabel>{item.name}</DockLabel>
              <DockIcon>
                <item.icon
                  className={`h-full w-full ${isActive ? 'text-foreground' : 'text-dark-300'}`}
                />
              </DockIcon>
              {isActive && <DockActiveIndicator />}
            </DockItem>
          )
        })}
      </Dock>
    </div>
  )
}
