import { UserCircleIcon, ClockIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { SettingsSections, SettingsSection } from './SettingsSections'
import { SettingsProfile } from './SettingsProfile'
import { SettingsMyActivity } from './SettingsMyActivity'
import { WhatsAppLinkCard } from '../../components/whatsapp/WhatsAppLinkCard'

const SECTIONS: SettingsSection[] = [
  { id: 'profile', label: 'Profile', icon: UserCircleIcon, content: <SettingsProfile /> },
  { id: 'whatsapp', label: 'WhatsApp', icon: ChatBubbleLeftRightIcon, content: <WhatsAppLinkCard /> },
  { id: 'my-activity', label: 'My Activity', icon: ClockIcon, content: <SettingsMyActivity /> },
]

export function SettingsAccount() {
  return <SettingsSections sections={SECTIONS} />
}
