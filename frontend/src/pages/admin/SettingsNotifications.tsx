import { useState } from 'react'
import { useToast } from '../../context/ToastContext'

const NOTIFICATION_ITEMS = [
  {
    id: 'insights',
    title: 'New Insights',
    description: 'Get notified when new automated insights and trends are generated',
  },
  {
    id: 'anomalies',
    title: 'Anomaly Alerts',
    description: 'Receive real-time alerts for unexpected or unusual KPI shifts',
  },
  {
    id: 'reminders',
    title: 'Daily Data Reminders',
    description: 'Helpful reminder to submit pending daily data entries',
  },
  {
    id: 'weekly',
    title: 'Weekly Executive Summary',
    description: 'Comprehensive weekly performance summary delivered to your inbox',
  },
]

export function SettingsNotifications() {
  const { success } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      success('Preferences Saved', 'Your notification alert preferences have been updated.')
    }, 400)
  }

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-foreground tracking-tight">Notification Preferences</h2>
        <p className="text-xs text-dark-300 mt-0.5">Customize alerts, email digests, and reminder frequencies.</p>
      </div>

      <div className="space-y-3">
        {NOTIFICATION_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-dark-950/40 border border-dark-800 rounded-2xl hover:border-dark-700 transition-colors"
          >
            <div className="pr-4">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-xs text-dark-400 mt-0.5">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-dark-800 border border-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500 peer-checked:border-primary-500"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-dark-800 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
