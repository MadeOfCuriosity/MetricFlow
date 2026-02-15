import { useState, useEffect, useMemo } from 'react'
import {
  CheckIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { DataFieldChipSelector } from './DataFieldChipSelector'
import { dataFieldsApi } from '../services/dataFields'
import type { DataField } from '../types/dataField'

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other'

/**
 * Basic client-side formula validation to catch obvious issues
 * before sending to the backend.
 */
function validateFormula(formula: string, inputFields: string[]): string | null {
  if (!formula || !formula.trim()) {
    return 'Formula is empty'
  }

  // Check balanced parentheses
  let depth = 0
  for (const char of formula) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (depth < 0) return 'Unbalanced parentheses in formula'
  }
  if (depth !== 0) return 'Unbalanced parentheses in formula'

  // Check for empty parentheses
  if (/\(\s*\)/.test(formula)) {
    return 'Formula contains empty parentheses'
  }

  // Check that all input_fields appear in the formula
  for (const field of inputFields) {
    if (!formula.includes(field)) {
      return `Variable "${field}" listed but not found in formula`
    }
  }

  return null
}

interface KPISuggestion {
  name: string
  description?: string
  category: string
  formula: string
  input_fields: string[]
  unit?: string
  direction?: 'up' | 'down'
  time_period?: TimePeriod
}

const getTimePeriodLabel = (period: TimePeriod): string => {
  const labels: Record<TimePeriod, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    other: 'Custom',
  }
  return labels[period] || 'Daily'
}

interface KPISuggestionCardProps {
  suggestion: KPISuggestion
  onAdd: (mappings: Record<string, string>) => void
  isAdding: boolean
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    Sales: { bg: 'bg-primary-500/10', text: 'text-primary-400' },
    Marketing: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    Operations: { bg: 'bg-warning-500/10', text: 'text-warning-400' },
    Finance: { bg: 'bg-success-500/10', text: 'text-success-400' },
    Custom: { bg: 'bg-dark-600/30', text: 'text-dark-300' },
  }
  return colors[category] || colors.Custom
}

export function KPISuggestionCard({
  suggestion,
  onAdd,
  isAdding,
}: KPISuggestionCardProps) {
  const categoryColor = getCategoryColor(suggestion.category)
  const [existingFields, setExistingFields] = useState<DataField[]>([])
  const [mappings, setMappings] = useState<Record<string, string | null>>({})

  useEffect(() => {
    dataFieldsApi.getAll().then((res) => {
      setExistingFields(res.data_fields)

      // Auto-match variables to existing fields by variable_name
      const autoMappings: Record<string, string | null> = {}
      suggestion.input_fields.forEach((variable) => {
        const match = res.data_fields.find((f) => f.variable_name === variable)
        autoMappings[variable] = match ? match.id : null
      })
      setMappings(autoMappings)
    }).catch(() => {
      // If fetch fails, leave all as "create new"
    })
  }, [suggestion.input_fields])

  const formulaError = useMemo(
    () => validateFormula(suggestion.formula, suggestion.input_fields),
    [suggestion.formula, suggestion.input_fields]
  )

  const handleMappingChange = (variable: string, dataFieldId: string | null) => {
    setMappings((prev) => ({ ...prev, [variable]: dataFieldId }))
  }

  const handleAdd = () => {
    // Build the data_field_mappings: only include explicitly mapped fields
    const dataFieldMappings: Record<string, string> = {}
    for (const [variable, fieldId] of Object.entries(mappings)) {
      if (fieldId) {
        dataFieldMappings[variable] = fieldId
      }
    }
    onAdd(dataFieldMappings)
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{suggestion.name}</h4>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs ${categoryColor.bg} ${categoryColor.text}`}
            >
              {suggestion.category}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {suggestion.direction && (
            <div className="flex items-center gap-1 text-xs text-dark-300">
              {suggestion.direction === 'up' ? (
                <>
                  <ArrowTrendingUpIcon className="w-4 h-4 text-success-400" />
                  <span>Higher is better</span>
                </>
              ) : (
                <>
                  <ArrowTrendingDownIcon className="w-4 h-4 text-danger-400" />
                  <span>Lower is better</span>
                </>
              )}
            </div>
          )}
          {suggestion.time_period && (
            <div className="flex items-center gap-1 text-xs text-dark-300">
              <ClockIcon className="w-4 h-4 text-primary-400" />
              <span>{getTimePeriodLabel(suggestion.time_period)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {suggestion.description && (
        <p className="text-sm text-dark-300">{suggestion.description}</p>
      )}

      {/* Formula */}
      <div className={`bg-dark-900 rounded-lg p-3 ${formulaError ? 'border border-warning-500/30' : ''}`}>
        <p className="text-xs text-dark-400 mb-1">Formula</p>
        <p className="text-sm font-mono text-primary-400">{suggestion.formula}</p>
        {formulaError && (
          <div className="flex items-center gap-1.5 mt-2">
            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-warning-400 flex-shrink-0" />
            <p className="text-xs text-warning-400">{formulaError}</p>
          </div>
        )}
      </div>

      {/* Data Field Chip Selector */}
      <DataFieldChipSelector
        formulaVariables={suggestion.input_fields}
        existingDataFields={existingFields}
        mappings={mappings}
        onMappingChange={handleMappingChange}
      />

      {/* Unit indicator */}
      {suggestion.unit && (
        <p className="text-xs text-dark-400">
          Unit: <span className="text-dark-200">{suggestion.unit}</span>
        </p>
      )}

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={isAdding || !!formulaError}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 border bg-transparent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          formulaError
            ? 'border-warning-500/50 text-warning-400'
            : 'border-primary-500 text-foreground hover:bg-primary-500/10'
        }`}
      >
        {isAdding ? (
          <>
            <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            Adding KPI...
          </>
        ) : formulaError ? (
          <>
            <ExclamationTriangleIcon className="w-4 h-4" />
            Formula issue detected
          </>
        ) : (
          <>
            <CheckIcon className="w-4 h-4" />
            Add this KPI
          </>
        )}
      </button>
    </div>
  )
}
