import { HomeIcon, UsersIcon, BellIcon } from '@heroicons/react/24/outline'
import { SettingsSections, SettingsSection } from './SettingsSections'
import { AdminDashboard } from './AdminDashboard'
import { AdminUsers } from './AdminUsers'
import { SettingsNotifications } from './SettingsNotifications'

const SECTIONS: SettingsSection[] = [
  { id: 'overview', label: 'Overview', icon: HomeIcon, content: <AdminDashboard /> },
  { id: 'users', label: 'Users', icon: UsersIcon, content: <AdminUsers /> },
  { id: 'notifications', label: 'Notifications', icon: BellIcon, content: <SettingsNotifications /> },
]

export function SettingsOrganization() {
  return <SettingsSections sections={SECTIONS} />
}
