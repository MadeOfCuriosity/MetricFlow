import type { WidgetType } from '../../types/dashboard'

export const widgetNeedsKPI = (type: WidgetType) => ['line-chart', 'bar-chart', 'area-chart'].includes(type)
export const widgetNeedsMaxItems = (type: WidgetType) => ['insights-list'].includes(type)

const fieldClass =
  'w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
const labelClass = 'block text-sm font-medium text-dark-300 mb-1.5'

interface WidgetSettingsFieldsProps {
  type: WidgetType
  title: string
  onTitleChange: (v: string) => void
  kpiId: string
  onKpiIdChange: (v: string) => void
  maxItems: number
  onMaxItemsChange: (v: number) => void
  kpis: { id: string; name: string; category: string }[]
}

/** Title / KPI / max-items fields shared by the Add Widget and Configure Widget dialogs. */
export function WidgetSettingsFields({
  type,
  title,
  onTitleChange,
  kpiId,
  onKpiIdChange,
  maxItems,
  onMaxItemsChange,
  kpis,
}: WidgetSettingsFieldsProps) {
  return (
    <>
      <div>
        <label className={labelClass}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={fieldClass}
          placeholder="Widget title"
        />
      </div>

      {widgetNeedsKPI(type) && (
        <div>
          <label className={labelClass}>KPI</label>
          <select value={kpiId} onChange={(e) => onKpiIdChange(e.target.value)} className={fieldClass}>
            <option value="">Auto (selected KPI)</option>
            {kpis.map((kpi) => (
              <option key={kpi.id} value={kpi.id}>
                {kpi.name} ({kpi.category})
              </option>
            ))}
          </select>
        </div>
      )}

      {widgetNeedsMaxItems(type) && (
        <div>
          <label className={labelClass}>Max items</label>
          <input
            type="number"
            value={maxItems}
            onChange={(e) => onMaxItemsChange(Number(e.target.value))}
            min={1}
            max={20}
            className={fieldClass}
          />
        </div>
      )}
    </>
  )
}
