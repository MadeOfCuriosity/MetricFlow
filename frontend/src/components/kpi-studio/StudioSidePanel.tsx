import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ChartBarIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import type { DataField } from '../../types/dataField'
import { checkFormula, evaluateFormula } from '../../lib/formula'
import { formatCompactNumber } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { ManualDraft } from './ManualKPIForm'
import { TIME_PERIOD_OPTIONS } from './ManualKPIForm'
import { useRoomPaths } from './RoomSelect'

type Mode = 'ai' | 'manual' | 'presets'

interface StudioSidePanelProps {
  mode: Mode
  draft: ManualDraft
  dataFields: DataField[]
  roomId: string
  existingNames: Set<string>
  aiRemaining?: { remaining: number; limit: number } | null
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-5 h-5 rounded-full bg-dark-800 border border-dark-700 text-[10px] font-bold text-dark-300 flex items-center justify-center flex-shrink-0 mt-px">
        {n}
      </span>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-dark-400 leading-relaxed mt-0.5">{children}</p>
      </div>
    </li>
  )
}

function CheckItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className={cn('flex items-center gap-2 text-xs', done ? 'text-dark-300' : 'text-dark-400')}>
      {done ? (
        <CheckCircleIcon className="w-4 h-4 text-success-400 flex-shrink-0" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-dark-600 flex-shrink-0" />
      )}
      {children}
    </li>
  )
}

function ManualPreview({ draft, dataFields, roomId, existingNames }: Omit<StudioSidePanelProps, 'mode' | 'aiRemaining'>) {
  const roomPaths = useRoomPaths()
  const check = checkFormula(draft.formula)
  const byVar = new Map(dataFields.map((f) => [f.variable_name, f]))
  const newFields = check.variables.filter((v) => !byVar.has(v))
  const name = draft.name.trim()
  const nameOk = name.length >= 2 && !existingNames.has(name.toLowerCase())

  let previewValue: string | null = null
  if (check.valid && newFields.length === 0) {
    const values: Record<string, number> = {}
    let complete = true
    for (const v of check.variables) {
      const latest = byVar.get(v)?.latest_value
      if (latest === null || latest === undefined) complete = false
      else values[v] = latest
    }
    const result = complete ? evaluateFormula(draft.formula, values) : null
    if (result && 'value' in result) previewValue = formatCompactNumber(result.value, { maximumFractionDigits: 2 })
  }
  const unit = draft.unit.trim()
  const period = TIME_PERIOD_OPTIONS.find((o) => o.value === draft.time_period)?.label

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400 mb-2">Card preview</p>
        <div className="rounded-2xl border border-dark-700 bg-dark-950/70 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-semibold truncate', name ? 'text-foreground' : 'text-dark-500 italic')}>
              {name || 'Untitled KPI'}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 border border-dark-700 text-dark-300 flex-shrink-0">
              {draft.category}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground tabular-nums">
            {previewValue ?? '—'}
            {unit && <span className="text-sm font-medium text-dark-300 ml-1">{unit}</span>}
          </p>
          <p className="text-[11px] text-dark-400 mt-0.5">
            {previewValue ? 'Based on the latest values of your fields' : 'Shows once values are entered'}
          </p>
          <div className="mt-3 pt-3 border-t border-dark-800 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-dark-400">
            <span>{period}</span>
            <span className="flex items-center gap-1">
              {draft.direction === 'up' ? (
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
              )}
              {draft.direction === 'up' ? 'Higher is better' : 'Lower is better'}
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{roomId ? roomPaths.get(roomId) ?? 'Room' : 'Organization-wide'}</span>
            </span>
          </div>
          {draft.formula.trim() && (
            <code className="mt-3 block text-[11px] font-mono text-brand/90 break-words">{draft.formula}</code>
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400 mb-2">Checklist</p>
        <ul className="space-y-2">
          <CheckItem done={nameOk}>A unique name</CheckItem>
          <CheckItem done={check.valid}>A valid formula</CheckItem>
          <CheckItem done={check.valid && newFields.length === 0}>
            {check.valid && newFields.length > 0
              ? `${newFields.length} new data field${newFields.length !== 1 ? 's' : ''} will be created`
              : 'Every input linked to a data field'}
          </CheckItem>
        </ul>
      </div>

      <div className="rounded-xl bg-dark-950/60 border border-dark-800 p-3">
        <p className="text-xs font-semibold text-foreground">What happens next</p>
        <p className="text-[11px] text-dark-400 leading-relaxed mt-1">
          Your team enters values for the data fields on the Entries page. The KPI recalculates from those values
          automatically — no need to enter the KPI itself.
        </p>
      </div>
    </div>
  )
}

export function StudioSidePanel({ mode, aiRemaining, ...rest }: StudioSidePanelProps) {
  if (mode === 'manual') return <ManualPreview {...rest} />

  if (mode === 'ai') {
    return (
      <div className="space-y-5">
        <ol className="space-y-4">
          <Step n={1} title="Describe the outcome">
            Say what you want to measure in plain words, e.g. "how fast we reply to leads".
          </Step>
          <Step n={2} title="Answer a couple of questions">
            The assistant asks what data you have and how often you'll record it.
          </Step>
          <Step n={3} title="Review the suggestion">
            Check the formula and link each input to an existing data field — or let a new one be created.
          </Step>
          <Step n={4} title="Add it, or fine-tune">
            Add the KPI directly, or choose Customize to edit everything in the Manual tab first.
          </Step>
        </ol>
        {aiRemaining && (
          <p className="text-[11px] text-dark-400 border-t border-dark-800 pt-3">
            <strong className="text-dark-300">{aiRemaining.remaining}</strong> of {aiRemaining.limit} AI messages left
            today · resets at midnight UTC
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ChartBarIcon className="w-4 h-4 text-brand" />
        <p className="text-xs font-semibold text-foreground">Proven formulas, ready to use</p>
      </div>
      <ol className="space-y-4">
        <Step n={1} title="Add KPI">
          Adds the preset exactly as shown. Presets are locked, so they stay a reliable standard.
        </Step>
        <Step n={2} title="Customize">
          Opens it in the Manual tab so you can rename it, change the formula or settings — it's then saved as your
          own editable KPI.
        </Step>
      </ol>
      <div className="rounded-xl bg-dark-950/60 border border-dark-800 p-3 space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Inputs</p>
        <p className="text-[11px] text-dark-400 leading-relaxed">
          <span className="text-success-400">Green</span> inputs already exist as your data fields and are reused.
          Dashed ones are created as new data fields for you to fill in on the Entries page.
        </p>
      </div>
    </div>
  )
}
