import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline'
import { AdminActivity } from './AdminActivity'

export function SettingsActivityPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 hover:border-dark-600 text-xs font-semibold text-dark-300 hover:text-foreground transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Back to Organization</span>
          </button>
          <div className="h-4 w-px bg-dark-800" />
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ClockIcon className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">Organization Activity</h1>
              <p className="text-[11px] text-dark-400">Complete audit trail of submissions, member actions, and system syncs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Activity Feed Component */}
      <AdminActivity />
    </div>
  )
}
