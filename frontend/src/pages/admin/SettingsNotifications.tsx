const NOTIFICATION_ITEMS = [
  {
    id: 'insights',
    title: 'New Insights',
    description: 'Get notified when new insights are generated',
  },
  {
    id: 'anomalies',
    title: 'Anomaly Alerts',
    description: 'Receive alerts for unusual KPI changes',
  },
  {
    id: 'reminders',
    title: 'Daily Reminders',
    description: 'Reminder to enter daily data',
  },
  {
    id: 'weekly',
    title: 'Weekly Summary',
    description: 'Weekly performance summary email',
  },
]

export function SettingsNotifications() {
  return (
    <div className="max-w-2xl bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>

      <div className="space-y-4">
        {NOTIFICATION_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl"
          >
            <div>
              <p className="text-foreground font-medium">{item.title}</p>
              <p className="text-sm text-dark-300">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-dark-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-dark-700">
        <button className="px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors">
          Save Preferences
        </button>
      </div>
    </div>
  )
}
