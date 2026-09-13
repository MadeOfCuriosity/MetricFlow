export interface TagColorDef {
  id: string
  name: string
  hex: string
  dotClass: string
  // Dark mode
  glassTintTop: string
  glassTintBottom: string
  glassRim: string
  ambientGlow: string
  // Light mode
  lightBackTop: string
  lightBackBottom: string
  lightTintTop: string
  lightTintBottom: string
  lightRim: string
  lightGlow: string
}

export const MAC_TAG_COLORS: TagColorDef[] = [
  {
    id: 'red',
    name: 'Red',
    hex: '#f87171',
    dotClass: 'bg-red-400',
    glassTintTop: '#fca5a5',
    glassTintBottom: '#dc2626',
    glassRim: '#fecaca',
    ambientGlow: 'rgba(248, 113, 113, 0.28)',
    lightBackTop: '#fee2e2',
    lightBackBottom: '#fca5a5',
    lightTintTop: '#fecaca',
    lightTintBottom: '#f87171',
    lightRim: '#ffffff',
    lightGlow: 'rgba(248, 113, 113, 0.22)',
  },
  {
    id: 'orange',
    name: 'Orange',
    hex: '#fb923c',
    dotClass: 'bg-orange-400',
    glassTintTop: '#fed7aa',
    glassTintBottom: '#ea580c',
    glassRim: '#ffedd5',
    ambientGlow: 'rgba(251, 146, 60, 0.28)',
    lightBackTop: '#ffedd5',
    lightBackBottom: '#fdba74',
    lightTintTop: '#fed7aa',
    lightTintBottom: '#fb923c',
    lightRim: '#ffffff',
    lightGlow: 'rgba(251, 146, 60, 0.22)',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    hex: '#facc15',
    dotClass: 'bg-yellow-400',
    glassTintTop: '#fef08a',
    glassTintBottom: '#ca8a04',
    glassRim: '#fef9c3',
    ambientGlow: 'rgba(250, 204, 21, 0.26)',
    lightBackTop: '#fef9c3',
    lightBackBottom: '#fde047',
    lightTintTop: '#fef08a',
    lightTintBottom: '#facc15',
    lightRim: '#ffffff',
    lightGlow: 'rgba(250, 204, 21, 0.20)',
  },
  {
    id: 'green',
    name: 'Green',
    hex: '#4ade80',
    dotClass: 'bg-green-400',
    glassTintTop: '#bbf7d0',
    glassTintBottom: '#16a34a',
    glassRim: '#dcfce7',
    ambientGlow: 'rgba(74, 222, 128, 0.28)',
    lightBackTop: '#dcfce7',
    lightBackBottom: '#86efac',
    lightTintTop: '#bbf7d0',
    lightTintBottom: '#4ade80',
    lightRim: '#ffffff',
    lightGlow: 'rgba(74, 222, 128, 0.22)',
  },
  {
    id: 'blue',
    name: 'Blue',
    hex: '#60a5fa',
    dotClass: 'bg-blue-400',
    glassTintTop: '#bfdbfe',
    glassTintBottom: '#2563eb',
    glassRim: '#dbeafe',
    ambientGlow: 'rgba(96, 165, 250, 0.30)',
    lightBackTop: '#dbeafe',
    lightBackBottom: '#93c5fd',
    lightTintTop: '#bfdbfe',
    lightTintBottom: '#60a5fa',
    lightRim: '#ffffff',
    lightGlow: 'rgba(96, 165, 250, 0.22)',
  },
  {
    id: 'purple',
    name: 'Purple',
    hex: '#c084fc',
    dotClass: 'bg-purple-400',
    glassTintTop: '#e9d5ff',
    glassTintBottom: '#9333ea',
    glassRim: '#f3e8ff',
    ambientGlow: 'rgba(192, 132, 252, 0.30)',
    lightBackTop: '#f3e8ff',
    lightBackBottom: '#d8b4fe',
    lightTintTop: '#e9d5ff',
    lightTintBottom: '#c084fc',
    lightRim: '#ffffff',
    lightGlow: 'rgba(192, 132, 252, 0.22)',
  },
  {
    id: 'gray',
    name: 'Gray',
    hex: '#cbd5e1',
    dotClass: 'bg-slate-300',
    glassTintTop: '#e2e8f0',
    glassTintBottom: '#475569',
    glassRim: '#f8fafc',
    ambientGlow: 'rgba(203, 213, 225, 0.22)',
    lightBackTop: '#f8fafc',
    lightBackBottom: '#e2e8f0',
    lightTintTop: '#f1f5f9',
    lightTintBottom: '#cbd5e1',
    lightRim: '#ffffff',
    lightGlow: 'rgba(203, 213, 225, 0.16)',
  },
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

export function getTagColor(colorId?: string | null): TagColorDef | null {
  if (!colorId) return null
  const preset = MAC_TAG_COLORS.find((c) => c.id === colorId.toLowerCase())
  if (preset) return preset
  if (colorId.startsWith('#')) {
    return {
      id: colorId,
      name: colorId.toUpperCase(),
      hex: colorId,
      dotClass: '',
      glassTintTop: adjustBrightness(colorId, 25),
      glassTintBottom: adjustBrightness(colorId, -15),
      glassRim: adjustBrightness(colorId, 45),
      ambientGlow: hexToRgba(colorId, 0.30),
      lightBackTop: adjustBrightness(colorId, 55),
      lightBackBottom: adjustBrightness(colorId, 25),
      lightTintTop: adjustBrightness(colorId, 35),
      lightTintBottom: colorId,
      lightRim: '#ffffff',
      lightGlow: hexToRgba(colorId, 0.22),
    }
  }
  return null
}
