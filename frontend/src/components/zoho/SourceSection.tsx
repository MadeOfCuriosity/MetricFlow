import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { ArrowRightIcon, ChevronDownIcon, PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { ExternalField, ZohoBooksModule, ZohoBooksPreviewRow } from '../../types/integration'
import type { DataField } from '../../types/dataField'
import { cn } from '../../lib/utils'
import { Spinner } from '../ui/Spinner'
import {
  AGGREGATIONS,
  GL_AGGREGATIONS,
  fieldLabel,
  previewValue,
  sourceById,
  valueLabel,
  type ZohoAggregation,
} from './catalog'

export interface MappingRow {
  id: string
  field: string
  /** Label Zoho gave the field, if any */
  zohoLabel?: string
  aggregation: ZohoAggregation
  on: boolean
  /** Added by the user via "Add another value" (removable) */
  custom: boolean
  /** Save to an existing field, or create one with this name */
  target: { existingId: string } | { newName: string }
}

export interface SourceUnit {
  key: string
  module: ZohoBooksModule
  glAccount?: { id: string; name: string }
  name: string
  rows: MappingRow[]
}

export type PreviewState = ZohoBooksPreviewRow[] | 'loading' | 'error'

interface SourceSectionProps {
  unit: SourceUnit
  open: boolean
  onToggle?: () => void
  onChange: (unit: SourceUnit) => void
  dataFields: DataField[]
  /** data_field_id → name of the integration already filling it */
  fedBy: Record<string, string>
  errors: Record<string, string>
  zohoFields?: ExternalField[] | 'loading' | 'error'
  preview?: PreviewState
  /** Edit mode shows the section without the collapsible header */
  flat?: boolean
}

let rowSeq = 0
export const newRowId = () => `row_${++rowSeq}`

const selectClass =
  'w-full appearance-none bg-dark-800 border border-dark-700 rounded-lg pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:border-dark-500 disabled:opacity-60'

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select {...props} className={selectClass}>{children}</select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-400" />
    </div>
  )
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

export function targetName(row: MappingRow, dataFields: DataField[]) {
  if ('newName' in row.target) return row.target.newName
  const id = row.target.existingId
  return dataFields.find(f => f.id === id)?.name ?? 'Field'
}

export function SourceSection({
  unit, open, onToggle, onChange, dataFields, fedBy, errors, zohoFields, preview, flat,
}: SourceSectionProps) {
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const isGl = !!sourceById(unit.module)?.gl
  const aggregations = isGl ? GL_AGGREGATIONS : AGGREGATIONS
  const onRows = unit.rows.filter(r => r.on)

  const updateRow = (id: string, patch: Partial<MappingRow>) =>
    onChange({ ...unit, rows: unit.rows.map(r => (r.id === id ? { ...r, ...patch } : r)) })

  // Values not yet in the list: numeric Zoho fields, plus a record count
  const addable = useMemo(() => {
    if (!Array.isArray(zohoFields)) return []
    const used = new Set(unit.rows.filter(r => r.aggregation !== 'count').map(r => r.field))
    const numeric = zohoFields.filter(f => f.field_type === 'number' && !used.has(f.name))
    const options = numeric.map(f => ({
      field: f.name, aggregation: 'sum' as ZohoAggregation,
      label: fieldLabel(f.name, f.label), zohoLabel: f.label, hint: f.name,
    }))
    const countField = unit.rows[0]?.field ?? zohoFields.find(f => f.field_type === 'number')?.name
    if (countField && !unit.rows.some(r => r.aggregation === 'count')) {
      options.unshift({
        field: countField, aggregation: 'count', label: valueLabel(unit.module, countField, 'count'),
        zohoLabel: undefined as unknown as string, hint: 'records',
      })
    }
    const q = search.trim().toLowerCase()
    return q ? options.filter(o => `${o.label} ${o.hint}`.toLowerCase().includes(q)) : options
  }, [zohoFields, unit.rows, unit.module, search])

  const addValue = (o: (typeof addable)[number]) => {
    onChange({
      ...unit,
      rows: [...unit.rows, {
        id: newRowId(), field: o.field, zohoLabel: o.zohoLabel, aggregation: o.aggregation,
        on: true, custom: true, target: { newName: o.label },
      }],
    })
    setAdding(false)
    setSearch('')
  }

  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => format(subDays(new Date(), 4 - i), 'yyyy-MM-dd')),
    [],
  )

  const summary = onRows.length
    ? `${onRows.length} ${onRows.length === 1 ? 'value' : 'values'} → ${onRows.map(r => targetName(r, dataFields)).join(', ')}`
    : 'Nothing selected'
  const hasError = unit.rows.some(r => errors[r.id]) || onRows.length === 0

  return (
    <div className={cn(
      'rounded-xl overflow-hidden',
      !flat && 'border bg-dark-850',
      !flat && (hasError ? 'border-danger-500/40' : open ? 'border-dark-600' : 'border-dark-700'),
    )}>
      {!flat && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-dark-800/60 transition-colors"
        >
          <span className="w-6 h-6 rounded-md bg-[#4BC882] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">ZB</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground truncate">{unit.name}</span>
            <span className="block text-xs text-dark-400 truncate">{summary}</span>
          </span>
          {onRows.length === 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warning-400 border border-warning-500/40 rounded px-1.5 py-0.5">Pick a value</span>
          )}
          <ChevronDownIcon className={cn('w-4 h-4 text-dark-400 transition-transform', open && 'rotate-180')} />
        </button>
      )}

      {(open || flat) && (
        <>
          <div className={cn(!flat && 'border-t border-dark-700', flat && 'border border-dark-700 rounded-xl overflow-hidden')}>
            {unit.rows.map((row, i) => {
              const newName = 'newName' in row.target ? row.target.newName : null
              const selectValue = newName !== null ? '__new__' : (row.target as { existingId: string }).existingId
              return (
                <div key={row.id} className={cn('px-4 py-3 bg-dark-850', i > 0 && 'border-t border-dark-700', !row.on && 'opacity-50')}>
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1.1fr)_auto_minmax(0,1fr)_auto] items-center gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={row.on}
                      aria-label={`Include ${valueLabel(unit.module, row.field, row.aggregation, row.zohoLabel)}`}
                      onClick={() => updateRow(row.id, { on: !row.on })}
                      className={cn(
                        'w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors',
                        row.on ? 'bg-brand border-brand text-white' : 'border-dark-500 text-transparent',
                      )}
                    >
                      <CheckIcon className="w-3 h-3 stroke-[3]" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {valueLabel(unit.module, row.field, row.aggregation, row.zohoLabel)}
                      </p>
                      <Select
                        className="mt-1.5 inline-block max-w-full"
                        value={row.aggregation}
                        disabled={!row.on}
                        aria-label="How to combine each day"
                        onChange={e => updateRow(row.id, { aggregation: e.target.value as ZohoAggregation })}
                      >
                        {aggregations.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </Select>
                    </div>
                    <ArrowRightIcon className="hidden sm:block w-4 h-4 text-dark-500" />
                    <div className="col-start-2 sm:col-start-auto min-w-0 space-y-1.5">
                      <Select
                        value={selectValue}
                        disabled={!row.on}
                        aria-label="Save to field"
                        onChange={e => {
                          const v = e.target.value
                          updateRow(row.id, {
                            target: v === '__new__'
                              ? { newName: valueLabel(unit.module, row.field, row.aggregation, row.zohoLabel) }
                              : { existingId: v },
                          })
                        }}
                      >
                        <option value="__new__">+ New field…</option>
                        {dataFields.map(f => (
                          <option key={f.id} value={f.id} disabled={!!fedBy[f.id]}>
                            {f.name}{fedBy[f.id] ? ` (filled by ${fedBy[f.id]})` : ''}
                          </option>
                        ))}
                      </Select>
                      {newName !== null && row.on && (
                        <input
                          value={newName}
                          onChange={e => updateRow(row.id, { target: { newName: e.target.value } })}
                          placeholder="New field name"
                          aria-label="New field name"
                          className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder-dark-500 focus:outline-none focus:border-dark-500"
                        />
                      )}
                    </div>
                    {row.custom ? (
                      <button
                        type="button"
                        onClick={() => onChange({ ...unit, rows: unit.rows.filter(r => r.id !== row.id) })}
                        className="row-start-1 col-start-3 sm:row-start-auto sm:col-start-auto p-1.5 rounded-md text-dark-400 hover:text-foreground hover:bg-dark-800 transition-colors"
                        aria-label="Remove value"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    ) : <span className="w-7" />}
                  </div>
                  {errors[row.id] && row.on && (
                    <p className="mt-2 text-xs text-danger-400 sm:pl-[30px]">{errors[row.id]}</p>
                  )}
                </div>
              )
            })}

            {/* Add another value */}
            {zohoFields === 'loading' && (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-dashed border-dark-600 text-xs text-dark-400">
                <Spinner size="xs" /> Loading values from Zoho…
              </div>
            )}
            {Array.isArray(zohoFields) && !adding && (addable.length > 0 || search) && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-4 py-3 border-t border-dashed border-dark-600 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Add another value
                <span className="ml-auto text-xs font-normal text-dark-400">{addable.length} more on {sourceById(unit.module)?.noun}</span>
              </button>
            )}
            {adding && (
              <div className="border-t border-dark-700 bg-dark-900">
                <div className="flex items-center border-b border-dark-700">
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`Search ${sourceById(unit.module)?.noun} values`}
                    className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder-dark-500 focus:outline-none"
                  />
                  <button type="button" onClick={() => { setAdding(false); setSearch('') }} className="px-4 text-xs font-semibold text-dark-400 hover:text-foreground">
                    Cancel
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {addable.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-dark-400">No matching values.</p>
                  ) : addable.map(o => (
                    <button
                      key={`${o.field}-${o.aggregation}`}
                      type="button"
                      onClick={() => addValue(o)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-dark-200 hover:bg-dark-800 border-t border-dark-800 first:border-t-0"
                    >
                      <PlusIcon className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                      <span className="truncate">{o.label}</span>
                      <span className="text-[10px] font-semibold text-dark-400 bg-dark-800 border border-dark-700 rounded px-1.5">
                        {o.aggregation === 'count' ? 'Count' : 'Amount'}
                      </span>
                      <span className="ml-auto text-[11px] text-dark-500 font-mono truncate">{o.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && onRows.length > 0 && (
            <div className={cn('px-4 py-3', !flat && 'border-t border-dark-700 bg-dark-900', flat && 'mt-4 px-0')}>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">Preview</p>
                <p className="text-[11px] text-dark-400">Last 5 days from Zoho</p>
              </div>
              {preview === 'loading' ? (
                <div className="flex items-center gap-2 py-3 text-xs text-dark-400"><Spinner size="xs" /> Fetching from Zoho…</div>
              ) : preview === 'error' ? (
                <p className="py-2 text-xs text-dark-400">Couldn't load a preview. You can still save; the first sync will show any problems.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-dark-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-dark-400">
                        <th className="text-left font-semibold px-3 py-2">Date</th>
                        {onRows.map(r => (
                          <th key={r.id} className="text-right font-semibold px-3 py-2 whitespace-nowrap">{targetName(r, dataFields)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map(d => {
                        const row = preview.find(p => p.date === d)
                        return (
                          <tr key={d} className="border-t border-dark-800">
                            <td className="px-3 py-1.5 text-dark-300 whitespace-nowrap">{format(new Date(`${d}T00:00:00`), 'd MMM')}</td>
                            {onRows.map(r => {
                              const v = previewValue(row, r.field, r.aggregation)
                              return (
                                <td key={r.id} className="px-3 py-1.5 text-right tabular-nums text-foreground">
                                  {v === null ? <span className="text-dark-500">–</span> : numberFormat.format(v)}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {!preview && isGl && !flat && (
            <p className="px-4 py-3 border-t border-dark-700 text-[11px] text-dark-400">
              GL sources read every invoice or journal, so there's no quick preview. Check the numbers after the first sync.
            </p>
          )}
        </>
      )}
    </div>
  )
}
