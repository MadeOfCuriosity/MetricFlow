import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { dataFieldsApi } from '../services/dataFields'
import { MaskIcon } from './ui/MaskIcon'

export function PendingEntriesButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchPending = async () => {
      try {
        const dateStr = format(new Date(), 'yyyy-MM-dd')
        // Due today (scheduled fields only — "no schedule" is never due) + missed in the last 30 days
        const [today, missed] = await Promise.all([
          dataFieldsApi.getTodayFieldForm(dateStr),
          dataFieldsApi.getPending(30),
        ])
        const dueToday = new Set(
          today.rooms.flatMap((r) =>
            r.fields.filter((f) => f.entry_interval !== 'custom' && !f.has_entry_today).map((f) => f.data_field_id)
          )
        ).size
        if (!cancelled) setPendingCount(dueToday + missed.total)
      } catch (err) {
        console.error('Failed to fetch pending data entries:', err)
      }
    }

    fetchPending()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (pendingCount === 0) return null

  return createPortal(
    <button
      type="button"
      onClick={() => navigate('/entries')}
      className="fixed z-50 w-12 h-12 rounded-full border border-dark-700 bg-dark-900 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 hover:border-dark-600 hover:bg-dark-850 group focus:outline-none focus-visible:ring-0"
      style={{ position: 'fixed', bottom: '1rem', left: '1rem', top: 'auto', right: 'auto' }}
      title={`${pendingCount} data ${pendingCount === 1 ? 'entry' : 'entries'} due or missed`}
      aria-label={`${pendingCount} data entries due or missed`}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-dark-300 group-hover:text-foreground group-hover:bg-dark-800/60 transition-all duration-200">
        <MaskIcon src="/icons/data-entry.svg" className="w-4 h-4" />
      </div>

      {/* Pending count badge */}
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center border-2 border-dark-950">
        {pendingCount > 99 ? '99+' : pendingCount}
      </span>
    </button>,
    document.body
  )
}
