import { useState } from 'react'
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

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    Sales: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
    Marketing: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-800/50' },
    Operations: { bg: 'bg-warning-500/10', text: 'text-warning-400', border: 'border-warning-500/20' },
    Finance: { bg: 'bg-success-500/10', text: 'text-success-400', border: 'border-success-500/20' },
    Custom: { bg: 'bg-dark-600/30', text: 'text-dark-300', border: 'border-dark-600' },
  }
  return colors[category] || colors.Custom
}

export function KPIList({ kpis, selectedCategory, onSelect, onDelete, isDeleting }: KPIListProps) {
  const filteredKPIs = selectedCategory
    ? kpis.filter((kpi) => kpi.category === selectedCategory)
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
      <div className="text-center py-12">
        <ChartBarIcon className="w-12 h-12 text-dark-500 mx-auto mb-4" />
        <p className="text-dark-300">
          {selectedCategory
            ? `No KPIs in ${selectedCategory} category`
            : 'No KPIs match your filter'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                getCategoryColor(category).bg
              } ${getCategoryColor(category).text}`}
            >
              {category}
            </span>
            <span className="text-sm text-dark-400">
              ({groupedKPIs[category].length})
            </span>
          </div>

          <div className="space-y-2">
            {groupedKPIs[category].map((kpi) => (
              <div
                key={kpi.id}
                className={`bg-dark-900 border rounded-xl p-4 hover:border-dark-600 transition-colors cursor-pointer group ${
                  getCategoryColor(category).border
                }`}
                onClick={() => onSelect(kpi)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {kpi.name}
                      </h3>
                      {kpi.is_preset && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary-500/10 text-primary-400 text-xs rounded">
                          <SparklesIcon className="w-3 h-3" />
                          Preset
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-400 mt-1 font-mono">
                      {kpi.formula}
                    </p>
                    {kpi.description && (
                      <p className="text-xs text-dark-300 mt-1 truncate">
                        {kpi.description}
                      </p>
                    )}
                    {kpi.room_paths && kpi.room_paths.length > 0 && (
                      <p className="text-xs text-dark-400 mt-1 truncate">
                        {kpi.room_paths.join(' | ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!kpi.is_preset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(kpi)
                        }}
                        disabled={isDeleting === kpi.id}
                        className="p-2 text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {isDeleting === kpi.id ? (
                          <div className="w-4 h-4 border-2 border-danger-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <ChevronRightIcon className="w-5 h-5 text-dark-500 group-hover:text-dark-300 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
