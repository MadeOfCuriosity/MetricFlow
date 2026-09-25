import { useState, useEffect, useRef, ReactNode } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import type { DataField, CreateDataFieldData, EntryInterval } from '../types/dataField'
import { dataFieldsApi } from '../services/dataFields'
import { getApiError } from '../lib/apiError'
import { Modal } from './ui/Modal'
import { RoomPicker } from './RoomPicker'
import { IntervalBadge } from './IntervalBadge'
import { SegmentedControl } from './ui/SegmentedControl'
import { format, addDays, parseISO } from 'date-fns'

const isoDay = (d: Date) => format(d, 'yyyy-MM-dd')

/** Human description of when a field's periods run. */
function describeSchedule(interval: EntryInterval, start: string | null | undefined): string {
  if (interval === 'custom') return 'Irregular — logged only when it happens'
  if (interval === 'daily') return 'Every day'
  if (!start) return interval === 'weekly' ? 'Every week (Mon–Sun)' : 'Every month (from the 1st)'
  const d = parseISO(start)
  return interval === 'weekly'
    ? `Every week from ${format(d, 'EEE, MMM d, yyyy')} · ${format(d, 'EEE')} → ${format(addDays(d, 6), 'EEE')}`
    : `Every month from ${format(d, 'MMM d, yyyy')} · the ${format(d, 'do')} of each month`
}

/** Today / Tomorrow / Pick a date — the first day of the first weekly/monthly period. */
function StartDateChooser({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = isoDay(new Date())
  const tomorrow = isoDay(addDays(new Date(), 1))
  const [picking, setPicking] = useState(value !== today && value !== tomorrow)
  const mode = picking ? 'pick' : value === tomorrow ? 'tomorrow' : 'today'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        size="xs"
        surface="inset"
        aria-label="Start date"
        value={mode}
        onChange={(m) => {
          setPicking(m === 'pick')
          if (m === 'today') onChange(today)
          if (m === 'tomorrow') onChange(tomorrow)
        }}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'tomorrow', label: 'Tomorrow' },
          { value: 'pick', label: 'Pick date' },
        ]}
      />
      {picking && (
        <input
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Start date"
          className="px-2.5 py-1.5 bg-dark-950/50 border border-dark-700 rounded-lg text-xs text-foreground focus:outline-none focus:border-dark-500 [color-scheme:dark]"
        />
      )}
    </div>
  )
}

interface DataFieldFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called after a create or a save */
  onCreated: (field: DataField) => void
  /** Existing field: opens read-only, each value becomes editable on click. Omit to create. */
  editField?: DataField | null
  onDelete?: (field: DataField) => void
}

type FieldKey = 'name' | 'rooms' | 'unit' | 'interval' | 'description'
const ALL_KEYS: FieldKey[] = ['name', 'rooms', 'unit', 'interval', 'description']

function generateVariableName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase() || 'unnamed_field'
  )
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors'

/** Label + value; the value is a button that swaps to an editor when clicked. */
function EditableRow({
  label,
  isEditing,
  onEdit,
  view,
  children,
}: {
  label: string
  isEditing: boolean
  onEdit: () => void
  view: ReactNode
  children: ReactNode
}) {
  return (
    <div className="py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-1">{label}</p>
      {isEditing ? (
        children
      ) : (
        <button
          type="button"
          onClick={onEdit}
          title={`Edit ${label.toLowerCase()}`}
          className="group w-full flex items-center justify-between gap-3 -mx-2 px-2 py-1.5 rounded-lg text-left text-sm text-foreground hover:bg-dark-800/60 transition-colors cursor-text"
        >
          <span className="min-w-0">{view}</span>
          <PencilIcon className="w-3.5 h-3.5 text-dark-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      )}
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

/**
 * Create a data field, or view one and edit it in place: every value is read-only
 * until clicked. Also offers Delete for existing fields.
 */
export function DataFieldFormModal({ isOpen, onClose, onCreated, editField, onDelete }: DataFieldFormModalProps) {
  const { roomTree } = useRoom()
  const nameInputRef = useRef<HTMLInputElement>(null)
  // Snapshot what is shown while open, so the closing animation doesn't flip modes
  const shown = useRef<DataField | null>(null)
  if (isOpen) shown.current = editField ?? null
  const field = shown.current
  const isCreate = !field

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('')
  const [roomIds, setRoomIds] = useState<string[]>([])
  const [entryInterval, setEntryInterval] = useState<EntryInterval>('daily')
  const [periodStart, setPeriodStart] = useState(isoDay(new Date()))
  const [editing, setEditing] = useState<Set<FieldKey>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetFrom = (f: DataField | null | undefined) => {
    setName(f?.name ?? '')
    setDescription(f?.description ?? '')
    setUnit(f?.unit ?? '')
    setRoomIds(f?.room_ids ?? [])
    setEntryInterval(f?.entry_interval || 'daily')
    setPeriodStart(f?.period_start_date || isoDay(new Date()))
    setEditing(f ? new Set() : new Set(ALL_KEYS))
    setError(null)
  }

  useEffect(() => {
    if (isOpen) resetFrom(editField)
  }, [isOpen, editField?.id])

  const startEdit = (key: FieldKey) => setEditing((prev) => new Set(prev).add(key))
  const isEditing = (key: FieldKey) => editing.has(key)
  const hasEdits = isCreate || editing.size > 0
  const isPeriodic = entryInterval === 'weekly' || entryInterval === 'monthly'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setIsSubmitting(true)
    try {
      if (editField) {
        const updated = await dataFieldsApi.update(editField.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          unit: unit.trim() || undefined,
          room_ids: roomIds,
          entry_interval: entryInterval,
          ...(isPeriodic ? { period_start_date: periodStart } : {}),
        })
        onCreated(updated)
      } else {
        const data: CreateDataFieldData = {
          name: name.trim(),
          description: description.trim() || undefined,
          unit: unit.trim() || undefined,
          room_ids: roomIds.length > 0 ? roomIds : undefined,
          entry_interval: entryInterval,
          ...(isPeriodic ? { period_start_date: periodStart } : {}),
        }
        onCreated(await dataFieldsApi.create(data))
      }
      onClose()
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to save data field'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const kpiRoomPaths = field?.kpi_room_paths ?? []
  const roomView =
    field && (field.room_paths.length > 0 || kpiRoomPaths.length > 0) ? (
      <span className="flex flex-wrap gap-1.5">
        {field.room_paths.map((p) => (
          <span key={p} className="px-2 py-0.5 rounded-lg bg-dark-800 border border-dark-700 text-xs">
            {p}
          </span>
        ))}
        {kpiRoomPaths.map((p) => (
          <span
            key={`kpi-${p}`}
            className="px-2 py-0.5 rounded-lg border border-dashed border-dark-600 text-xs text-dark-300"
            title="Inherited: a KPI in this room uses this field"
          >
            {p} <span className="text-dark-500">· via KPI</span>
          </span>
        ))}
      </span>
    ) : (
      <span className="text-dark-500 italic">Organization-wide</span>
    )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      initialFocus={isCreate ? nameInputRef : undefined}
      className="w-full max-w-md transform rounded-2xl bg-dark-900 border border-dark-700 p-6 shadow-2xl transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <Dialog.Title className="text-base font-bold text-foreground tracking-tight truncate">
            {isCreate ? 'Create Data Field' : field?.name}
          </Dialog.Title>
          {!isCreate && <p className="text-[11px] text-dark-400 mt-0.5">Click any value to edit it</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-800 transition-colors cursor-pointer"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-3 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="divide-y divide-dark-800">
          <EditableRow label="Name" isEditing={isEditing('name')} onEdit={() => startEdit('name')} view={field?.name}>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Revenue, Deals Closed, Marketing Spend"
              className={inputClass}
              autoFocus
              required
              maxLength={255}
              aria-label="Name"
            />
            {isCreate && name.trim() && (
              <p className="mt-1 text-xs text-dark-400">
                Variable name:{' '}
                <code className="text-brand font-mono text-[11px] bg-dark-950 px-1.5 py-0.5 rounded border border-dark-800">
                  {generateVariableName(name)}
                </code>
              </p>
            )}
          </EditableRow>

          {field && (
            <InfoRow label="Variable">
              <code className="text-[11px] font-mono text-dark-300 bg-dark-950 px-2 py-0.5 rounded-md border border-dark-800">
                {field.variable_name}
              </code>
            </InfoRow>
          )}

          <EditableRow label="Rooms" isEditing={isEditing('rooms')} onEdit={() => startEdit('rooms')} view={roomView}>
            <RoomPicker roomTree={roomTree} value={roomIds} onChange={setRoomIds} autoFocus={!isCreate} />
            {kpiRoomPaths.length > 0 && (
              <p className="mt-1 text-[11px] text-dark-400">Also in {kpiRoomPaths.join(', ')} through its KPIs.</p>
            )}
          </EditableRow>

          <div className="grid grid-cols-2 gap-4">
            <EditableRow
              label="Unit"
              isEditing={isEditing('unit')}
              onEdit={() => startEdit('unit')}
              view={field?.unit || <span className="text-dark-500">—</span>}
            >
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="$, %, hours…"
                className={inputClass}
                autoFocus={!isCreate}
                maxLength={50}
                aria-label="Unit"
              />
            </EditableRow>

            <EditableRow
              label="Frequency"
              isEditing={isEditing('interval')}
              onEdit={() => startEdit('interval')}
              view={<IntervalBadge interval={field?.entry_interval} />}
            >
              <select
                value={entryInterval}
                onChange={(e) => setEntryInterval(e.target.value as EntryInterval)}
                className={`${inputClass} cursor-pointer`}
                autoFocus={!isCreate}
                aria-label="Frequency"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">No schedule</option>
              </select>
            </EditableRow>
          </div>

          {isEditing('interval') ? (
            <div className="py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-1.5">
                {isPeriodic ? 'Starts' : 'Schedule'}
              </p>
              {isPeriodic ? (
                <>
                  <StartDateChooser value={periodStart} onChange={setPeriodStart} />
                  <p className="mt-1.5 text-[11px] text-dark-400">{describeSchedule(entryInterval, periodStart)}</p>
                </>
              ) : (
                <p className="text-[11px] text-dark-400">{describeSchedule(entryInterval, null)}</p>
              )}
            </div>
          ) : (
            field && (
              <EditableRow
                label="Schedule"
                isEditing={false}
                onEdit={() => startEdit('interval')}
                view={<span className="text-xs text-dark-200">{describeSchedule(field.entry_interval, field.period_start_date)}</span>}
              >
                {null}
              </EditableRow>
            )
          )}

          <EditableRow
            label="Description"
            isEditing={isEditing('description')}
            onEdit={() => startEdit('description')}
            view={field?.description || <span className="text-dark-500 italic">No description</span>}
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className={`${inputClass} resize-none`}
              autoFocus={!isCreate}
              aria-label="Description"
            />
          </EditableRow>

          {field && (
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Used by KPIs">{field.kpi_count}</InfoRow>
              <InfoRow label="Latest value">
                {field.latest_value !== null ? (
                  <>
                    <span className="font-semibold">
                      {field.unit === '$' ? '$' : ''}
                      {field.latest_value.toLocaleString()}
                      {field.unit === '%' ? '%' : ''}
                    </span>
                    {field.latest_date && (
                      <span className="text-[10px] text-dark-400 ml-1.5">
                        ({new Date(field.latest_date).toLocaleDateString()})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-dark-500">No data</span>
                )}
              </InfoRow>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 pt-4 mt-2 border-t border-dark-800">
          {!isCreate && !hasEdits && onDelete && field ? (
            <button
              type="button"
              onClick={() => onDelete(field)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete</span>
            </button>
          ) : (
            <span />
          )}

          {hasEdits ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => (isCreate ? onClose() : resetFrom(editField))}
                className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground transition-colors cursor-pointer"
              >
                {isCreate ? 'Cancel' : 'Discard'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-primary-500 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : isCreate ? 'Create Field' : 'Save changes'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
