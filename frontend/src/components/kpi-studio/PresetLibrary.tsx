import { useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BookmarkSquareIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import type { TimePeriod } from '../../types/kpi'
import type { DataField } from '../../types/dataField'
import { humanizeVariable } from '../../lib/formula'
import { SegmentedControl } from '../ui/SegmentedControl'
import { RoomSelect } from './RoomSelect'
import { TIME_PERIOD_OPTIONS } from './ManualKPIForm'

export interface Preset {
  name: string
  description: string
  formula: string
  category: string
  time_period?: TimePeriod
  unit?: string | null
  direction?: 'up' | 'down' | null
  input_fields?: string[]
}

interface PresetLibraryProps {
  presets: Preset[]
  isLoading: boolean
  loadError: string | null
  onRetry: () => void
  dataFields: DataField[]
  roomId: string
  onRoomChange: (roomId: string) => void
  importingName: string | null
  onImport: (preset: Preset) => void
  onCustomize: (preset: Preset) => void
}

const CATEGORY_ORDER = ['Sales', 'Marketing', 'Operations', 'Finance', 'Custom']

export function PresetLibrary({
  presets,
  isLoading,
  loadError,
  onRetry,
  dataFields,
  roomId,
  onRoomChange,
  importingName,
  onImport,
  onCustomize,
}: PresetLibraryProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const knownVariables = useMemo(() => new Set(dataFields.map((f) => f.variable_name)), [dataFields])
  const fieldNames = useMemo(() => new Map(dataFields.map((f) => [f.variable_name, f.name])), [dataFields])

  // Only offer categories that have presets, with counts
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    presets.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1))
    return [
      { value: 'All', label: `All ${presets.length}` },
      ...CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({ value: c, label: `${c} ${counts.get(c)}` })),
    ]
  }, [presets])
  const activeCategory = categories.some((c) => c.value === category) ? category : 'All'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return presets.filter(
      (p) =>
        (activeCategory === 'All' || p.category === activeCategory) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.formula.toLowerCase().includes(q))
    )
  }, [presets, activeCategory, search])

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-2 sm:px-4 pb-2">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search presets by name, formula or purpose…"
              aria-label="Search presets"
              className="w-full pl-8 pr-3 py-2 bg-dark-950 border border-dark-700 rounded-xl text-xs text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 sm:w-72">
            <span className="text-[11px] text-dark-400 whitespace-nowrap">Add to</span>
            <RoomSelect value={roomId} onChange={onRoomChange} size="sm" className="flex-1 min-w-0" />
          </div>
        </div>
        {presets.length > 0 && (
          <SegmentedControl
            options={categories}
            value={activeCategory}
            onChange={setCategory}
            size="xs"
            surface="inset"
            aria-label="Preset category"
            className="self-start max-w-full overflow-x-auto"
          />
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ArrowPathIcon className="w-6 h-6 text-dark-400 animate-spin mb-2" />
            <p className="text-xs text-dark-300">Loading presets…</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-xs font-medium text-dark-300">{loadError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 px-3 py-1.5 rounded-lg border border-dark-700 text-xs text-foreground hover:bg-dark-800 cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : presets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircleIcon className="w-8 h-8 text-success-400 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-foreground">You've added every preset</p>
            <p className="text-[11px] text-dark-400 mt-1 max-w-xs">
              Use the AI or Manual tab to build a KPI that fits your business exactly.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BookmarkSquareIcon className="w-8 h-8 text-dark-500 mb-2 opacity-50 stroke-[1.5]" />
            <p className="text-xs font-medium text-dark-300">No presets match "{search}"</p>
            <p className="text-[11px] text-dark-400 mt-1">Try another keyword or category — or build it with AI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filtered.map((preset) => {
              const isImporting = importingName === preset.name
              const inputs = preset.input_fields ?? []
              const newCount = inputs.filter((v) => !knownVariables.has(v)).length
              const period = TIME_PERIOD_OPTIONS.find((o) => o.value === preset.time_period)?.label
              return (
                <article
                  key={preset.name}
                  className="p-4 rounded-xl border border-dark-700/80 bg-dark-950/60 hover:border-dark-600 transition-colors flex flex-col gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground tracking-tight">{preset.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-dark-800 border border-dark-700 text-dark-300 flex-shrink-0">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-xs text-dark-300 leading-relaxed">{preset.description}</p>
                  </div>

                  <code className="block text-[11px] font-mono text-brand/90 bg-dark-900/80 px-2.5 py-1.5 rounded-lg border border-dark-800 break-words">
                    {preset.formula}
                  </code>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-dark-400">
                    {period && <span>{period}</span>}
                    {preset.unit && <span>Unit: {preset.unit}</span>}
                    {preset.direction && (
                      <span className="flex items-center gap-1">
                        {preset.direction === 'up' ? (
                          <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                        )}
                        {preset.direction === 'up' ? 'Higher is better' : 'Lower is better'}
                      </span>
                    )}
                  </div>

                  {inputs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400 mb-1.5">
                        Needs {inputs.length} input{inputs.length !== 1 ? 's' : ''}
                        {newCount > 0 && <span className="normal-case font-normal tracking-normal"> · {newCount} new data field{newCount !== 1 ? 's' : ''} will be created</span>}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {inputs.map((v) => {
                          const known = knownVariables.has(v)
                          return (
                            <span
                              key={v}
                              title={known ? `Uses your existing "${fieldNames.get(v)}" field` : 'Will be created as a new data field'}
                              className={
                                known
                                  ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-success-500/10 text-success-400 border border-success-500/20'
                                  : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-dark-800 text-dark-300 border border-dashed border-dark-600'
                              }
                            >
                              {known ? <CheckCircleIcon className="w-3 h-3" /> : <PlusCircleIcon className="w-3 h-3" />}
                              {known ? fieldNames.get(v) : humanizeVariable(v)}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-dark-800/80 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onCustomize(preset)}
                      title="Open in the Manual editor to change the name, formula or settings first"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dark-700 text-xs font-semibold text-dark-300 hover:text-foreground hover:border-dark-500 transition-colors cursor-pointer"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                      Customize
                    </button>
                    <button
                      type="button"
                      disabled={!!importingName}
                      onClick={() => onImport(preset)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 text-white font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {isImporting ? (
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      {isImporting ? 'Adding…' : 'Add KPI'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
