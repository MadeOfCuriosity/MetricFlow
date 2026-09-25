import { useState, useEffect, useCallback } from 'react'
import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { MAC_TAG_COLORS, getTagColor, adjustBrightness } from '../constants/tagColors'

type HSV = { h: number; s: number; v: number }

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function hexToHsv(hex: string): HSV {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }: HSV): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(5)}${f(3)}${f(1)}`.toUpperCase()
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Drag handler that keeps tracking the pointer even when it leaves the element */
function useDrag(onMove: (x: number, y: number) => void) {
  return useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)
      const update = (ev: { clientX: number; clientY: number }) => {
        const rect = el.getBoundingClientRect()
        onMove(clamp01((ev.clientX - rect.left) / rect.width), clamp01((ev.clientY - rect.top) / rect.height))
      }
      update(e)
      const move = (ev: PointerEvent) => update(ev)
      const up = () => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
    },
    [onMove]
  )
}

/** In-app HSV picker: nothing is saved until Apply, so dragging never commits or closes the popover */
function CustomColorPicker({
  initial,
  onApply,
  onCancel,
}: {
  initial: string
  onApply: (hex: string) => void
  onCancel: () => void
}) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initial))
  const [hexInput, setHexInput] = useState(initial.toUpperCase())
  const hex = hsvToHex(hsv)

  useEffect(() => {
    setHexInput(hex)
  }, [hex])

  const onSvDown = useDrag(useCallback((x: number, y: number) => setHsv((p) => ({ ...p, s: x, v: 1 - y })), []))
  const onHueDown = useDrag(useCallback((x: number) => setHsv((p) => ({ ...p, h: x * 360 })), []))

  const commitHexInput = (value: string) => {
    const v = value.startsWith('#') ? value : `#${value}`
    if (HEX_RE.test(v)) setHsv(hexToHsv(v))
    else setHexInput(hex)
  }

  return (
    <div className="mt-3 pt-3 border-t border-dark-700/80 space-y-3">
      {/* Saturation / value area */}
      <div
        onPointerDown={onSvDown}
        className="relative h-32 rounded-xl cursor-crosshair touch-none overflow-hidden ring-1 ring-inset ring-dark-700"
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <span
          className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] pointer-events-none"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hex }}
        />
      </div>

      {/* Hue slider */}
      <div
        onPointerDown={onHueDown}
        className="relative h-2.5 rounded-full cursor-pointer touch-none ring-1 ring-inset ring-dark-700"
        style={{
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
      >
        <span
          className="absolute top-1/2 w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] pointer-events-none"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        />
      </div>

      {/* Hex input + actions */}
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg ring-1 ring-inset ring-white/15 flex-shrink-0" style={{ backgroundColor: hex }} />
        <input
          type="text"
          value={hexInput}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => setHexInput(e.target.value.toUpperCase())}
          onBlur={(e) => commitHexInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitHexInput(e.currentTarget.value)
            }
          }}
          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-foreground focus:outline-none focus:border-dark-500"
        />
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1.5 rounded-lg text-xs text-dark-400 hover:text-foreground hover:bg-dark-800 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply(hex)}
          className="px-2.5 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

const swatchBase =
  'relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer flex-shrink-0'
const swatchSelected = 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-dark-900'
const swatchIdle = 'hover:scale-110'

interface TagColorPaletteProps {
  /** Preset tag id (e.g. "blue"), custom hex ("#A63317"), or null for no color */
  value: string | null
  onChange: (color: string | null) => void
}

/**
 * The one tag-color control used across the app: "none", the preset tags and an
 * in-app custom picker. Used inline in the room modals and inside TagColorPickerPopover.
 */
export function TagColorPalette({ value, onChange }: TagColorPaletteProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const isCustom = !!(value && value.startsWith('#'))
  const currentTag = getTagColor(value)

  return (
    <div>
      <div className="flex items-center justify-between gap-1">
        {/* None */}
        <button
          type="button"
          onClick={() => onChange(null)}
          title="No color"
          aria-label="No color"
          className={`${swatchBase} border border-dashed ${
            !value
              ? `border-foreground/60 text-foreground ${swatchSelected}`
              : `border-dark-500 text-dark-400 hover:text-foreground hover:border-dark-400 ${swatchIdle}`
          }`}
        >
          <XMarkIcon className="w-3 h-3" />
        </button>

        {/* Presets */}
        {MAC_TAG_COLORS.map((tag) => {
          const isSelected = value === tag.id
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange(tag.id)}
              title={tag.name}
              aria-label={tag.name}
              aria-pressed={isSelected}
              className={`${swatchBase} ${isSelected ? swatchSelected : swatchIdle}`}
              style={{
                background: `linear-gradient(145deg, ${adjustBrightness(tag.hex, 25)} 0%, ${tag.hex} 70%)`,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
              }}
            >
              {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />}
            </button>
          )
        })}

        {/* Custom */}
        <button
          type="button"
          onClick={() => setIsCustomOpen((o) => !o)}
          title={isCustom ? `Custom: ${value}` : 'Custom color'}
          aria-label="Custom color"
          aria-expanded={isCustomOpen}
          className={`${swatchBase} ${
            isCustom
              ? swatchSelected
              : isCustomOpen
                ? 'border border-foreground/60 text-foreground bg-dark-800'
                : `border border-dark-600 bg-dark-800 text-dark-300 hover:text-foreground hover:border-dark-400 ${swatchIdle}`
          }`}
          style={isCustom ? { backgroundColor: value || undefined, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' } : undefined}
        >
          {isCustom ? (
            <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />
          ) : (
            <PlusIcon className="w-3.5 h-3.5 stroke-2" />
          )}
        </button>
      </div>

      {isCustomOpen && (
        <CustomColorPicker
          initial={isCustom && value ? value : currentTag?.hex || '#60A5FA'}
          onApply={(hex) => {
            setIsCustomOpen(false)
            onChange(hex)
          }}
          onCancel={() => setIsCustomOpen(false)}
        />
      )}
    </div>
  )
}
