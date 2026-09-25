import {
  ChartBarIcon,
  TrashIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { TagCard, TagPill } from './ui/Tag'
import { useTheme } from '../context/ThemeContext'
import { formatCompactNumber, formatTimeAgo } from '../lib/format'
import type { KPI } from '../types/kpi'

interface KPIListProps {
  kpis: KPI[]
  selectedCategory: string | null
  onSelect: (kpi: KPI) => void
  onDelete: (kpi: KPI) => void
  isDeleting: string | null
}

const isCurrency = (kpi: KPI): boolean => {
  if (kpi.unit === '$' || kpi.unit === 'USD' || kpi.unit === '€' || kpi.unit === '£') return true
  const lowerName = kpi.name.toLowerCase()
  const lowerFormula = kpi.formula.toLowerCase()
  return (
    lowerName.includes('revenue') ||
    lowerName.includes('cost') ||
    lowerName.includes('spend') ||
    lowerName.includes('cac') ||
    lowerName.includes('arr') ||
    lowerName.includes('mrr') ||
    lowerFormula.includes('revenue') ||
    lowerFormula.includes('spend')
  )
}

const isPercentage = (kpi: KPI): boolean => {
  if (kpi.unit === '%') return true
  const lowerName = kpi.name.toLowerCase()
  const formula = kpi.formula
  return (
    formula.includes('* 100') ||
    lowerName.includes('rate') ||
    lowerName.includes('percentage') ||
    lowerName.includes('margin') ||
    lowerName.includes('ratio')
  )
}

const formatKPIValue = (val: number, kpi: KPI): string => {
  if (isNaN(val) || val === null || val === undefined) return '--'

  const isPct = isPercentage(kpi)
  if (isPct) {
    return Number.isInteger(val) ? `${val}%` : `${val.toFixed(1)}%`
  }

  return formatCompactNumber(
    val,
    Number.isInteger(val) ? undefined : { minimumFractionDigits: 1, maximumFractionDigits: 2 }
  )
}

const getUnitSuffix = (kpi: KPI): string => {
  if (isPercentage(kpi)) return ''
  if (isCurrency(kpi)) return ''
  return kpi.unit || ''
}

const formatRelativeTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'No entries yet'
  try {
    return `Updated ${formatTimeAgo(dateStr, { dateAfterDays: 7 })}`
  } catch {
    return 'Recently updated'
  }
}

export function KPIList({ kpis, selectedCategory, onSelect, onDelete, isDeleting }: KPIListProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const isAllFilter = !selectedCategory || selectedCategory === 'All'

  const filteredKPIs = !isAllFilter
    ? kpis.filter((kpi) => (kpi.category || 'Custom') === selectedCategory)
    : kpis

  if (filteredKPIs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dark-700/60 backdrop-blur-xl rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-dark-800/80 border border-dark-700/60 flex items-center justify-center mb-3">
          <ChartBarIcon className="w-6 h-6 text-dark-400 stroke-[1.5]" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {!isAllFilter
            ? `No KPIs found in "${selectedCategory}" category`
            : 'No KPIs match your search'}
        </p>
        <p className="text-xs text-dark-400 mt-1">Try adjusting your filters or search query</p>
      </div>
    )
  }

  // Render a single KPI Frosted Glass Card
  const renderCard = (kpi: KPI) => {
    const displayRoom =
      kpi.room_name ||
      (kpi.room_paths && kpi.room_paths.length > 0
        ? kpi.room_paths[0].split(' > ').pop()
        : null)

    return (
      <TagCard key={kpi.id} color={kpi.room_color} onClick={() => onSelect(kpi)}>
        {/* Top Header Row */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
              <TagPill color={kpi.room_color} label={displayRoom || kpi.category} className="max-w-full" />

              {/* Time period pill */}
              {kpi.time_period && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                    isDark
                      ? 'bg-white/[0.04] border border-white/5 text-white/60'
                      : 'bg-black/[0.03] border border-black/[0.06] text-dark-400'
                  }`}
                >
                  {kpi.time_period}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {!kpi.is_preset && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(kpi)
                  }}
                  disabled={isDeleting === kpi.id}
                  className={`p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? 'text-white/40 hover:text-danger-400 hover:bg-danger-500/10'
                      : 'text-dark-400 hover:text-danger-500 hover:bg-danger-500/10'
                  }`}
                  title="Delete KPI"
                >
                  {isDeleting === kpi.id ? (
                    <div className="w-3 h-3 border-2 border-danger-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrashIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isDark
                    ? 'bg-white/[0.04] border border-white/5 group-hover:bg-white/[0.08] group-hover:border-white/15'
                    : 'bg-black/[0.03] border border-black/[0.06] group-hover:bg-black/[0.06] group-hover:border-black/[0.12]'
                }`}
              >
                <ChevronRightIcon
                  className={`w-3 h-3 transition-all group-hover:translate-x-0.5 ${
                    isDark ? 'text-white/40 group-hover:text-white' : 'text-dark-400 group-hover:text-dark-100'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* KPI Name (No description) */}
          <h3
            className={`text-sm font-semibold tracking-tight transition-colors truncate ${
              isDark ? 'text-white group-hover:text-white' : 'text-dark-100 group-hover:text-foreground'
            }`}
            title={kpi.name}
          >
            {kpi.name}
          </h3>

          {/* Hero KPI Value */}
          <div className="my-2.5 flex items-baseline gap-1.5">
            {kpi.latest_value !== null && kpi.latest_value !== undefined ? (
              <>
                {isCurrency(kpi) && (
                  <span
                    className={`text-lg font-semibold tracking-tight ${
                      isDark ? 'text-white/60' : 'text-dark-400'
                    }`}
                  >
                    $
                  </span>
                )}
                <span
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm font-mono ${
                    isDark ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {formatKPIValue(kpi.latest_value, kpi)}
                </span>
                {getUnitSuffix(kpi) && (
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ml-0.5 ${
                      isDark ? 'text-white/70' : 'text-dark-400'
                    }`}
                  >
                    {getUnitSuffix(kpi)}
                  </span>
                )}
              </>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono ${
                    isDark ? 'text-white/30' : 'text-dark-400/40'
                  }`}
                >
                  --
                </span>
                <span className={`text-[11px] font-medium ${isDark ? 'text-white/40' : 'text-dark-400'}`}>
                  No entries yet
                </span>
              </div>
            )}
          </div>

          {/* Relative Timestamp & Direction */}
          <div
            className={`flex items-center gap-1.5 text-[10px] mb-3 ${
              isDark ? 'text-white/50' : 'text-dark-400'
            }`}
          >
            <ClockIcon
              className={`w-3 h-3 flex-shrink-0 ${
                isDark ? 'text-white/40' : 'text-dark-400'
              }`}
            />
            <span className="truncate">{formatRelativeTime(kpi.last_updated_at || kpi.created_at)}</span>
            {kpi.direction && (
              <>
                <span className={isDark ? 'text-white/30' : 'text-dark-400/50'}>·</span>
                <span className="whitespace-nowrap">
                  {kpi.direction === 'up' ? '↗ Higher' : '↘ Lower'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card Footer: Formula & Units */}
        <div
          className={`pt-2.5 border-t flex items-center justify-between gap-2 text-xs mt-auto ${
            isDark ? 'border-white/[0.07]' : 'border-dark-700/60'
          }`}
        >
          <div
            className={`font-mono text-[10px] px-2 py-0.5 rounded-md truncate max-w-full ${
              isDark
                ? 'text-white/60 bg-black/40 border border-white/[0.06]'
                : 'text-dark-300 bg-black/[0.03] border border-black/[0.06]'
            }`}
            title={kpi.formula}
          >
            {kpi.formula}
          </div>
          {kpi.unit && !isCurrency(kpi) && !isPercentage(kpi) && (
            <span
              className={`text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${
                isDark ? 'text-white/50' : 'text-dark-400'
              }`}
            >
              {kpi.unit}
            </span>
          )}
        </div>
      </TagCard>
    )
  }

  // When "All" is active, render directly as a continuous latest-updated 4-column grid
  if (isAllFilter) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-dark-400 font-medium">
            Arranged by latest updated · {filteredKPIs.length} KPIs
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredKPIs.map(renderCard)}
        </div>
      </div>
    )
  }

  // When a specific category is selected, render cards in that category (4 in a row)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
            isDark
              ? 'bg-white/[0.06] border border-white/10 text-white'
              : 'bg-black/[0.04] border border-black/[0.08] text-dark-100'
          }`}
        >
          {selectedCategory}
        </span>
        <span className="text-xs text-dark-400 font-medium">
          ({filteredKPIs.length})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {filteredKPIs.map(renderCard)}
      </div>
    </div>
  )
}
