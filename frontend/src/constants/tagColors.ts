/**
 * Room tag colors. A tag is stored on the room as a preset id ("blue") or a custom hex,
 * and every shade used to draw it (folder glass, card tint, glow) is derived from its
 * one hex, so preset and custom tags render the same way everywhere.
 * Draw tags through components/ui/Tag.tsx rather than reading these directly.
 */
export interface TagColorDef {
  id: string
  name: string
  hex: string
  /** Lighter tint for the top of glass gradients */
  glassTintTop: string
  /** Near-white rim highlight */
  glassRim: string
  /** Light-theme tint for folder glass */
  lightTintTop: string
  /** Glow behind tagged folders (dark / light theme) */
  ambientGlow: string
  lightGlow: string
}

export const MAC_TAG_COLORS: Pick<TagColorDef, 'id' | 'name' | 'hex'>[] = [
  { id: 'red', name: 'Red', hex: '#f87171' },
  { id: 'orange', name: 'Orange', hex: '#fb923c' },
  { id: 'yellow', name: 'Yellow', hex: '#facc15' },
  { id: 'green', name: 'Green', hex: '#4ade80' },
  { id: 'blue', name: 'Blue', hex: '#60a5fa' },
  { id: 'purple', name: 'Purple', hex: '#c084fc' },
  { id: 'gray', name: 'Gray', hex: '#cbd5e1' },
]

export function hexToRgba(hex: string, alpha = 0.28): string {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const num = parseInt(c, 16)
  if (isNaN(num)) return `rgba(255, 255, 255, ${alpha})`
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function adjustBrightness(hex: string, percent: number): string {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const num = parseInt(c, 16)
  if (isNaN(num)) return hex
  let r = (num >> 16) & 255
  let g = (num >> 8) & 255
  let b = num & 255
  r = Math.min(255, Math.max(0, Math.round(r + (r * percent) / 100)))
  g = Math.min(255, Math.max(0, Math.round(g + (g * percent) / 100)))
  b = Math.min(255, Math.max(0, Math.round(b + (b * percent) / 100)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function buildTag(id: string, name: string, hex: string): TagColorDef {
  return {
    id,
    name,
    hex,
    glassTintTop: adjustBrightness(hex, 25),
    glassRim: adjustBrightness(hex, 45),
    lightTintTop: adjustBrightness(hex, 35),
    ambientGlow: hexToRgba(hex, 0.3),
    lightGlow: hexToRgba(hex, 0.22),
  }
}

export function getTagColor(colorId?: string | null): TagColorDef | null {
  if (!colorId) return null
  const preset = MAC_TAG_COLORS.find((c) => c.id === colorId.toLowerCase())
  if (preset) return buildTag(preset.id, preset.name, preset.hex)
  if (colorId.startsWith('#')) return buildTag(colorId, colorId.toUpperCase(), colorId)
  return null
}

/**
 * A room's effective tag: its own color, else the nearest tagged ancestor's
 * (same rule the backend uses for KPI.room_color).
 */
export function resolveRoomColor(
  roomId: string | null | undefined,
  rooms: { id: string; color?: string | null; parent_room_id: string | null }[]
): string | null {
  const byId = new Map(rooms.map((r) => [r.id, r]))
  const seen = new Set<string>()
  let current = roomId ? byId.get(roomId) : undefined
  while (current && !seen.has(current.id)) {
    if (current.color) return current.color
    seen.add(current.id)
    current = current.parent_room_id ? byId.get(current.parent_room_id) : undefined
  }
  return null
}
