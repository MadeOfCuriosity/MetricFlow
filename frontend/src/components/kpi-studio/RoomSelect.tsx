import { useMemo } from 'react'
import { FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useRoom } from '../../context/RoomContext'
import type { RoomTreeNode } from '../../types/room'
import { cn } from '../../lib/utils'

function flatten(nodes: RoomTreeNode[], parents: string[] = []): { id: string; path: string }[] {
  return nodes.flatMap((node) => {
    const trail = [...parents, node.name]
    return [{ id: node.id, path: trail.join(' › ') }, ...flatten(node.children, trail)]
  })
}

/** Room paths ("Sales › North") keyed by id. */
export function useRoomPaths(): Map<string, string> {
  const { roomTree } = useRoom()
  return useMemo(() => new Map(flatten(roomTree).map((r) => [r.id, r.path])), [roomTree])
}

interface RoomSelectProps {
  value: string
  onChange: (roomId: string) => void
  id?: string
  size?: 'sm' | 'md'
  className?: string
}

/** Single room choice for a new KPI; empty string = organization-wide (no room). */
export function RoomSelect({ value, onChange, id, size = 'md', className }: RoomSelectProps) {
  const paths = useRoomPaths()

  return (
    <div className={cn('relative', className)}>
      <FolderIcon
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none',
          size === 'sm' ? 'left-2.5 w-3.5 h-3.5' : 'left-3.5 w-4 h-4'
        )}
      />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none bg-dark-950 border border-dark-700 text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer truncate',
          size === 'sm' ? 'pl-8 pr-7 py-1.5 rounded-lg text-xs' : 'pl-10 pr-9 py-2.5 rounded-xl text-sm'
        )}
      >
        <option value="">No room — organization-wide</option>
        {[...paths.entries()].map(([roomId, path]) => (
          <option key={roomId} value={roomId}>
            {path}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none',
          size === 'sm' ? 'right-2 w-3.5 h-3.5' : 'right-3 w-4 h-4'
        )}
      />
    </div>
  )
}
