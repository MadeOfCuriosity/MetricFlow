import { useState, useRef, useEffect, useMemo } from 'react'
import { MagnifyingGlassIcon, PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { useDismiss } from '../hooks/useDismiss'

export interface AssignableKPI {
  id: string
  name: string
  category: string
}

interface AssignKPIPopoverProps {
  kpis: AssignableKPI[]
  onAssign: (kpiIds: string[]) => Promise<void>
}

/** Small searchable dropdown for attaching org KPIs to a room. */
export function AssignKPIPopover({ kpis, onAssign }: AssignKPIPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useDismiss([containerRef], () => setIsOpen(false), { enabled: isOpen, escape: true })

  // Reset the picker whenever it closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelected(new Set())
    }
  }, [isOpen])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? kpis.filter((k) => k.name.toLowerCase().includes(q) || k.category.toLowerCase().includes(q)) : kpis
  }, [kpis, query])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAssign = async () => {
    if (selected.size === 0) return
    setIsSaving(true)
    try {
      await onAssign(Array.from(selected))
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-dark-400 hover:text-foreground hover:bg-dark-800 transition-colors cursor-pointer"
        title="Assign KPIs to this room"
      >
        <PlusIcon className="w-3.5 h-3.5 stroke-[2]" />
        <span>Assign KPI</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-72 bg-dark-900 border border-dark-700 rounded-xl shadow-xl overflow-hidden">
          <div className="relative border-b border-dark-700">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search KPIs..."
              className="w-full pl-8 pr-3 py-2 bg-transparent text-xs text-foreground placeholder-dark-400 focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <p className="px-3 py-4 text-xs text-dark-400 text-center">
                {kpis.length === 0 ? 'All KPIs are already assigned here' : 'No matching KPIs'}
              </p>
            ) : (
              visible.map((kpi) => (
                <label
                  key={kpi.id}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-dark-800 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(kpi.id)}
                    onChange={() => toggle(kpi.id)}
                    className="accent-current"
                  />
                  <ChartBarIcon className="w-3.5 h-3.5 text-dark-400 flex-shrink-0" />
                  <span className="text-foreground truncate flex-1">{kpi.name}</span>
                  <span className="text-[10px] text-dark-400 capitalize flex-shrink-0">{kpi.category}</span>
                </label>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-dark-700">
            <span className="text-[11px] text-dark-400">{selected.size} selected</span>
            <button
              type="button"
              onClick={handleAssign}
              disabled={selected.size === 0 || isSaving}
              className="px-3 py-1 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
