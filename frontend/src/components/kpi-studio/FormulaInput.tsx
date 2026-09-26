import { useMemo, useRef, useState } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
  SparklesIcon,
  CircleStackIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline'
import type { DataField, EntryInterval } from '../../types/dataField'
import { DataFieldFormModal } from '../DataFieldFormModal'
import { useDismiss } from '../../hooks/useDismiss'
import { formatCompactNumber } from '../../lib/format'
import { cn } from '../../lib/utils'
import {
  checkFormula,
  evaluateFormula,
  humanizeVariable,
  renameVariable,
  toVariableName,
  wordAtCaret,
} from '../../lib/formula'

interface FormulaInputProps {
  value: string
  onChange: (formula: string) => void
  dataFields: DataField[]
  /** Called after a data field is created from here, so the parent can refresh its list */
  onFieldCreated: (field: DataField) => void
  /** Show validation errors even while the input is focused (e.g. after a submit attempt) */
  forceShowErrors?: boolean
  /** Defaults for data fields created from here */
  defaultRoomId?: string
  defaultInterval?: EntryInterval
  unit?: string
  invalid?: boolean
}

const OPERATORS: { label: string; insert: string; title: string }[] = [
  { label: '+', insert: ' + ', title: 'Add' },
  { label: '−', insert: ' - ', title: 'Subtract' },
  { label: '×', insert: ' * ', title: 'Multiply' },
  { label: '÷', insert: ' / ', title: 'Divide' },
  { label: '(', insert: '(', title: 'Open group' },
  { label: ')', insert: ')', title: 'Close group' },
  { label: '× 100', insert: ' * 100', title: 'Turn a ratio into a percentage' },
]

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Existing fields that look like what the user meant by an unknown variable. */
function closeMatches(variable: string, fields: DataField[]): DataField[] {
  const v = variable.toLowerCase()
  return fields
    .map((f) => {
      const fv = f.variable_name.toLowerCase()
      let score = Infinity
      if (toVariableName(f.name) === v) score = 0
      else if (v.length >= 3 && (fv.includes(v) || v.includes(fv))) score = 1
      else {
        const d = levenshtein(v, fv)
        if (d <= Math.max(1, Math.floor(v.length / 4))) score = 1 + d
      }
      return { f, score }
    })
    .filter((x) => x.score < Infinity)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((x) => x.f)
}

function matchesQuery(field: DataField, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase().replace(/_/g, ' ')
  return (
    field.name.toLowerCase().includes(needle) ||
    field.variable_name.toLowerCase().includes(q.toLowerCase()) ||
    field.room_names?.some((r) => r.toLowerCase().includes(needle))
  )
}

/**
 * Formula editor for KPIs: suggests existing data fields as you type, lets you
 * create a new data field inline, and explains how every variable will be resolved.
 */
export function FormulaInput({
  value,
  onChange,
  dataFields,
  onFieldCreated,
  forceShowErrors,
  defaultRoomId,
  defaultInterval,
  unit,
  invalid,
}: FormulaInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [caret, setCaret] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hasBlurred, setHasBlurred] = useState(false)

  // Create-field modal: what to prefill and what to replace once it's created
  const [createState, setCreateState] = useState<
    | { name: string; replace: { start: number; end: number } | { variable: string } | null }
    | null
  >(null)

  useDismiss([containerRef], () => setIsOpen(false), { enabled: isOpen })

  const check = useMemo(() => checkFormula(value), [value])
  const byVariable = useMemo(() => new Map(dataFields.map((f) => [f.variable_name, f])), [dataFields])

  const current = wordAtCaret(value, caret)
  const query = current?.word ?? ''
  const suggestions = useMemo(
    () =>
      dataFields
        .filter((f) => matchesQuery(f, query))
        .sort((a, b) => {
          // Prefix matches first, then alphabetical
          const ap = a.variable_name.startsWith(query.toLowerCase()) || a.name.toLowerCase().startsWith(query.toLowerCase())
          const bp = b.variable_name.startsWith(query.toLowerCase()) || b.name.toLowerCase().startsWith(query.toLowerCase())
          return ap === bp ? a.name.localeCompare(b.name) : ap ? -1 : 1
        })
        .slice(0, 50),
    [dataFields, query]
  )
  const exactMatch = query ? byVariable.has(query) : false
  const showCreateOption = !exactMatch
  const itemCount = suggestions.length + (showCreateOption ? 1 : 0)

  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? value.length)

  const setValueAndCaret = (next: string, nextCaret: number) => {
    onChange(next)
    setCaret(nextCaret)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(nextCaret, nextCaret)
    })
  }

  const insertAt = (text: string, start: number, end: number) => {
    const next = value.slice(0, start) + text + value.slice(end)
    setValueAndCaret(next, start + text.length)
  }

  const pickField = (field: DataField) => {
    if (current) insertAt(field.variable_name, current.start, current.end)
    else insertAt(field.variable_name, caret, caret)
    setIsOpen(false)
  }

  const openCreate = () => {
    setCreateState({
      name: query ? humanizeVariable(query) : '',
      replace: current ? { start: current.start, end: current.end } : { start: caret, end: caret },
    })
    setIsOpen(false)
  }

  const handleFieldCreated = (field: DataField) => {
    onFieldCreated(field)
    const replace = createState?.replace
    if (replace && 'variable' in replace) {
      onChange(renameVariable(value, replace.variable, field.variable_name))
    } else if (replace) {
      insertAt(field.variable_name, replace.start, replace.end)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || itemCount === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % itemCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + itemCount) % itemCount)
    } else if ((e.key === 'Enter' || e.key === 'Tab') && current) {
      // Only hijack Enter/Tab while a word is being completed
      e.preventDefault()
      if (activeIndex < suggestions.length) pickField(suggestions[activeIndex])
      else openCreate()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  // Variables and how each will resolve
  const variables = check.variables.filter((v) => /^[A-Za-z_]/.test(v))
  const resolved = variables.map((v) => ({ variable: v, field: byVariable.get(v) }))
  const unresolved = resolved.filter((r) => !r.field)

  const preview = useMemo(() => {
    if (!check.valid || unresolved.length > 0) return null
    const values: Record<string, number> = {}
    for (const r of resolved) {
      if (r.field?.latest_value === null || r.field?.latest_value === undefined) return null
      values[r.variable] = r.field.latest_value
    }
    return evaluateFormula(value, values)
  }, [check.valid, resolved, unresolved.length, value])

  const showError = !!check.error && value.trim() !== '' && (forceShowErrors || hasBlurred || !isFocused)
  const showEmptyError = forceShowErrors && !value.trim()

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-2 px-3.5 bg-dark-950 border rounded-xl transition-colors',
          showError || showEmptyError || invalid
            ? 'border-danger-500/50'
            : isFocused
              ? 'border-dark-500'
              : 'border-dark-700'
        )}
      >
        <CalculatorIcon className="w-4 h-4 text-dark-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setCaret(e.target.selectionStart ?? e.target.value.length)
            setIsOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => {
            setIsFocused(true)
            syncCaret()
          }}
          onBlur={() => {
            setIsFocused(false)
            if (value.trim()) setHasBlurred(true)
          }}
          onClick={() => {
            syncCaret()
            setIsOpen(true)
          }}
          onKeyUp={(e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) syncCaret()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a field name, e.g. revenue - expenses"
          spellCheck={false}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="formula-suggestions"
          aria-invalid={showError || showEmptyError || invalid}
          className="flex-1 min-w-0 py-2.5 bg-transparent text-sm font-mono text-foreground placeholder:font-sans placeholder-dark-500 focus:outline-none"
        />
        {unit && value.trim() && <span className="text-xs text-dark-400 flex-shrink-0">{unit}</span>}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && isFocused && (current || !value.trim()) && itemCount > 0 && (
        <div
          id="formula-suggestions"
          role="listbox"
          className="absolute z-40 left-0 right-0 mt-1.5 rounded-xl bg-dark-900 border border-dark-700 shadow-2xl overflow-hidden"
          onMouseDown={(e) => e.preventDefault() /* keep input focus */}
        >
          <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-dark-400">
            <span>{query ? `Data fields matching "${query}"` : 'Your data fields'}</span>
            <span className="font-normal normal-case tracking-normal">↑↓ to move · Enter to insert</span>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar pb-1">
            {suggestions.map((field, idx) => (
              <button
                key={field.id}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => pickField(field)}
                className={cn(
                  'w-full text-left px-3 py-2 flex items-center justify-between gap-3 cursor-pointer',
                  idx === activeIndex ? 'bg-dark-800' : 'hover:bg-dark-800/60'
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {field.name}
                    {field.unit && <span className="text-dark-400 font-normal"> · {field.unit}</span>}
                  </p>
                  <p className="text-[11px] font-mono text-dark-400 truncate">
                    {field.variable_name}
                    {field.room_names?.length > 0 && (
                      <span className="font-sans"> · {field.room_names.join(', ')}</span>
                    )}
                  </p>
                </div>
                <span className="text-[11px] text-dark-400 flex-shrink-0 tabular-nums">
                  {field.latest_value !== null ? `latest ${formatCompactNumber(field.latest_value)}` : 'no data yet'}
                </span>
              </button>
            ))}
            {suggestions.length === 0 && query && (
              <p className="px-3 py-2 text-xs text-dark-400">No data field matches "{query}".</p>
            )}
            {showCreateOption && (
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === suggestions.length}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                onClick={openCreate}
                className={cn(
                  'w-full text-left px-3 py-2 flex items-center gap-2 border-t border-dark-800 cursor-pointer',
                  activeIndex === suggestions.length ? 'bg-dark-800' : 'hover:bg-dark-800/60'
                )}
              >
                <PlusCircleIcon className="w-4 h-4 text-brand flex-shrink-0" />
                <span className="text-xs text-foreground">
                  {query ? (
                    <>
                      Create new data field <strong>"{humanizeVariable(query)}"</strong>
                    </>
                  ) : (
                    'Create a new data field'
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Operator shortcuts */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {OPERATORS.map((op) => (
          <button
            key={op.label}
            type="button"
            title={op.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const at = isFocused ? caret : value.length
              insertAt(op.insert, at, at)
            }}
            className="min-w-[2rem] px-2 py-1 rounded-lg border border-dark-700 bg-dark-950 text-xs font-mono text-dark-300 hover:text-foreground hover:border-dark-500 transition-colors cursor-pointer"
          >
            {op.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-dark-700" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const at = isFocused ? caret : value.length
            setCaret(at)
            setIsOpen(true)
            setActiveIndex(0)
            inputRef.current?.focus()
            requestAnimationFrame(() => inputRef.current?.setSelectionRange(at, at))
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dark-700 bg-dark-950 text-xs text-dark-300 hover:text-foreground hover:border-dark-500 transition-colors cursor-pointer"
        >
          <CircleStackIcon className="w-3.5 h-3.5" />
          Insert field
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setCreateState({ name: '', replace: { start: isFocused ? caret : value.length, end: isFocused ? caret : value.length } })}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-dark-600 text-xs text-dark-300 hover:text-foreground hover:border-dark-500 transition-colors cursor-pointer"
        >
          <PlusCircleIcon className="w-3.5 h-3.5" />
          New field
        </button>
      </div>

      {/* Validation */}
      {(showError || showEmptyError) && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-danger-400" role="alert">
          <ExclamationTriangleIcon className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          {showEmptyError ? 'Enter a formula — start typing a data field name' : check.error}
        </p>
      )}
      {!value.trim() && !showEmptyError && (
        <p className="mt-2 text-[11px] text-dark-400">
          Start typing to pick from your data fields. Anything that isn't a field yet can be created as a new one.
        </p>
      )}

      {/* How each variable resolves */}
      {check.valid && resolved.length > 0 && (
        <div className="mt-3 rounded-xl border border-dark-800 bg-dark-950/60 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400">
            Inputs · {resolved.length - unresolved.length}/{resolved.length} linked to data fields
          </p>
          <ul className="space-y-1.5">
            {resolved.map(({ variable, field }) => (
              <li key={variable} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {field ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 text-success-400 flex-shrink-0" />
                    <code className="font-mono text-dark-300">{variable}</code>
                    <span className="text-dark-500">→</span>
                    <span className="text-foreground font-medium">{field.name}</span>
                    <span className="text-dark-400">
                      {[
                        field.unit,
                        field.entry_interval,
                        field.latest_value !== null ? `latest ${formatCompactNumber(field.latest_value)}` : 'no data yet',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </>
                ) : (
                  <>
                    <PlusCircleIcon className="w-4 h-4 text-warning-400 flex-shrink-0" />
                    <code className="font-mono text-dark-300">{variable}</code>
                    <span className="text-dark-500">→</span>
                    <span className="text-warning-400">
                      New field "{humanizeVariable(variable)}" will be created
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreateState({ name: humanizeVariable(variable), replace: { variable } })}
                      className="px-2 py-0.5 rounded-md border border-dark-700 text-[11px] text-dark-300 hover:text-foreground hover:border-dark-500 cursor-pointer"
                    >
                      Set it up now
                    </button>
                    {closeMatches(variable, dataFields).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onChange(renameVariable(value, variable, m.variable_name))}
                        className="px-2 py-0.5 rounded-md border border-brand/30 bg-brand/5 text-[11px] text-brand hover:bg-brand/15 cursor-pointer"
                      >
                        Use "{m.name}" instead?
                      </button>
                    ))}
                  </>
                )}
              </li>
            ))}
          </ul>
          {unresolved.length > 0 && (
            <p className="text-[11px] text-dark-400 leading-relaxed">
              New fields are created automatically when you create the KPI — you'll enter their values on the Entries page.
              Use "Set it up now" to choose the unit and schedule first.
            </p>
          )}
          {preview && 'value' in preview && (
            <p className="flex items-center gap-1.5 text-[11px] text-dark-300 pt-1 border-t border-dark-800">
              <SparklesIcon className="w-3.5 h-3.5 text-brand" />
              With the latest values this KPI would be{' '}
              <strong className="text-foreground tabular-nums">
                {formatCompactNumber(preview.value, { maximumFractionDigits: 2 })}
                {unit ? ` ${unit}` : ''}
              </strong>
            </p>
          )}
          {preview && 'error' in preview && (
            <p className="flex items-center gap-1.5 text-[11px] text-warning-400 pt-1 border-t border-dark-800">
              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
              With the latest values: {preview.error.toLowerCase()}
            </p>
          )}
        </div>
      )}

      {/* The modal portals out of the DOM, but React events still bubble to the KPI <form> — stop them here */}
      <div onSubmit={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <DataFieldFormModal
          isOpen={!!createState}
          onClose={() => setCreateState(null)}
          onCreated={handleFieldCreated}
          initialName={createState?.name}
          initialRoomIds={defaultRoomId ? [defaultRoomId] : undefined}
          initialInterval={defaultInterval}
        />
      </div>
    </div>
  )
}
