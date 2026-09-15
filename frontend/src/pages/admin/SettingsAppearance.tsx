import { ThemeToggle } from '../../components/ThemeToggle'

export function SettingsAppearance() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-foreground tracking-tight">Appearance & Theme</h2>
        <p className="text-xs text-dark-300 mt-0.5">Customize your interface appearance and color mode.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-dark-950/40 border border-dark-800 rounded-2xl">
          <div>
            <p className="text-sm font-semibold text-foreground">Interface Theme</p>
            <p className="text-xs text-dark-400 mt-0.5">Toggle between dark mode and light mode interface</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
