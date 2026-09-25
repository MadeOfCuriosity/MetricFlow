import { CreditCardIcon, ChartBarSquareIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { SettingsSections, SettingsSection } from './SettingsSections'
import { SettingsPlan } from './SettingsPlan'
import { SettingsUsage } from './SettingsUsage'
import { SettingsUpgrade } from './SettingsUpgrade'

const SECTIONS: SettingsSection[] = [
  { id: 'plan', label: 'Subscription & Plan', icon: CreditCardIcon, content: <SettingsPlan /> },
  { id: 'usage', label: 'Usage & Quotas', icon: ChartBarSquareIcon, content: <SettingsUsage /> },
  { id: 'upgrade', label: 'Upgrade Plan', icon: ArrowTrendingUpIcon, content: <SettingsUpgrade /> },
]

export function SettingsPlanUsage() {
  return <SettingsSections sections={SECTIONS} />
}
