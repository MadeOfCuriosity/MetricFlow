import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  PlusIcon,
  CheckIcon,
  GlobeAltIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/20/solid'
import type { RoomFieldGroup, FieldEntryInput, FieldFormItem, RoomAssignee } from '../types/dataField'
import { usersService, type UserWithRooms } from '../services/users'
import { hexToRgba, MAC_TAG_COLORS } from '../constants/tagColors'
import { TagFolderIcon } from './ui/Tag'
import { getApiError } from '../lib/apiError'
import { useDismiss } from '../hooks/useDismiss'
import { useToast } from '../context/ToastContext'
import { Spinner } from './ui/Spinner'
import { TreeGuides, rowActionsClass } from './ui/Tree'

interface FieldValues {
  [dataFieldId: string]: string
}

interface DataEntryFormProps {
  rooms: RoomFieldGroup[]
  onSubmit: (entries: FieldEntryInput[]) => Promise<void>
  isSubmitting: boolean
  /** Admins can assign / unassign people from each room */
  canAssign?: boolean
  /** Lets a Save button elsewhere on the page submit this form (<button form={formId}>) */
  formId?: string
  /** Number of fields with unsaved values, for that Save button's badge */
  onChangedCountChange?: (count: number) => void
}

// ---------- small building blocks ----------

// Same palette as room tags, minus gray
const AVATAR_COLORS = MAC_TAG_COLORS.filter((c) => c.id !== 'gray').map((c) => c.hex)

function avatarColor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const color = avatarColor(name)
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0 ${
        size === 'sm' ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'
      }`}
      style={{ backgroundColor: hexToRgba(color, 0.2), color, boxShadow: `inset 0 0 0 1px ${hexToRgba(color, 0.4)}` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

/** Slim "3/4 ▬▬▬░ 75%" meter for tree rows */
function RowProgress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <span className="inline-flex items-center gap-2 text-[11px] tabular-nums">
      <span className="text-dark-400 w-9 text-right">
        {done}/{total}
      </span>
      <span className="w-24 h-1.5 rounded-full bg-dark-800 overflow-hidden">
        <span
          className={`block h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-success-400' : 'bg-success-500/80'}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className={`w-8 ${pct === 100 ? 'text-success-400' : 'text-dark-300'}`}>{pct}%</span>
    </span>
  )
}

/** Room assignment popover (admins): toggle which room-admin users are responsible for the room */
function AssignPopover({
  roomId,
  assignees,
  onChange,
}: {
  roomId: string
  assignees: RoomAssignee[]
  onChange: (next: RoomAssignee[]) => void
}) {
  const { error: showError } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<UserWithRooms[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss([ref], () => setIsOpen(false), { enabled: isOpen, escape: true })

  const open = async () => {
    setIsOpen((o) => !o)
    if (!users) {
      try {
        const res = await usersService.getUsers()
        setUsers(res.users.filter((u) => u.role === 'room_admin'))
      } catch (err) {
        setUsers([])
        showError('Could not load users', getApiError(err, 'Please try again'))
      }
    }
  }

  const toggle = async (user: UserWithRooms) => {
    const assigned = user.assigned_rooms.some((r) => r.id === roomId)
    const roomIds = assigned
      ? user.assigned_rooms.filter((r) => r.id !== roomId).map((r) => r.id)
      : [...user.assigned_rooms.map((r) => r.id), roomId]
    setBusyId(user.id)
    try {
      const updated = await usersService.updateUserRooms(user.id, { room_ids: roomIds })
      setUsers((prev) => prev?.map((u) => (u.id === user.id ? updated : u)) ?? null)
      onChange(
        assigned
          ? assignees.filter((a) => a.id !== user.id)
          : [...assignees, { id: user.id, name: user.name }].sort((a, b) => a.name.localeCompare(b.name))
      )
    } catch (err) {
      showError('Could not update assignment', getApiError(err, 'Please try again'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={open}
        className="w-6 h-6 rounded-full border border-dashed border-dark-600 text-dark-400 hover:text-foreground hover:border-dark-400 flex items-center justify-center transition-colors cursor-pointer"
        title="Assign people"
        aria-label="Assign people"
      >
        <PlusIcon className="w-3.5 h-3.5 stroke-[2]" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-60 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl py-1.5">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-dark-400">Responsible for this room</p>
          {users === null ? (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          ) : users.length === 0 ? (
            <p className="px-3 py-2 text-xs text-dark-400">
              No room admins yet.{' '}
              <Link to="/settings#users" className="text-brand hover:underline">
                Invite one
              </Link>
            </p>
          ) : (
            users.map((u) => {
              const assigned = u.assigned_rooms.some((r) => r.id === roomId)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u)}
                  disabled={busyId === u.id}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs text-dark-200 hover:bg-dark-800 disabled:opacity-50 cursor-pointer"
                >
                  <Avatar name={u.name} />
                  <span className="flex-1 truncate">{u.name}</span>
                  {busyId === u.id ? (
                    <Spinner size="xs" />
                  ) : (
                    assigned && <CheckIcon className="w-3.5 h-3.5 text-success-400 stroke-[2.5]" />
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/** One value row in an entry tree: status circle, name, optional meta, who entered it, value input. */
export function EntryFieldRow({
  inputId,
  name,
  meta,
  done,
  changed,
  value,
  onChange,
  unit,
  error,
  enteredBy,
}: {
  inputId: string
  name: string
  meta?: ReactNode
  done: boolean
  changed: boolean
  value: string
  onChange: (value: string) => void
  unit?: string | null
  error?: string
  enteredBy?: string | null
}) {
  return (
    <div>
      <div className="flex items-center min-h-[40px] pr-2 rounded-lg hover:bg-dark-800/40 focus-within:bg-dark-800/40 transition-colors">
        <TreeGuides depth={1} />
        <span className="w-5 flex items-center justify-center flex-shrink-0">
          {done && !changed ? (
            <CheckCircleIcon className="w-4 h-4 text-foreground/90" aria-label="Completed" />
          ) : changed ? (
            <span className="w-4 h-4 rounded-full border-2 border-brand flex items-center justify-center" aria-label="Unsaved">
              <span className="w-1 h-1 rounded-full bg-brand" />
            </span>
          ) : (
            <span className="w-4 h-4 rounded-full border-[1.5px] border-dark-500" aria-label="To do" />
          )}
        </span>

        <label htmlFor={inputId} className="flex items-baseline gap-2 flex-1 min-w-0 ml-2 cursor-text">
          <span className={`text-sm truncate ${done ? 'text-dark-300' : 'text-foreground'}`}>{name}</span>
          {meta && <span className="text-[11px] text-dark-500 truncate">{meta}</span>}
        </label>

        {enteredBy && (
          <span
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-dark-500 mr-4 flex-shrink-0"
            title={`Entered by ${enteredBy}`}
          >
            <Avatar name={enteredBy} size="sm" />
            {enteredBy.split(' ')[0]}
          </span>
        )}

        <div className="relative flex-shrink-0">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="—"
            aria-invalid={!!error}
            className={`w-36 pl-3 ${unit ? 'pr-9' : 'pr-3'} py-1.5 bg-dark-950/60 border rounded-lg text-sm text-right tabular-nums text-foreground placeholder-dark-500 focus:outline-none transition-colors ${
              error
                ? 'border-danger-500/60 focus:border-danger-400'
                : changed
                  ? 'border-brand/50 focus:border-brand'
                  : 'border-dark-700 focus:border-dark-500'
            }`}
          />
          {unit && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-dark-500 pointer-events-none">
              {unit}
            </span>
          )}
        </div>
      </div>
      {error && <p className="text-[11px] text-danger-400 -mt-0.5 mb-1 ml-12 font-medium">{error}</p>}
    </div>
  )
}

// ---------- main form ----------

export function DataEntryForm({
  rooms,
  onSubmit,
  isSubmitting,
  canAssign = false,
  formId,
  onChangedCountChange,
}: DataEntryFormProps) {
  const [values, setValues] = useState<FieldValues>(() => {
    const initial: FieldValues = {}
    rooms.forEach((room) =>
      room.fields.forEach((field) => {
        initial[field.data_field_id] = field.today_value?.toString() || ''
      })
    )
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [emptySubmitWarning, setEmptySubmitWarning] = useState(false)
  // Assignment edits made from the rows (kept locally so typed values aren't lost to a reload)
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, RoomAssignee[]>>({})
  // Rooms with work left start expanded
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(rooms.filter((r) => r.fields.every((f) => f.has_entry_today)).map((r) => r.room_id ?? '__unassigned__'))
  )
  const toggleRoom = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const handleValueChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    setEmptySubmitWarning(false)
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  // A field is "changed" when its input differs from the saved value
  const isChanged = (field: FieldFormItem) => {
    const v = values[field.data_field_id]?.trim() ?? ''
    return v !== '' && v !== (field.today_value?.toString() ?? '')
  }

  const changedCount = useMemo(() => {
    const ids = new Set<string>()
    rooms.forEach((r) => r.fields.forEach((f) => isChanged(f) && ids.add(f.data_field_id)))
    return ids.size
  }, [rooms, values]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onChangedCountChange?.(changedCount)
  }, [changedCount, onChangedCountChange])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    let hasAnyValue = false
    rooms.forEach((room) =>
      room.fields.forEach((field) => {
        const val = values[field.data_field_id]?.trim()
        if (val) {
          hasAnyValue = true
          if (isNaN(parseFloat(val))) newErrors[field.data_field_id] = 'Must be a number'
        }
      })
    )
    setErrors(newErrors)
    if (!hasAnyValue) {
      setEmptySubmitWarning(true)
      return false
    }
    setEmptySubmitWarning(false)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    const entries: FieldEntryInput[] = []
    const seen = new Set<string>()
    rooms.forEach((room) =>
      room.fields.forEach((field) => {
        const val = values[field.data_field_id]?.trim()
        // A field shared by several rooms appears under each — submit it once
        if (val && !isNaN(parseFloat(val)) && !seen.has(field.data_field_id)) {
          seen.add(field.data_field_id)
          entries.push({ data_field_id: field.data_field_id, value: parseFloat(val) })
        }
      })
    )
    if (entries.length > 0) await onSubmit(entries)
  }

  // "No schedule" fields are optional (log if it happened): shown in their own group, not counted as due
  const { scheduledRooms, unscheduled } = useMemo(() => {
    const seen = new Set<string>()
    const unscheduled: FieldFormItem[] = []
    rooms.forEach((r) =>
      r.fields.forEach((f) => {
        if (f.entry_interval === 'custom' && !seen.has(f.data_field_id)) {
          seen.add(f.data_field_id)
          unscheduled.push(f)
        }
      })
    )
    const scheduledRooms = rooms
      .map((r) => ({ ...r, fields: r.fields.filter((f) => f.entry_interval !== 'custom') }))
      .filter((r) => r.fields.length > 0)
    return { scheduledRooms, unscheduled }
  }, [rooms])

  // Overall progress counts each field once even if it sits in several rooms
  const { totalFields, completedFields } = useMemo(() => {
    const all = new Map<string, boolean>()
    scheduledRooms.forEach((r) =>
      r.fields.forEach((f) => all.set(f.data_field_id, f.has_entry_today || !!all.get(f.data_field_id)))
    )
    return { totalFields: all.size, completedFields: [...all.values()].filter(Boolean).length }
  }, [scheduledRooms])
  const [unscheduledOpen, setUnscheduledOpen] = useState(true)
  const overallPct = totalFields ? Math.round((completedFields / totalFields) * 100) : 0

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {/* Overall progress */}
      {totalFields > 0 && (
      <div className="flex items-center gap-4 px-4 py-3 bg-dark-900 border border-dark-700 rounded-2xl">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 flex-shrink-0">Overall</span>
        <div className="flex-1 h-2 rounded-full bg-dark-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success-500 to-success-400 transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <span className="text-xs text-dark-300 tabular-nums flex-shrink-0">
          <span className="font-semibold text-foreground">{completedFields}</span> / {totalFields} fields
        </span>
        <span
          className={`text-sm font-bold tabular-nums w-11 text-right flex-shrink-0 ${
            overallPct === 100 ? 'text-success-400' : 'text-foreground'
          }`}
        >
          {overallPct}%
        </span>
        {changedCount > 0 && (
          <span className="text-[11px] text-brand flex-shrink-0">{changedCount} unsaved</span>
        )}
      </div>
      )}

      {/* Explorer tree: rooms are folders, fields are rows */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-2 select-none">
        {scheduledRooms.map((room, roomIndex) => {
          const roomKey = room.room_id ?? '__unassigned__'
          const done = room.fields.filter((f) => f.has_entry_today).length
          const assignees = (room.room_id && assigneeOverrides[room.room_id]) || room.assignees || []
          const isOpen = !collapsed.has(roomKey)

          return (
            <div key={roomKey} className={roomIndex > 0 ? 'mt-1' : ''}>
              {/* Room (folder) row */}
              <div className="group flex items-center h-10 pr-2 rounded-lg hover:bg-dark-800/60 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleRoom(roomKey)}
                  className="flex items-center flex-1 min-w-0 h-full text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="w-5 flex items-center justify-center flex-shrink-0 text-dark-400">
                    {isOpen ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="relative flex items-center justify-center flex-shrink-0 mr-2">
                    {room.room_id ? <TagFolderIcon color={room.room_color} open={isOpen} /> : <GlobeAltIcon className="h-4 w-4 text-dark-300" />}
                  </span>
                  <span className="text-sm font-semibold text-foreground truncate">{room.room_name}</span>
                  {done === room.fields.length && <CheckCircleIcon className="w-4 h-4 text-success-400 ml-1.5 flex-shrink-0" />}
                </button>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <RowProgress done={done} total={room.fields.length} />

                  {/* Assignees */}
                  <div className="hidden sm:flex items-center gap-1.5 min-w-[120px] justify-end">
                    {room.room_id ? (
                      <>
                        {assignees.length === 0 ? (
                          <span className="text-[11px] text-dark-500">Unassigned</span>
                        ) : (
                          <span className="flex -space-x-1.5" title={assignees.map((a) => a.name).join(', ')}>
                            {assignees.slice(0, 4).map((a) => (
                              <span key={a.id} className="rounded-full ring-2 ring-dark-900">
                                <Avatar name={a.name} />
                              </span>
                            ))}
                            {assignees.length > 4 && (
                              <span className="w-6 h-6 rounded-full ring-2 ring-dark-900 bg-dark-800 text-[10px] text-dark-300 flex items-center justify-center">
                                +{assignees.length - 4}
                              </span>
                            )}
                          </span>
                        )}
                        {canAssign && (
                          <AssignPopover
                            roomId={room.room_id}
                            assignees={assignees}
                            onChange={(next) => setAssigneeOverrides((prev) => ({ ...prev, [room.room_id as string]: next }))}
                          />
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-dark-500">Organization-wide</span>
                    )}
                  </div>

                  <div className={`${rowActionsClass} w-6`}>
                    {room.room_id && (
                      <Link
                        to={`/rooms/${room.room_id}`}
                        className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-700 rounded transition-colors"
                        title="Open room"
                        aria-label={`Open ${room.room_name}`}
                      >
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Field rows */}
              {isOpen &&
                room.fields.map((field) => {
                  const changed = isChanged(field)
                  const isPeriodic = field.entry_interval === 'weekly' || field.entry_interval === 'monthly'
                  const inputId = `entry-${roomKey}-${field.data_field_id}`
                  return (
                    <EntryFieldRow
                      key={field.data_field_id}
                      inputId={inputId}
                      name={field.data_field_name}
                      meta={
                        isPeriodic && field.period_end ? `Due by ${format(parseISO(field.period_end), 'MMM d')}` : undefined
                      }
                      done={field.has_entry_today}
                      changed={changed}
                      value={values[field.data_field_id] || ''}
                      onChange={(v) => handleValueChange(field.data_field_id, v)}
                      unit={field.unit}
                      error={errors[field.data_field_id]}
                      enteredBy={field.entered_by_name}
                    />
                  )
                })}
            </div>
          )
        })}

        {unscheduled.length > 0 && (
          <div className={scheduledRooms.length > 0 ? 'mt-1 pt-1 border-t border-dark-800' : ''}>
            <div className="group flex items-center h-10 pr-2 rounded-lg hover:bg-dark-800/60 transition-colors">
              <button
                type="button"
                onClick={() => setUnscheduledOpen((o) => !o)}
                className="flex items-center flex-1 min-w-0 h-full text-left cursor-pointer"
                aria-expanded={unscheduledOpen}
              >
                <span className="w-5 flex items-center justify-center flex-shrink-0 text-dark-400">
                  {unscheduledOpen ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                </span>
                <BoltIcon className="h-4 w-4 text-dark-300 flex-shrink-0 mr-2" />
                <span className="text-sm font-semibold text-foreground">No schedule</span>
                <span className="ml-2 text-[11px] text-dark-500 truncate">Optional · log only if it happened today</span>
              </button>
            </div>
            {unscheduledOpen &&
              unscheduled.map((field) => (
                <EntryFieldRow
                  key={field.data_field_id}
                  inputId={`entry-unscheduled-${field.data_field_id}`}
                  name={field.data_field_name}
                  done={field.has_entry_today}
                  changed={isChanged(field)}
                  value={values[field.data_field_id] || ''}
                  onChange={(v) => handleValueChange(field.data_field_id, v)}
                  unit={field.unit}
                  error={errors[field.data_field_id]}
                  enteredBy={field.entered_by_name}
                />
              ))}
          </div>
        )}
      </div>

      {/* Warnings */}
      {emptySubmitWarning && (
        <div className="flex items-center gap-2 p-3.5 bg-warning-500/10 border border-warning-500/20 rounded-2xl">
          <ExclamationCircleIcon className="w-5 h-5 text-warning-400 flex-shrink-0" />
          <p className="text-xs text-warning-400 font-medium">Please enter at least one value before saving.</p>
        </div>
      )}
      {Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-2 p-3.5 bg-danger-500/10 border border-danger-500/20 rounded-2xl">
          <ExclamationCircleIcon className="w-5 h-5 text-danger-400 flex-shrink-0" />
          <p className="text-xs text-danger-400 font-medium">
            {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's have' : ' has'} invalid values. Please fix
            the errors above.
          </p>
        </div>
      )}

      {/* Without an external Save button, keep one here */}
      {!formId && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-primary-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Entries'}
          </button>
        </div>
      )}
    </form>
  )
}
