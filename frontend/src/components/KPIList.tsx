import {
  ChartBarIcon,
  TrashIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other'

interface KPI {
  id: string
  name: string
  description: string
  category: string
  formula: string
  input_fields: string[]
  unit: string
  direction: 'up' | 'down'
  is_active: boolean
  is_preset?: boolean
  time_period?: TimePeriod
  room_paths?: string[]
}

interface KPIListProps {
  kpis: KPI[]
  selectedCategory: string | null
  onSelect: (kpi: KPI) => void
  onDelete: (kpi: KPI) => void
  isDeleting: string | null
}

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'Sales':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'Marketing':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'Operations':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Finance':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default:
      return 'bg-dark-800 text-dark-300 border-dark-700'
  }
}

export function KPIList({ kpis, selectedCategory, onSelect, onDelete, isDeleting }: KPIListProps) {
  const filteredKPIs = selectedCategory && selectedCategory !== 'All'
    ? kpis.filter((kpi) => (kpi.category || 'Custom') === selectedCategory)
    : kpis

  // Group by category
  const groupedKPIs = filteredKPIs.reduce((acc, kpi) => {
    const category = kpi.category || 'Custom'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(kpi)
    return acc
  }, {} as Record<string, KPI[]>)

  const categories = Object.keys(groupedKPIs).sort()

  if (filteredKPIs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/50 border border-dark-700/60 rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-3">
          <ChartBarIcon className="w-6 h-6 text-dark-400 stroke-[1.5]" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {selectedCategory && selectedCategory !== 'All'
            ? `No KPIs found in "${selectedCategory}" category`
            : 'No KPIs match your search'}
        </p>
        <p className="text-xs text-dark-400 mt-1">Try adjusting your filters or search query</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getCategoryBadgeClass(
                category
              )}`}
            >
              {category}
            </span>
            <span className="text-xs text-dark-400 font-medium">
              ({groupedKPIs[category].length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupedKPIs[category].map((kpi) => (
              <div
                key={kpi.id}
                className="bg-dark-900 border border-dark-700 hover:border-dark-500/80 rounded-2xl p-4 transition-all duration-150 cursor-pointer group flex flex-col justify-between"
                onClick={() => onSelect(kpi)}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary-400 transition-colors truncate">
                          {kpi.name}
                        </h3>
                        {kpi.is_preset && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-800 border border-dark-700 text-dark-300 text-[10px] font-medium rounded-md">
                            <SparklesIcon className="w-2.5 h-2.5 text-amber-400" />
                            Preset
                          </span>
                        )}
                        {kpi.time_period && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 font-medium capitalize">
                            {kpi.time_period}
                          </span>
                        )}
                      </div>
                      {kpi.description && (
                        <p className="text-xs text-dark-400 mt-1 line-clamp-2 leading-relaxed">
                          {kpi.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!kpi.is_preset && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(kpi)
                          }}
                          disabled={isDeleting === kpi.id}
                          className="p-1.5 text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 cursor-pointer"
                          title="Delete KPI"
                        >
                          {isDeleting === kpi.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrashIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <ChevronRightIcon className="w-4 h-4 text-dark-500 group-hover:text-dark-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-dark-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="font-mono text-[11px] text-dark-400 bg-dark-950/60 px-2 py-1 rounded-md border border-dark-800/60 truncate max-w-[70%]">
                    {kpi.formula}
                  </div>
                  {kpi.unit && (
                    <span className="text-dark-400 text-xs font-medium">
                      Unit: <span className="text-foreground">{kpi.unit}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
