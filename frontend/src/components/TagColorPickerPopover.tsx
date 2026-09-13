import { useState, useRef, useEffect, ReactNode } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { MAC_TAG_COLORS, getTagColor } from '../constants/tagColors'

interface TagColorPickerPopoverProps {
  selectedColor?: string | null
  onSelectColor: (color: string | null) => void
  align?: 'left' | 'right' | 'center'
  children?: (props: { isOpen: boolean; toggle: (e: React.MouseEvent) => void }) => ReactNode
}

export function TagColorPickerPopover({
  selectedColor = null,
  onSelectColor,
  align = 'left',
  children,
}: TagColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handlePick = (colorId: string | null) => {
    onSelectColor(colorId)
    setIsOpen(false)
  }

  const currentTag = getTagColor(selectedColor)
  const isCustom = !!(selectedColor && selectedColor.startsWith('#'))

  const alignClasses = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  }[align]

  return (
    <div className="relative inline-block" ref={containerRef}>
      {children ? (
        children({
          isOpen,
          toggle: (e: React.MouseEvent) => {
            e.stopPropagation()
            setIsOpen((prev) => !prev)
          },
        })
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen((prev) => !prev)
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-dark-200 hover:text-foreground bg-dark-800/80 hover:bg-dark-750 border border-dark-700/80 rounded-lg transition-colors cursor-pointer"
          title="Set room tag color"
        >
          {currentTag ? (
            <span
              className={`w-2.5 h-2.5 rounded-full ${currentTag.dotClass || ''}`}
              style={{ backgroundColor: currentTag.hex }}
            />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-dark-400" />
          )}
          <span>{currentTag ? `${currentTag.name} Tag` : 'Tag Color'}</span>
        </button>
      )}

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-2 z-50 ${alignClasses} w-72 rounded-xl bg-dark-900 border border-dark-700 p-3 shadow-2xl backdrop-blur-md animate-in fade-in duration-150`}
        >
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-dark-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-dark-400">
              macOS Tag & Color
            </span>
            {selectedColor && (
              <button
                type="button"
                onClick={() => handlePick(null)}
                className="text-[11px] text-dark-400 hover:text-danger-400 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <XMarkIcon className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-1.5">
            {/* None / Clear option */}
            <button
              type="button"
              onClick={() => handlePick(null)}
              title="No color"
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                !selectedColor
                  ? 'border-foreground/80 bg-dark-700 text-foreground scale-110 shadow-xs'
                  : 'border-dark-700 bg-dark-800 text-dark-400 hover:border-dark-500 hover:text-dark-200'
              }`}
            >
              <span className="text-[10px] leading-none">✕</span>
            </button>

            <div className="h-4 w-px bg-dark-700 mx-0.5" />

            {/* 7 macOS Colors */}
            {MAC_TAG_COLORS.map((tag) => {
              const isSelected = selectedColor === tag.id
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handlePick(isSelected ? null : tag.id)}
                  title={tag.name}
                  className={`relative w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-foreground scale-115'
                      : 'hover:scale-110 opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: tag.hex,
                    boxShadow: isSelected ? `0 0 10px ${tag.ambientGlow}` : undefined,
                  }}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
              )
            })}

            <div className="h-4 w-px bg-dark-700 mx-0.5" />

            {/* Simple Native Color Picker */}
            <label
              title={isCustom ? `Custom: ${selectedColor}` : 'Custom color picker'}
              className={`relative w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center overflow-hidden border ${
                isCustom
                  ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-foreground scale-115 border-foreground shadow-md'
                  : 'border-dark-600 hover:border-dark-400 hover:scale-110 opacity-90 hover:opacity-100'
              }`}
              style={
                isCustom
                  ? { backgroundColor: selectedColor || undefined }
                  : {
                      background:
                        'conic-gradient(from 180deg at 50% 50%, #f87171 0deg, #facc15 72deg, #4ade80 144deg, #60a5fa 216deg, #c084fc 288deg, #f87171 360deg)',
                    }
              }
            >
              <input
                type="color"
                value={selectedColor && selectedColor.startsWith('#') ? selectedColor : '#60a5fa'}
                onChange={(e) => handlePick(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {isCustom ? (
                <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-md" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-dark-950/40 pointer-events-none" />
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
