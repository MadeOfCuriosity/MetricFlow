import { SwatchIcon, KeyIcon, ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { SettingsSections, SettingsSection } from './SettingsSections'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsSecurity } from './SettingsSecurity'
import { SettingsPrivacy } from './SettingsPrivacy'
import { SettingsTerms } from './SettingsTerms'

const SECTIONS: SettingsSection[] = [
  { id: 'appearance', label: 'Appearance', icon: SwatchIcon, content: <SettingsAppearance /> },
  { id: 'security', label: 'Security', icon: KeyIcon, content: <SettingsSecurity /> },
  { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheckIcon, content: <SettingsPrivacy /> },
  { id: 'terms', label: 'Terms & Conditions', icon: DocumentTextIcon, content: <SettingsTerms /> },
]

export function SettingsGeneral() {
  return <SettingsSections sections={SECTIONS} />
}
