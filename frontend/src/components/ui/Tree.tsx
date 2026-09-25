/** Shared explorer-tree pieces (Rooms mapping, Data Entry). */

/** Vertical indent guides, one per ancestor level */
export function TreeGuides({ depth }: { depth: number }) {
  return (
    <>
      {Array.from({ length: depth }).map((_, i) => (
        <span key={i} className="w-5 self-stretch flex justify-center flex-shrink-0">
          <span className="w-px bg-dark-700" />
        </span>
      ))}
    </>
  )
}

export const treeRowClass =
  'group flex items-center h-8 pr-2 rounded-lg hover:bg-dark-800/60 focus-within:bg-dark-800/60 transition-colors'

export const rowActionsClass =
  'flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity'
