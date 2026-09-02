import { ThemeToggle } from '../../components/ThemeToggle'

export function SettingsAppearance() {
  return (
    <div className="max-w-2xl bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
          <div>
            <p className="text-foreground font-medium">Theme</p>
            <p className="text-sm text-dark-300">Choose between light, dark, or system theme</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
