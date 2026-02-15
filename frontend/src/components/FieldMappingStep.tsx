import { useState, useEffect } from 'react'
import { ArrowRightIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { ExternalField, FieldMappingInput, AggregationType, IntegrationProvider } from '../types/integration'
import type { DataField } from '../types/dataField'

interface FieldMappingStepProps {
  provider: IntegrationProvider
  externalFields: ExternalField[]
  dataFields: DataField[]
  initialMappings?: FieldMappingInput[]
  onChange: (mappings: FieldMappingInput[]) => void
}

const AGGREGATION_OPTIONS: { value: AggregationType; label: string }[] = [
  { value: 'direct', label: 'Direct Value' },
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
]

interface MappingRow {
  id: string
  external_field_name: string
  data_field_id: string
  aggregation: AggregationType
}

let rowCounter = 0

export function FieldMappingStep({
  provider,
  externalFields,
  dataFields,
  initialMappings,
  onChange,
}: FieldMappingStepProps) {
  const [rows, setRows] = useState<MappingRow[]>(() => {
    if (initialMappings && initialMappings.length > 0) {
      return initialMappings.map(m => ({
        id: `row_${rowCounter++}`,
        external_field_name: m.external_field_name,
        data_field_id: m.data_field_id,
        aggregation: m.aggregation || 'direct',
      }))
    }
    return [{ id: `row_${rowCounter++}`, external_field_name: '', data_field_id: '', aggregation: 'direct' as AggregationType }]
  })

  const showAggregation = provider !== 'google_sheets'

  useEffect(() => {
    const validMappings: FieldMappingInput[] = rows
      .filter(r => r.external_field_name && r.data_field_id)
      .map(r => ({
        external_field_name: r.external_field_name,
        external_field_label: externalFields.find(f => f.name === r.external_field_name)?.label,
        data_field_id: r.data_field_id,
        aggregation: r.aggregation,
      }))
    onChange(validMappings)
  }, [rows])

  const addRow = () => {
    setRows([...rows, { id: `row_${rowCounter++}`, external_field_name: '', data_field_id: '', aggregation: 'direct' }])
  }

  const removeRow = (id: string) => {
    if (rows.length <= 1) return
    setRows(rows.filter(r => r.id !== id))
  }

  const updateRow = (id: string, field: keyof MappingRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Field Mappings</label>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add Mapping
        </button>
      </div>

      {/* Header */}
      <div className={`grid gap-2 text-xs text-dark-400 font-medium ${showAggregation ? 'grid-cols-[1fr_auto_1fr_auto_auto]' : 'grid-cols-[1fr_auto_1fr_auto]'}`}>
        <span>Source Field</span>
        <span></span>
        <span>MetricFlow Data Field</span>
        {showAggregation && <span>Aggregation</span>}
        <span></span>
      </div>

      {/* Mapping rows */}
      {rows.map((row) => (
        <div
          key={row.id}
          className={`grid gap-2 items-center ${showAggregation ? 'grid-cols-[1fr_auto_1fr_auto_auto]' : 'grid-cols-[1fr_auto_1fr_auto]'}`}
        >
          {/* External field select */}
          <select
            value={row.external_field_name}
            onChange={(e) => updateRow(row.id, 'external_field_name', e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select source field...</option>
            {externalFields.map((f) => (
              <option key={f.name} value={f.name}>
                {f.label} {f.field_type !== 'string' ? `(${f.field_type})` : ''}
              </option>
            ))}
          </select>

          {/* Arrow */}
          <ArrowRightIcon className="w-4 h-4 text-dark-500 flex-shrink-0" />

          {/* Data field select */}
          <select
            value={row.data_field_id}
            onChange={(e) => updateRow(row.id, 'data_field_id', e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select data field...</option>
            {dataFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.variable_name})
              </option>
            ))}
          </select>

          {/* Aggregation (CRM only) */}
          {showAggregation && (
            <select
              value={row.aggregation}
              onChange={(e) => updateRow(row.id, 'aggregation', e.target.value)}
              className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 w-28"
            >
              {AGGREGATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {/* Remove button */}
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            disabled={rows.length <= 1}
            className="p-1.5 text-dark-400 hover:text-danger-400 rounded transition-colors disabled:opacity-30"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}

      {rows.filter(r => r.external_field_name && r.data_field_id).length === 0 && (
        <p className="text-xs text-dark-400 mt-1">
          Map at least one source field to a MetricFlow data field to enable syncing.
        </p>
      )}
    </div>
  )
}
