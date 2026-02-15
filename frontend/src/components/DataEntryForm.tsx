import { useState } from 'react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import type { RoomFieldGroup, FieldEntryInput } from '../types/dataField'

interface FieldValues {
  [dataFieldId: string]: string
}

interface DataEntryFormProps {
  rooms: RoomFieldGroup[]
  onSubmit: (entries: FieldEntryInput[]) => Promise<void>
  isSubmitting: boolean
}

export function DataEntryForm({ rooms, onSubmit, isSubmitting }: DataEntryFormProps) {
  const [values, setValues] = useState<FieldValues>(() => {
    const initial: FieldValues = {}
    rooms.forEach((room) => {
      room.fields.forEach((field) => {
        initial[field.data_field_id] = field.today_value?.toString() || ''
      })
    })
    return initial
  })

  const [expandedRooms, setExpandedRooms] = useState<Set<string | null>>(() => {
    // Expand rooms that have incomplete fields
    const expanded = new Set<string | null>()
    rooms.forEach((room) => {
      const hasIncomplete = room.fields.some((f) => !f.has_entry_today)
      if (hasIncomplete) {
        expanded.add(room.room_id)
      }
    })
    return expanded
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleRoom = (roomId: string | null) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(roomId)) {
        next.delete(roomId)
      } else {
        next.add(roomId)
      }
      return next
    })
  }

  const handleValueChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    let hasAnyValue = false

    rooms.forEach((room) => {
      room.fields.forEach((field) => {
        const val = values[field.data_field_id]?.trim()
        if (val) {
          hasAnyValue = true
          if (isNaN(parseFloat(val))) {
            newErrors[field.data_field_id] = 'Must be a number'
          }
        }
      })
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && hasAnyValue
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const entries: FieldEntryInput[] = []
    rooms.forEach((room) => {
      room.fields.forEach((field) => {
        const val = values[field.data_field_id]?.trim()
        if (val && !isNaN(parseFloat(val))) {
          entries.push({
            data_field_id: field.data_field_id,
            value: parseFloat(val),
          })
        }
      })
    })

    if (entries.length > 0) {
      await onSubmit(entries)
    }
  }

  const totalFields = rooms.reduce((sum, r) => sum + r.fields.length, 0)
  const completedFields = rooms.reduce(
    (sum, r) => sum + r.fields.filter((f) => f.has_entry_today).length,
    0
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {rooms.map((room) => {
        const roomKey = room.room_id ?? '__unassigned__'
        const isExpanded = expandedRooms.has(room.room_id)
        const roomCompleted = room.fields.filter((f) => f.has_entry_today).length
        const roomTotal = room.fields.length
        const allDone = roomCompleted === roomTotal

        return (
          <div key={roomKey}>
            {/* Room header */}
            <button
              type="button"
              onClick={() => toggleRoom(room.room_id)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-dark-400" />
                <span className="text-sm font-medium text-foreground">
                  {room.room_name}
                </span>
                <span className="text-xs text-dark-400">
                  ({roomCompleted}/{roomTotal})
                </span>
                {allDone && (
                  <CheckCircleIcon className="w-4 h-4 text-success-400" />
                )}
              </div>
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-dark-300" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-dark-300" />
              )}
            </button>

            {/* Fields */}
            {isExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {room.fields.map((field) => {
                  const hasError = !!errors[field.data_field_id]
                  const hasValue = !!values[field.data_field_id]?.trim()

                  return (
                    <div
                      key={field.data_field_id}
                      className={`bg-dark-900 border rounded-xl p-4 transition-colors ${
                        field.has_entry_today
                          ? 'border-success-500/20'
                          : hasValue
                          ? 'border-primary-500/20'
                          : 'border-dark-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-foreground">
                          {field.data_field_name}
                        </label>
                        {field.has_entry_today && (
                          <CheckCircleIcon className="w-4 h-4 text-success-400 flex-shrink-0" />
                        )}
                      </div>
                      {field.unit && (
                        <p className="text-xs text-dark-400 mb-2">Unit: {field.unit}</p>
                      )}
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={values[field.data_field_id] || ''}
                          onChange={(e) =>
                            handleValueChange(field.data_field_id, e.target.value)
                          }
                          placeholder="0"
                          className={`w-full px-3 py-2 bg-dark-800 border rounded-lg text-foreground placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                            hasError ? 'border-danger-500' : 'border-dark-600'
                          }`}
                        />
                        {hasError && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <ExclamationCircleIcon className="w-5 h-5 text-danger-500" />
                          </div>
                        )}
                      </div>
                      {hasError && (
                        <p className="text-xs text-danger-400 mt-1">
                          {errors[field.data_field_id]}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Submit button */}
      <div className="flex items-center justify-between pt-4 border-t border-dark-700">
        <p className="text-sm text-dark-400">
          {completedFields} of {totalFields} fields completed
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-foreground"></div>
              Saving...
            </div>
          ) : (
            'Save entries'
          )}
        </button>
      </div>
    </form>
  )
}
