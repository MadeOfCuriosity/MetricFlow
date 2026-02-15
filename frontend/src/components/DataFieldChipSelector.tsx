import { useState, useRef, useEffect } from 'react'
import {
  CheckCircleIcon,
  PlusCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import type { DataField } from '../types/dataField'

interface DataFieldChipSelectorProps {
  formulaVariables: string[]
  existingDataFields: DataField[]
  mappings: Record<string, string | null>
  onMappingChange: (variable: string, dataFieldId: string | null) => void
}

const formatVarName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export function DataFieldChipSelector({
  formulaVariables,
  existingDataFields,
  mappings,
  onMappingChange,
}: DataFieldChipSelectorProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getMatchedField = (variable: string): DataField | undefined => {
    const mappedId = mappings[variable]
    if (mappedId) {
      return existingDataFields.find((f) => f.id === mappedId)
    }
    return existingDataFields.find((f) => f.variable_name === variable)
  }

  const filteredFields = existingDataFields.filter((f) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      f.name.toLowerCase().includes(q) ||
      f.variable_name.toLowerCase().includes(q) ||
      (f.room_name && f.room_name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-2">
      <p className="text-xs text-dark-400 mb-1">Data field mapping</p>
      <div className="flex flex-wrap gap-2" ref={dropdownRef}>
        {formulaVariables.map((variable) => {
          const matched = getMatchedField(variable)
          const isOpen = openDropdown === variable

          return (
            <div key={variable} className="relative">
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(isOpen ? null : variable)
                  setSearch('')
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  matched
                    ? 'bg-success-500/10 text-success-400 border-success-500/30 hover:bg-success-500/20'
                    : 'bg-warning-500/10 text-warning-400 border-warning-500/30 hover:bg-warning-500/20'
                }`}
              >
                {matched ? (
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                ) : (
                  <PlusCircleIcon className="w-3.5 h-3.5" />
                )}
                {matched ? (
                  <span>
                    {matched.name}
                    {matched.room_name && (
                      <span className="text-success-400/60 ml-1">[{matched.room_name}]</span>
                    )}
                  </span>
                ) : (
                  <span>New: {formatVarName(variable)}</span>
                )}
                <ChevronDownIcon className="w-3 h-3 ml-0.5" />
              </button>

              {/* Dropdown */}
              {isOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search fields..."
                      className="w-full px-3 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-xs text-foreground placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    {/* Create new option */}
                    <button
                      type="button"
                      onClick={() => {
                        onMappingChange(variable, null)
                        setOpenDropdown(null)
                        setSearch('')
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-dark-700 transition-colors flex items-center gap-2 ${
                        !mappings[variable] ? 'bg-dark-700' : ''
                      }`}
                    >
                      <PlusCircleIcon className="w-4 h-4 text-warning-400 flex-shrink-0" />
                      <div>
                        <span className="text-warning-400 font-medium">Create new field</span>
                        <span className="text-dark-400 ml-1">({formatVarName(variable)})</span>
                      </div>
                    </button>

                    {/* Divider */}
                    {filteredFields.length > 0 && (
                      <div className="border-t border-dark-600 my-1" />
                    )}

                    {/* Existing fields */}
                    {filteredFields.map((field) => {
                      const isSelected = mappings[variable] === field.id
                      return (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => {
                            onMappingChange(variable, field.id)
                            setOpenDropdown(null)
                            setSearch('')
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-dark-700 transition-colors flex items-center gap-2 ${
                            isSelected ? 'bg-dark-700' : ''
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircleIcon className="w-4 h-4 text-success-400 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-dark-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-foreground font-medium">{field.name}</span>
                            {field.room_name && (
                              <span className="text-dark-400 ml-1">[{field.room_name}]</span>
                            )}
                            <p className="text-dark-500 truncate">{field.variable_name}</p>
                          </div>
                        </button>
                      )
                    })}

                    {filteredFields.length === 0 && search && (
                      <div className="px-3 py-2 text-xs text-dark-400">
                        No matching fields found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
