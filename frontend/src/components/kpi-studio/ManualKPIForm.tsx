import { ArrowPathIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { TimePeriod } from '../../types/kpi'
import type { DataField, EntryInterval } from '../../types/dataField'
import { FormulaInput } from './FormulaInput'
import { RoomSelect } from './RoomSelect'
import { cn } from '../../lib/utils'

export interface ManualDraft {
  name: string
  category: string
  formula: string
  time_period: TimePeriod
  unit: string
  direction: 'up' | 'down'
  description?: string
}

export const EMPTY_DRAFT: ManualDraft = {
  name: '',
  category: 'Sales',
  formula: '',
  time_period: 'monthly',
  unit: '',
  direction: 'up',
  description: '',
}

export const KPI_CATEGORIES = ['Sales', 'Marketing', 'Operations', 'Finance', 'Custom'] as const

export const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string; hint: string }[] = [
  { value: 'daily', label: 'Daily', hint: 'Values are entered every day' },
  { value: 'weekly', label: 'Weekly', hint: 'Values are entered once a week' },
  { value: 'monthly', label: 'Monthly', hint: 'Values are entered once a month' },
  { value: 'quarterly', label: 'Quarterly', hint: 'Values are entered once a quarter' },
  { value: 'other', label: 'Irregular', hint: 'Values are entered whenever they happen' },
]

const UNIT_PRESETS = ['%', '$', '₹', 'hrs', 'days', 'x']

/** KPI frequency → schedule for data fields created alongside it. */
export function periodToInterval(period: TimePeriod): EntryInterval {
  return period === 'daily' || period === 'weekly' || period === 'monthly' ? period : 'custom'
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors'

function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-dark-300">
        {children}
      </label>
      {hint && <span className="text-[11px] text-dark-400 text-right">{hint}</span>}
    </div>
  )
}

interface ManualKPIFormProps {
  draft: ManualDraft
  onChange: (patch: Partial<ManualDraft>) => void
  roomId: string
  onRoomChange: (roomId: string) => void
  dataFields: DataField[]
  onFieldCreated: (field: DataField) => void
  /** Lower-cased names of KPIs that already exist */
  existingNames: Set<string>
  formulaValid: boolean
  submitAttempted: boolean
  isSubmitting: boolean
  onSubmit: () => void
  onReset: () => void
}

export function ManualKPIForm({
  draft,
  onChange,
  roomId,
  onRoomChange,
  dataFields,
  onFieldCreated,
  existingNames,
  formulaValid,
  submitAttempted,
  isSubmitting,
  onSubmit,
  onReset,
}: ManualKPIFormProps) {
  const trimmedName = draft.name.trim()
  const nameTaken = trimmedName.length > 0 && existingNames.has(trimmedName.toLowerCase())
  const nameTooShort = trimmedName.length > 0 && trimmedName.length < 2
  const nameError = nameTaken
    ? 'A KPI with this name already exists — pick another name'
    : nameTooShort
      ? 'Use at least 2 characters'
      : submitAttempted && !trimmedName
        ? 'Give your KPI a name'
        : null

  const missing: string[] = []
  if (!trimmedName || nameTooShort) missing.push('a name')
  if (nameTaken) missing.push('a unique name')
  if (!formulaValid) missing.push('a valid formula')
  const canSubmit = missing.length === 0 && !isSubmitting
  const isDirty = draft.name || draft.formula || draft.description

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      noValidate
      className="w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-2xl shadow-sm"
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Build a KPI by hand</h2>
            <p className="text-xs text-dark-300 mt-0.5 leading-relaxed">
              Name it, write the formula using your data fields, then choose how it's tracked and displayed.
            </p>
          </div>
          {isDirty && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-dark-400 hover:text-foreground transition-colors cursor-pointer flex-shrink-0"
            >
              Clear form
            </button>
          )}
        </div>

        {/* 1. Name */}
        <div>
          <Label htmlFor="kpi-name">
            KPI name <span className="text-brand">*</span>
          </Label>
          <input
            id="kpi-name"
            type="text"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Net Profit Margin"
            maxLength={255}
            aria-invalid={!!nameError}
            className={cn(inputClass, nameError && 'border-danger-500/50')}
          />
          {nameError && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-danger-400">
              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
              {nameError}
            </p>
          )}
        </div>

        {/* 2. Formula */}
        <div>
          <Label hint="e.g. (revenue - expenses) / revenue * 100">
            Formula <span className="text-brand">*</span>
          </Label>
          <FormulaInput
            value={draft.formula}
            onChange={(formula) => onChange({ formula })}
            dataFields={dataFields}
            onFieldCreated={onFieldCreated}
            forceShowErrors={submitAttempted}
            defaultRoomId={roomId || undefined}
            defaultInterval={periodToInterval(draft.time_period)}
            unit={draft.unit.trim() || undefined}
          />
        </div>

        {/* 3. Category & frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="kpi-category">Category</Label>
            <select
              id="kpi-category"
              value={draft.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className={cn(inputClass, 'cursor-pointer')}
            >
              {KPI_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="kpi-period">Tracking frequency</Label>
            <select
              id="kpi-period"
              value={draft.time_period}
              onChange={(e) => onChange({ time_period: e.target.value as TimePeriod })}
              className={cn(inputClass, 'cursor-pointer')}
            >
              {TIME_PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-dark-400">
              {TIME_PERIOD_OPTIONS.find((o) => o.value === draft.time_period)?.hint}
            </p>
          </div>
        </div>

        {/* 4. Unit & direction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="kpi-unit" hint="Optional">
              Display unit
            </Label>
            <input
              id="kpi-unit"
              type="text"
              value={draft.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              placeholder="None — a plain number"
              maxLength={20}
              className={inputClass}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {UNIT_PRESETS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChange({ unit: draft.unit === u ? '' : u })}
                  aria-pressed={draft.unit === u}
                  className={cn(
                    'px-2 py-0.5 rounded-md border text-[11px] transition-colors cursor-pointer',
                    draft.unit === u
                      ? 'border-brand/50 bg-brand/10 text-brand'
                      : 'border-dark-700 text-dark-400 hover:text-foreground hover:border-dark-500'
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Good performance means</Label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Good performance means">
              {(
                [
                  { value: 'up', label: 'Higher is better', Icon: ArrowTrendingUpIcon, on: 'bg-success-500/15 border-success-500/40 text-success-400' },
                  { value: 'down', label: 'Lower is better', Icon: ArrowTrendingDownIcon, on: 'bg-success-500/15 border-success-500/40 text-success-400' },
                ] as const
              ).map(({ value, label, Icon, on }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={draft.direction === value}
                  onClick={() => onChange({ direction: value })}
                  className={cn(
                    'py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                    draft.direction === value
                      ? on
                      : 'bg-dark-950 border-dark-700 text-dark-400 hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-dark-400">
              {draft.direction === 'up'
                ? 'Increases show as green, drops as red — e.g. revenue.'
                : 'Drops show as green, increases as red — e.g. costs.'}
            </p>
          </div>
        </div>

        {/* 5. Room */}
        <div>
          <Label htmlFor="kpi-room" hint="Optional">
            Assign to room
          </Label>
          <RoomSelect id="kpi-room" value={roomId} onChange={onRoomChange} />
          <p className="mt-1 text-[11px] text-dark-400">
            The KPI appears in this room's dashboard, and new data fields are scoped to it.
          </p>
        </div>

        {/* 6. Description */}
        <div>
          <Label htmlFor="kpi-description" hint="Optional">
            Description
          </Label>
          <textarea
            id="kpi-description"
            rows={2}
            value={draft.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What does this KPI tell your team, and why does it matter?"
            className={cn(inputClass, 'resize-none')}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 px-6 py-4 border-t border-dark-800 bg-dark-900 rounded-b-2xl flex items-center justify-between gap-3">
        <p className="text-[11px] text-dark-400 min-w-0">
          {missing.length > 0 ? `To create this KPI, add ${missing.join(' and ')}.` : 'Ready to create.'}
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          aria-disabled={!canSubmit}
          className={cn(
            'px-5 py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:cursor-wait cursor-pointer flex items-center gap-2 shadow-sm flex-shrink-0',
            !canSubmit && 'opacity-50'
          )}
        >
          {isSubmitting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
          <span>{isSubmitting ? 'Creating…' : 'Create KPI'}</span>
        </button>
      </div>
    </form>
  )
}
