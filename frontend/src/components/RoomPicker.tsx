import { useMemo, useRef, useState } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, FolderIcon } from '@heroicons/react/24/outline'
import type { RoomTreeNode } from '../types/room'
import { useDismiss } from '../hooks/useDismiss'

interface RoomOption {
  id: string
  name: string
  /** Breadcrumb, e.g. "Sales › North Region" */
  path: string
}

function flattenWithPaths(nodes: RoomTreeNode[], parents: string[] = []): RoomOption[] {
  return nodes.flatMap((node) => {
    const trail = [...parents, node.name]
    return [{ id: node.id, name: node.name, path: trail.join(' › ') }, ...flattenWithPaths(node.children, trail)]
  })
}

interface RoomPickerProps {
  roomTree: RoomTreeNode[]
  value: string[]
  onChange: (roomIds: string[]) => void
  autoFocus?: boolean
}

/** Multi-select rooms as chips, added through a search box with suggestions. */
export function RoomPicker({ roomTree, value, onChange, autoFocus }: RoomPickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(!!autoFocus)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useDismiss([containerRef], () => setIsOpen(false), { enabled: isOpen })

  const rooms = useMemo(() => flattenWithPaths(roomTree), [roomTree])
  const byId = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rooms
      .filter((r) => !value.includes(r.id))
      .filter((r) => !q || r.path.toLowerCase().includes(q))
      .slice(0, 8)
  }, [rooms, value, query])

  const add = (id: string) => {
    onChange([...value, id])
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.focus()
  }
  const remove = (id: string) => onChange(value.filter((v) => v !== id))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (isOpen && suggestions[activeIndex]) {
        e.preventDefault()
        add(suggestions[activeIndex].id)
      }
    } else if (e.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1])
    } else if (e.key === 'Escape' && isOpen) {
      e.stopPropagation()
      setIsOpen(false)
    }
  }

  if (rooms.length === 0) {
    return <p className="text-xs text-dark-400 py-2">No rooms created yet. Field will be organization-wide.</p>
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1.5 min-h-[42px] px-2.5 py-1.5 bg-dark-950/50 border border-dark-700 rounded-xl focus-within:border-dark-500 transition-colors cursor-text"
      >
        {value.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-dark-800 border border-dark-700 text-xs text-foreground"
            title={byId.get(id)?.path}
          >
            {byId.get(id)?.name ?? 'Unknown room'}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove(id)
              }}
              className="p-0.5 rounded text-dark-400 hover:text-foreground hover:bg-dark-700 cursor-pointer"
              aria-label={`Remove ${byId.get(id)?.name ?? 'room'}`}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
          {value.length === 0 && <MagnifyingGlassIcon className="w-3.5 h-3.5 text-dark-400 flex-shrink-0" />}
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
              setActiveIndex(0)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={value.length ? 'Add another room…' : 'Search rooms…'}
            aria-label="Search rooms"
            className="flex-1 bg-transparent text-sm text-foreground placeholder-dark-400 focus:outline-none py-1"
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-56 overflow-y-auto bg-dark-900 border border-dark-700 rounded-xl shadow-xl py-1">
          {suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-dark-400">
              {query ? `No rooms match "${query}"` : 'All rooms are already added'}
            </p>
          ) : (
            suggestions.map((room, i) => (
              <button
                key={room.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(room.id)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs cursor-pointer ${
                  i === activeIndex ? 'bg-dark-800 text-foreground' : 'text-dark-200'
                }`}
              >
                <FolderIcon className="w-3.5 h-3.5 text-dark-400 flex-shrink-0" />
                <span className="truncate">{room.path}</span>
              </button>
            ))
          )}
        </div>
      )}
      <p className="mt-1 text-[11px] text-dark-400">
        {value.length === 0 ? 'Organization-wide (no rooms selected)' : `${value.length} room${value.length !== 1 ? 's' : ''} selected`}
      </p>
    </div>
  )
}
