import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, PlusIcon,
  BuildingOffice2Icon, DocumentTextIcon, BookOpenIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { cn } from '../../lib/utils'
import { getApiError } from '../../lib/apiError'
import { useToast } from '../../context/ToastContext'
import { integrationsApi } from '../../services/integrations'
import { dataFieldsApi } from '../../services/dataFields'
import type {
  ExternalField, Integration, SyncSchedule, ZohoBooksAccount, ZohoBooksBranch,
  ZohoBooksModule, ZohoBooksOrganization, ZohoBooksSourceMappingInput,
} from '../../types/integration'
import type { DataField } from '../../types/dataField'
import {
  ZOHO_SOURCES, sourceById, presetsFor, sourceName, displayNameFor, sourceKey,
  integrationSourceKey, isSetupIncomplete, type GlKind, type ZohoAggregation,
} from './catalog'
import { SourceSection, newRowId, targetName, type MappingRow, type PreviewState, type SourceUnit } from './SourceSection'

type Screen = 'intro' | 'choose' | 'map' | 'sync' | 'done' | 'edit'

interface ZohoBooksSetupModalProps {
  isOpen: boolean
  onClose: () => void
  /** Refresh the integrations list (after sources are created or saved) */
  onChanged: () => void
  /** All integrations in the org: to reuse a sign-in, mark sources already syncing, and spot fields already filled */
  integrations: Integration[]
  /** Start at "Choose data" with this sign-in (e.g. just back from Zoho) */
  resumeAuthId?: string | null
  /** Edit one existing source's values, name and schedule */
  editIntegration?: Integration | null
}

const SCHEDULES: { value: SyncSchedule; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: '1h', label: 'Every hour' },
  { value: '6h', label: 'Every 6 hours' },
  { value: '12h', label: 'Every 12 hours' },
  { value: '24h', label: 'Daily' },
]

const HISTORY_OPTIONS = [
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last 12 months' },
  { value: 1095, label: 'Last 3 years' },
]

const STEPS = ['Sign in', 'Choose data', 'Map & schedule']
const STEP_INDEX: Record<Screen, number> = { intro: 0, choose: 1, map: 2, sync: 3, done: 3, edit: -1 }

interface SyncResult {
  integration: Integration
  state: 'waiting' | 'running' | 'success' | 'failed'
  message?: string
}

const selectClass =
  'w-full appearance-none bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-dark-500'

const cfg = (i: Integration) => (i.config || {}) as Record<string, string | undefined>

export function ZohoBooksSetupModal({
  isOpen, onClose, onChanged, integrations, resumeAuthId, editIntegration,
}: ZohoBooksSetupModalProps) {
  const { success: toastSuccess } = useToast()

  const zohoRows = useMemo(() => integrations.filter(i => i.provider === 'zoho_books'), [integrations])
  const configured = useMemo(() => zohoRows.filter(i => !isSetupIncomplete(i)), [zohoRows])

  const [screen, setScreen] = useState<Screen>('intro')
  const [authId, setAuthId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Shared lookups
  const [dataFields, setDataFields] = useState<DataField[]>([])
  const [fedBy, setFedBy] = useState<Record<string, string>>({})
  const [fedLoaded, setFedLoaded] = useState(false)

  // Choose data
  const [orgs, setOrgs] = useState<ZohoBooksOrganization[] | 'loading' | 'error'>('loading')
  const [orgId, setOrgId] = useState('')
  const [branches, setBranches] = useState<ZohoBooksBranch[]>([])
  const [branchId, setBranchId] = useState('')
  const [selected, setSelected] = useState<Set<ZohoBooksModule>>(new Set())
  const [showMore, setShowMore] = useState(false)
  const [accounts, setAccounts] = useState<Record<string, ZohoBooksAccount[] | 'loading' | 'error'>>({})
  const [glPicked, setGlPicked] = useState<Record<string, string[]>>({ gl_revenue: [], gl_expense: [] })
  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({})

  // Map & schedule
  const [units, setUnits] = useState<SourceUnit[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [fieldsByModule, setFieldsByModule] = useState<Record<string, ExternalField[] | 'loading' | 'error'>>({})
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({})
  const [schedule, setSchedule] = useState<SyncSchedule>('24h')
  const [historyDays, setHistoryDays] = useState(365)
  const [resyncDays, setResyncDays] = useState(365)
  const [resyncing, setResyncing] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  // Sync / done
  const [results, setResults] = useState<SyncResult[]>([])

  // Edit
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState<string | null>(null)

  // --- Opening ---
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setShowErrors(false)
    setResults([])
    setUnits([])
    setFieldsByModule({})
    setPreviews({})
    setAccounts({})
    setGlPicked({ gl_revenue: [], gl_expense: [] })
    setShowMore(false)

    if (editIntegration) {
      setAuthId(editIntegration.id)
      setScreen('edit')
      return
    }
    const resume = resumeAuthId ? zohoRows.find(i => i.id === resumeAuthId && i.status === 'connected') : undefined
    const reuse = resume ?? zohoRows.find(i => i.status === 'connected')
    setAuthId(reuse?.id ?? null)
    setSelected(new Set(configured.length ? [] : ['invoices']))
    setScreen(reuse ? 'choose' : 'intro')
    // Only when the modal opens; later list refreshes must not reset the flow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editIntegration, resumeAuthId])

  // Data fields + which ones other integrations already fill
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setFedLoaded(false)
    dataFieldsApi.getAll().then(r => { if (!cancelled) setDataFields(r.data_fields) }).catch(() => {})
    const others = integrations.filter(i => i.mapping_count > 0 && i.id !== editIntegration?.id)
    Promise.all(others.map(i => integrationsApi.getById(i.id).catch(() => null))).then(details => {
      if (cancelled) return
      const map: Record<string, string> = {}
      details.forEach(d => d?.field_mappings.forEach(m => { map[m.data_field_id] = d.display_name }))
      setFedBy(map)
      setFedLoaded(true)
    })
    return () => { cancelled = true }
  }, [isOpen, integrations, editIntegration])

  // Organisations for the sign-in
  useEffect(() => {
    if (!isOpen || screen !== 'choose' || !authId) return
    let cancelled = false
    setOrgs('loading')
    integrationsApi.zohoBooks.organizations(authId).then(list => {
      if (cancelled) return
      setOrgs(list)
      const used = configured.map(i => cfg(i).zoho_org_id).find(id => id && list.some(o => o.id === id))
      setOrgId(prev => (prev && list.some(o => o.id === prev) ? prev : used || list.find(o => o.is_default)?.id || list[0]?.id || ''))
    }).catch(err => {
      if (cancelled) return
      setOrgs('error')
      setError(getApiError(err, "Couldn't load your Zoho organisations"))
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, screen === 'choose', authId])

  // Branches for the chosen org
  useEffect(() => {
    if (!authId || !orgId || screen !== 'choose') return
    let cancelled = false
    integrationsApi.zohoBooks.branches(authId, orgId)
      .then(list => { if (!cancelled) setBranches(list) })
      .catch(() => { if (!cancelled) setBranches([]) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authId, orgId, screen === 'choose'])

  // Chart of accounts, when a per-department source is ticked
  useEffect(() => {
    if (!authId || !orgId) return
    const kinds = new Set<GlKind>()
    selected.forEach(m => { const g = sourceById(m)?.gl; if (g) kinds.add(g) })
    kinds.forEach(kind => {
      const key = `${orgId}|${kind}`
      if (accounts[key]) return
      setAccounts(a => ({ ...a, [key]: 'loading' }))
      integrationsApi.zohoBooks.accounts(authId, orgId, kind)
        .then(list => setAccounts(a => ({ ...a, [key]: list })))
        .catch(() => setAccounts(a => ({ ...a, [key]: 'error' })))
    })
  }, [authId, orgId, selected, accounts])

  // Sources that already sync for this org + branch
  const existingKeys = useMemo(() => new Set(configured.map(integrationSourceKey)), [configured])
  const isLive = (module: string, gl = '') => existingKeys.has(sourceKey(orgId, branchId, module, gl))

  // --- Units (one per module, or per GL account) ---
  const plannedKeys = useMemo(() => {
    const keys: { key: string; module: ZohoBooksModule; glAccount?: { id: string; name: string } }[] = []
    ZOHO_SOURCES.forEach(s => {
      if (!selected.has(s.id)) return
      if (!s.gl) { keys.push({ key: s.id, module: s.id }); return }
      const list = accounts[`${orgId}|${s.gl}`]
      ;(glPicked[s.id] || []).forEach(id => {
        const acct = Array.isArray(list) ? list.find(a => a.id === id) : undefined
        keys.push({ key: `${s.id}:${id}`, module: s.id, glAccount: { id, name: acct?.name ?? id } })
      })
    })
    return keys
  }, [selected, glPicked, accounts, orgId])

  const glMissing = ZOHO_SOURCES.some(s => s.gl && selected.has(s.id) && !(glPicked[s.id] || []).length)

  const fieldByName = useCallback(
    (name: string) => dataFields.find(f => f.name.trim().toLowerCase() === name.trim().toLowerCase()),
    [dataFields],
  )

  const defaultTarget = useCallback((name: string): MappingRow['target'] => {
    const field = fieldByName(name)
    if (field && !fedBy[field.id]) return { existingId: field.id }
    return { newName: field ? `${name} (Zoho)` : name }
  }, [fieldByName, fedBy])

  const goToMap = () => {
    const built = plannedKeys.map(p => {
      const prev = units.find(u => u.key === p.key)
      if (prev) return prev
      const rows: MappingRow[] = presetsFor(p.module, p.glAccount?.name).map(preset => ({
        id: newRowId(), field: preset.field, aggregation: preset.aggregation, on: preset.on, custom: false,
        target: defaultTarget(preset.target),
      }))
      return { key: p.key, module: p.module, glAccount: p.glAccount, name: sourceName(p.module, p.glAccount?.name), rows }
    })
    setUnits(built)
    setOpenKey(built[0]?.key ?? null)
    setShowErrors(false)
    setError(null)
    setScreen('map')
  }

  // Lazy-load a section's Zoho values and preview when it opens
  const loadForUnit = useCallback((unit: SourceUnit, org: string, branch: string, auth: string) => {
    if (!fieldsByModule[unit.module]) {
      setFieldsByModule(f => ({ ...f, [unit.module]: 'loading' }))
      integrationsApi.zohoBooks.fields(auth, org, unit.module)
        .then(list => setFieldsByModule(f => ({ ...f, [unit.module]: list })))
        .catch(() => setFieldsByModule(f => ({ ...f, [unit.module]: 'error' })))
    }
    if (!sourceById(unit.module)?.gl && !previews[unit.key]) {
      setPreviews(p => ({ ...p, [unit.key]: 'loading' }))
      integrationsApi.zohoBooks.preview(auth, org, unit.module, branch || undefined)
        .then(rows => setPreviews(p => ({ ...p, [unit.key]: rows })))
        .catch(() => setPreviews(p => ({ ...p, [unit.key]: 'error' })))
    }
  }, [fieldsByModule, previews])

  useEffect(() => {
    if (screen !== 'map' || !openKey || !authId || !orgId) return
    const unit = units.find(u => u.key === openKey)
    if (unit) loadForUnit(unit, orgId, branchId, authId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, openKey])

  // --- Validation (mirrors the backend so problems show next to the row) ---
  const validation = useMemo(() => {
    const errors: Record<string, string> = {}
    const seen = new Map<string, string>()
    let emptyUnit = false
    units.forEach(unit => {
      const on = unit.rows.filter(r => r.on)
      if (!on.length) emptyUnit = true
      on.forEach(row => {
        let identity: string
        if ('newName' in row.target) {
          const name = row.target.newName.trim()
          if (!name) { errors[row.id] = 'Give the new field a name.'; return }
          const match = fieldByName(name)
          identity = match ? match.id : `new:${name.toLowerCase()}`
        } else {
          identity = row.target.existingId
        }
        if (fedBy[identity]) { errors[row.id] = `"${targetName(row, dataFields)}" is already filled by ${fedBy[identity]}.`; return }
        const other = seen.get(identity)
        if (other) { errors[row.id] = `Also used by ${other}. Each field can only take one value.`; return }
        seen.set(identity, unit.name)
      })
    })
    return { errors, ok: !emptyUnit && Object.keys(errors).length === 0 }
  }, [units, fedBy, fieldByName, dataFields])

  const mappingPayload = (row: MappingRow): ZohoBooksSourceMappingInput => {
    const agg: ZohoAggregation = row.aggregation
    const base = { external_field_name: row.field, external_field_label: row.zohoLabel, aggregation: agg }
    if ('existingId' in row.target) return { ...base, data_field_id: row.target.existingId }
    const match = fieldByName(row.target.newName)
    return match ? { ...base, data_field_id: match.id } : { ...base, new_field_name: row.target.newName.trim() }
  }

  // --- Actions ---
  const signIn = async () => {
    setBusy(true)
    setError(null)
    try {
      const pending = zohoRows.find(i => isSetupIncomplete(i) && i.status !== 'connected')
      const holder = pending ?? await integrationsApi.create({
        provider: 'zoho_books', display_name: 'Zoho Books', config: {}, sync_schedule: 'manual',
      })
      const { authorize_url } = await integrationsApi.getOAuthUrl('zoho_books', holder.id)
      window.location.href = authorize_url
    } catch (err) {
      setError(getApiError(err, "Couldn't start the Zoho sign-in"))
      setBusy(false)
    }
  }

  const startSyncing = async () => {
    if (!authId) return
    if (!validation.ok) {
      setShowErrors(true)
      const bad = units.find(u => !u.rows.some(r => r.on) || u.rows.some(r => validation.errors[r.id]))
      if (bad) setOpenKey(bad.key)
      return
    }
    setBusy(true)
    setError(null)
    let created: Integration[]
    try {
      created = await integrationsApi.zohoBooks.createSources(authId, {
        org_id: orgId,
        branch_id: branchId || undefined,
        sync_schedule: schedule,
        history_days: historyDays,
        sources: units.map(u => ({
          module: u.module,
          gl_account_id: u.glAccount?.id,
          display_name: displayNameFor(u.module, u.glAccount?.name),
          mappings: u.rows.filter(r => r.on).map(mappingPayload),
        })),
      })
    } catch (err) {
      setError(getApiError(err, "Couldn't save these sources"))
      setBusy(false)
      return
    }
    onChanged()
    setBusy(false)
    setAuthId(created[0].id)
    setScreen('sync')

    // First sync, one source at a time
    const out: SyncResult[] = created.map(integration => ({ integration, state: 'waiting' }))
    setResults([...out])
    for (let i = 0; i < out.length; i++) {
      out[i] = { ...out[i], state: 'running' }
      setResults([...out])
      try {
        const log = await integrationsApi.triggerSync(out[i].integration.id)
        out[i] = {
          ...out[i],
          state: log.status === 'failed' ? 'failed' : 'success',
          message: log.status === 'failed'
            ? (log.summary || 'Sync failed')
            : log.rows_written
              ? `${log.rows_written} values synced`
              : (log.summary || 'No data in the last 30 days'),
        }
      } catch (err) {
        out[i] = { ...out[i], state: 'failed', message: getApiError(err, 'Sync failed') }
      }
      setResults([...out])
    }
    onChanged()
    setScreen('done')
  }

  const addMore = () => {
    setSelected(new Set())
    setGlPicked({ gl_revenue: [], gl_expense: [] })
    setUnits([])
    setPreviews({})
    setResults([])
    setShowMore(false)
    setError(null)
    setScreen('choose')
  }

  // --- Edit an existing source ---
  useEffect(() => {
    if (!isOpen || screen !== 'edit' || !editIntegration) return
    let cancelled = false
    const c = cfg(editIntegration)
    const module = (c.module || 'invoices') as ZohoBooksModule
    setEditName(editIntegration.display_name)
    setSchedule(editIntegration.sync_schedule)
    setOrgId(c.zoho_org_id || '')
    setBranchId(c.branch_id || '')
    setEditNote(null)
    integrationsApi.getById(editIntegration.id).then(detail => {
      if (cancelled) return
      let converted = false
      const rows: MappingRow[] = detail.field_mappings.map(m => {
        let aggregation = m.aggregation as ZohoAggregation | 'direct'
        if (aggregation === 'direct') { aggregation = 'sum'; converted = true }
        return {
          id: newRowId(), field: m.external_field_name, zohoLabel: m.external_field_label ?? undefined,
          aggregation, on: m.is_active, custom: true, target: { existingId: m.data_field_id },
        }
      })
      if (converted) {
        setEditNote("Some values were set to \"Direct value\", which never syncs for Zoho Books. They're now \"Add up per day\". Check them and save.")
      }
      const unit: SourceUnit = { key: 'edit', module, name: editIntegration.display_name, rows }
      setUnits([unit])
      if (c.zoho_org_id) loadForUnit(unit, c.zoho_org_id, c.branch_id || '', editIntegration.id)
    }).catch(err => setError(getApiError(err, "Couldn't load this integration")))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, screen === 'edit', editIntegration])

  const resyncHistory = async () => {
    if (!editIntegration) return
    setResyncing(true)
    setError(null)
    try {
      await integrationsApi.resync(editIntegration.id, resyncDays)
      toastSuccess('Re-syncing history', 'This runs in the background. Check sync history for progress.')
    } catch (err) {
      setError(getApiError(err, "Couldn't start the re-sync"))
    } finally {
      setResyncing(false)
    }
  }

  const saveEdit = async () => {
    if (!editIntegration || !units[0]) return
    if (!validation.ok) { setShowErrors(true); return }
    setBusy(true)
    setError(null)
    try {
      const mappings = []
      for (const row of units[0].rows.filter(r => r.on)) {
        const p = mappingPayload(row)
        let dataFieldId = p.data_field_id
        if (!dataFieldId && p.new_field_name) {
          dataFieldId = (await dataFieldsApi.create({ name: p.new_field_name, entry_interval: 'daily' })).id
        }
        mappings.push({
          external_field_name: p.external_field_name,
          external_field_label: p.external_field_label,
          aggregation: p.aggregation,
          data_field_id: dataFieldId!,
        })
      }
      await integrationsApi.setMappings(editIntegration.id, mappings)
      await integrationsApi.update(editIntegration.id, {
        display_name: editName.trim() || editIntegration.display_name,
        sync_schedule: schedule,
      })
      toastSuccess('Saved', `${editName.trim() || editIntegration.display_name} is updated.`)
      onChanged()
      onClose()
    } catch (err) {
      setError(getApiError(err, "Couldn't save changes"))
    } finally {
      setBusy(false)
    }
  }

  // --- Rendering ---
  const orgList = Array.isArray(orgs) ? orgs : []
  const org = orgList.find(o => o.id === orgId)
  const stepIdx = STEP_INDEX[screen]
  const syncing = screen === 'sync'

  const header = (
    <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-dark-700">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#4BC882] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">ZB</div>
        <div className="min-w-0">
          <Dialog.Title className="text-base font-semibold text-foreground">
            {screen === 'edit' ? `Edit ${editIntegration?.display_name ?? ''}` : 'Connect Zoho Books'}
          </Dialog.Title>
          {screen === 'choose' && configured.length > 0 && <p className="text-xs text-dark-400">Adding to your Zoho Books connection</p>}
          {screen === 'map' && org && <p className="text-xs text-dark-400 truncate">{org.name}</p>}
        </div>
      </div>
      <button onClick={onClose} disabled={syncing} className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-800 transition-colors disabled:opacity-40" aria-label="Close">
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  )

  const stepper = stepIdx >= 0 && (
    <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 py-2.5 border-b border-dark-700 bg-dark-850">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          {i > 0 && <span className="w-4 h-px bg-dark-600" />}
          <span className={cn(
            'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold',
            i < stepIdx ? 'bg-success-500/15 text-success-400' : i === stepIdx ? 'bg-brand text-white' : 'border border-dark-600 text-dark-400',
          )}>
            {i < stepIdx ? <CheckIcon className="w-3 h-3 stroke-[3]" /> : i + 1}
          </span>
          <span className={cn('text-xs font-semibold', i === stepIdx ? 'text-foreground' : 'text-dark-400')}>{s}</span>
        </div>
      ))}
    </div>
  )

  const scheduleChips = (
    <div className="flex flex-wrap gap-1.5">
      {SCHEDULES.map(s => (
        <button
          key={s.value}
          type="button"
          aria-pressed={schedule === s.value}
          onClick={() => setSchedule(s.value)}
          className={cn(
            'px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors',
            schedule === s.value ? 'border-brand/60 bg-brand/10 text-brand' : 'border-dark-700 text-dark-400 hover:text-foreground hover:border-dark-600',
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  )

  let body: React.ReactNode = null
  let footer: React.ReactNode = null

  if (screen === 'intro') {
    body = (
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-bold text-foreground">Sign in to Zoho, then choose what to sync</h3>
          <p className="text-sm text-dark-400 mt-1">We find your organisation, branches and accounts for you, so there are no IDs to copy.</p>
        </div>
        <div className="rounded-xl border border-dark-700 overflow-hidden divide-y divide-dark-700">
          {[
            { icon: BuildingOffice2Icon, title: 'Organisations and branches', text: 'So you can pick which company and branch to track' },
            { icon: DocumentTextIcon, title: 'Invoices, bills, expenses and payments', text: 'Totalled per day and saved to your data fields' },
            { icon: BookOpenIcon, title: 'Chart of accounts and journals', text: 'Needed for revenue or salary by department' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 px-4 py-3 bg-dark-850">
              <span className="w-7 h-7 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-dark-400" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-dark-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
    footer = (
      <div className="flex gap-2 ml-auto">
        <button onClick={onClose} className="px-4 py-2 text-sm text-dark-300 hover:text-foreground">Cancel</button>
        <button onClick={signIn} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50">
          {busy ? 'Opening Zoho…' : 'Sign in with Zoho'} {!busy && <ArrowRightIcon className="w-4 h-4" />}
        </button>
      </div>
    )
  }

  if (screen === 'choose') {
    const shown = ZOHO_SOURCES.filter(s => showMore || !s.more || selected.has(s.id))
    const hiddenCount = ZOHO_SOURCES.filter(s => s.more && !selected.has(s.id)).length
    body = orgs === 'loading' ? (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-dark-400"><Spinner /> Loading your Zoho organisations…</div>
    ) : orgs === 'error' ? (
      <div className="py-10 text-center space-y-3">
        <p className="text-sm text-dark-300">We couldn't read your Zoho Books organisations.</p>
        <button onClick={signIn} className="text-sm font-semibold text-brand hover:underline">Sign in to Zoho again</button>
      </div>
    ) : (
      <div className="space-y-5">
        {configured.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 rounded-xl border border-dark-700 bg-dark-850 text-xs text-dark-300">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-success-400">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400" />Connected
            </span>
            Using your Zoho sign-in. No need to sign in again.
            <button onClick={signIn} className="ml-auto font-semibold text-brand hover:underline">Use a different Zoho account</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="flex items-center justify-between text-xs font-semibold text-foreground mb-1.5">
              Organisation
              {orgList.length > 1 && <span className="text-[10px] font-bold uppercase tracking-wider text-success-400">{orgList.length} found</span>}
            </span>
            <select value={orgId} onChange={e => { setOrgId(e.target.value); setBranchId(''); setGlPicked({ gl_revenue: [], gl_expense: [] }); setUnits([]); setFieldsByModule({}); setPreviews({}) }} className={selectClass}>
              {orgList.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {org && <span className="block text-[11px] text-dark-400 mt-1">{[org.currency_code, `Org ID ${org.id}`].filter(Boolean).join(' · ')}</span>}
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-xs font-semibold text-foreground mb-1.5">
              Branch <span className="font-normal text-dark-400">Optional</span>
            </span>
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPreviews({}) }} disabled={!branches.length} className={cn(selectClass, 'disabled:opacity-60')}>
              <option value="">{branches.length ? 'All branches' : 'No branches set up'}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">What do you want to sync?</h3>
            <span className="text-xs text-dark-400">Pick as many as you like</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {shown.map(s => {
              const live = !s.gl && isLive(s.id)
              const on = selected.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={live}
                  onClick={() => setSelected(prev => {
                    const next = new Set(prev)
                    if (next.has(s.id)) next.delete(s.id); else next.add(s.id)
                    return next
                  })}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border text-left transition-colors',
                    on ? 'border-brand/60 bg-brand/10' : 'border-dark-700 bg-dark-850 hover:border-dark-600',
                    live && 'opacity-60 cursor-default hover:border-dark-700',
                  )}
                >
                  <span className={cn(
                    'mt-0.5 w-4 h-4 rounded-[5px] border flex items-center justify-center flex-shrink-0',
                    on ? 'bg-brand border-brand text-white' : 'border-dark-500 text-transparent',
                  )}>
                    <CheckIcon className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                      {s.name}
                      {live && <span className="text-[9px] font-bold uppercase tracking-wider text-success-400 bg-success-500/10 rounded px-1.5 py-0.5">Syncing</span>}
                      {!live && s.gl && <span className="text-[9px] font-bold uppercase tracking-wider text-brand bg-brand/10 rounded px-1.5 py-0.5">Per department</span>}
                    </span>
                    <span className="block text-xs text-dark-400 mt-0.5">{s.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {!showMore && hiddenCount > 0 && (
            <button onClick={() => setShowMore(true)} className="mt-2.5 text-xs font-semibold text-brand hover:underline">
              Show {hiddenCount} more sources
            </button>
          )}
        </div>

        {ZOHO_SOURCES.filter(s => s.gl && selected.has(s.id)).map(s => {
          const list = accounts[`${orgId}|${s.gl}`]
          const q = (accountSearch[s.id] || '').trim().toLowerCase()
          const picked = glPicked[s.id] || []
          return (
            <div key={s.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground">{s.name}: {s.gl === 'income' ? 'income accounts' : 'expense accounts'}</span>
                <span className="text-[11px] text-dark-400">Each account syncs separately</span>
              </div>
              <div className="rounded-xl border border-dark-700 bg-dark-850 overflow-hidden">
                {list === 'loading' || !list ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-xs text-dark-400"><Spinner size="xs" /> Loading your chart of accounts…</div>
                ) : list === 'error' ? (
                  <p className="px-4 py-3 text-xs text-danger-400">Couldn't load accounts from Zoho. Untick and tick this source to retry.</p>
                ) : list.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-dark-400">No active {s.gl} accounts in this organisation.</p>
                ) : (
                  <>
                    <input
                      value={accountSearch[s.id] || ''}
                      onChange={e => setAccountSearch(a => ({ ...a, [s.id]: e.target.value }))}
                      placeholder={`Search ${list.length} accounts`}
                      className="w-full bg-transparent border-b border-dark-700 px-4 py-2.5 text-sm text-foreground placeholder-dark-500 focus:outline-none"
                    />
                    <div className="max-h-44 overflow-y-auto">
                      {list.filter(a => !q || `${a.name} ${a.code ?? ''}`.toLowerCase().includes(q)).map(a => {
                        const live = isLive(s.id, a.id)
                        const on = picked.includes(a.id)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            disabled={live}
                            onClick={() => setGlPicked(g => ({ ...g, [s.id]: on ? picked.filter(x => x !== a.id) : [...picked, a.id] }))}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm border-t border-dark-800 first:border-t-0 hover:bg-dark-800 disabled:opacity-60 disabled:hover:bg-transparent"
                          >
                            <span className={cn(
                              'w-4 h-4 rounded-[5px] border flex items-center justify-center flex-shrink-0',
                              on ? 'bg-brand border-brand text-white' : 'border-dark-500 text-transparent',
                            )}>
                              <CheckIcon className="w-3 h-3 stroke-[3]" />
                            </span>
                            <span className={cn('truncate', on ? 'text-foreground font-semibold' : 'text-dark-200')}>{a.name}</span>
                            {live && <span className="text-[9px] font-bold uppercase tracking-wider text-success-400">Syncing</span>}
                            {a.code && <span className="ml-auto text-[11px] text-dark-500 tabular-nums">{a.code}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
    footer = (
      <>
        <span className="text-xs text-dark-400"><b className="text-foreground tabular-nums">{plannedKeys.length}</b> {plannedKeys.length === 1 ? 'source' : 'sources'} selected</span>
        <button
          onClick={goToMap}
          disabled={!orgId || plannedKeys.length === 0 || glMissing || !fedLoaded}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          Continue <ArrowRightIcon className="w-4 h-4" />
        </button>
      </>
    )
  }

  if (screen === 'map') {
    body = (
      <div className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Values to bring in</h3>
            <span className="text-xs text-dark-400">We picked likely matches</span>
          </div>
          <div className="space-y-2.5">
            {units.map(unit => (
              <SourceSection
                key={unit.key}
                unit={unit}
                open={openKey === unit.key}
                onToggle={() => setOpenKey(k => (k === unit.key ? null : unit.key))}
                onChange={u => setUnits(list => list.map(x => (x.key === u.key ? u : x)))}
                dataFields={dataFields}
                fedBy={fedBy}
                errors={showErrors ? validation.errors : {}}
                zohoFields={fieldsByModule[unit.module]}
                preview={previews[unit.key]}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Keep {units.length === 1 ? 'it' : 'them'} updated</h3>
            {units.length > 1 && <span className="text-xs text-dark-400">Applies to all. Change any one later.</span>}
          </div>
          {scheduleChips}
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Bring in history from</h3>
            <span className="text-xs text-dark-400">Anything older than 30 days loads in the background</span>
          </div>
          <div className="relative max-w-xs">
            <select value={historyDays} onChange={e => setHistoryDays(Number(e.target.value))} className={selectClass}>
              {HISTORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    )
    footer = (
      <>
        <button onClick={() => setScreen('choose')} className="inline-flex items-center gap-1 text-sm text-dark-300 hover:text-foreground">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <button onClick={startSyncing} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50">
          {busy ? 'Saving…' : `Start syncing${units.length > 1 ? ` ${units.length} sources` : ''}`}
          {!busy && <ArrowRightIcon className="w-4 h-4" />}
        </button>
      </>
    )
  }

  if (screen === 'sync' || screen === 'done') {
    const failed = results.filter(r => r.state === 'failed').length
    body = (
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center gap-2 py-3">
          {screen === 'sync' ? <Spinner size="md" /> : (
            <span className={cn('w-12 h-12 rounded-full flex items-center justify-center', failed ? 'bg-warning-500/15 text-warning-400' : 'bg-success-500/15 text-success-400')}>
              {failed ? <ExclamationTriangleIcon className="w-6 h-6" /> : <CheckIcon className="w-6 h-6 stroke-[2.5]" />}
            </span>
          )}
          <h3 className="text-base font-bold text-foreground">
            {screen === 'sync' ? 'Pulling your data from Zoho'
              : failed ? `${results.length - failed} of ${results.length} sources synced`
              : results.length === 1 ? `${results[0].integration.display_name} is live` : `${results.length} sources are live`}
          </h3>
          <p className="text-xs text-dark-400">
            {screen === 'sync' ? 'Bringing in the last 30 days first.'
              : [
                  historyDays > 30 && `The rest of your ${HISTORY_OPTIONS.find(o => o.value === historyDays)?.label.toLowerCase()} loads in the background over the next few minutes.`,
                  schedule === 'manual' ? 'Sync them any time from the integrations list.'
                    : `They'll update ${SCHEDULES.find(s => s.value === schedule)?.label.toLowerCase()} from now on.`,
                ].filter(Boolean).join(' ')}
          </p>
        </div>
        <div className="rounded-xl border border-dark-700 overflow-hidden divide-y divide-dark-700">
          {results.map(r => (
            <div key={r.integration.id} className="flex items-center gap-3 px-4 py-3 bg-dark-850">
              <span className="w-5 flex justify-center">
                {r.state === 'running' ? <Spinner size="xs" />
                  : r.state === 'success' ? <CheckIcon className="w-4 h-4 text-success-400 stroke-[2.5]" />
                  : r.state === 'failed' ? <ExclamationTriangleIcon className="w-4 h-4 text-danger-400" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-dark-500" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{r.integration.display_name}</p>
                <p className={cn('text-xs truncate', r.state === 'failed' ? 'text-danger-400' : 'text-dark-400')}>
                  {r.state === 'waiting' ? 'Waiting…' : r.state === 'running' ? 'Syncing…' : r.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
    footer = screen === 'done' && (
      <>
        <button onClick={addMore} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dark-600 text-sm text-dark-200 hover:text-foreground hover:border-dark-500">
          <PlusIcon className="w-4 h-4" /> Add more sources
        </button>
        <button onClick={onClose} className="ml-auto px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600">Done</button>
      </>
    )
  }

  if (screen === 'edit') {
    body = units[0] ? (
      <div className="space-y-5">
        <label className="block">
          <span className="block text-xs font-semibold text-foreground mb-1.5">Name</span>
          <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-dark-500" />
        </label>
        {editNote && <p className="text-xs text-warning-400 bg-warning-500/10 border border-warning-500/20 rounded-lg px-3 py-2">{editNote}</p>}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Values to bring in</h3>
          <SourceSection
            unit={units[0]}
            open
            flat
            onChange={u => setUnits([u])}
            dataFields={dataFields}
            fedBy={fedBy}
            errors={showErrors ? validation.errors : {}}
            zohoFields={fieldsByModule[units[0].module]}
            preview={previews[units[0].key]}
          />
          {showErrors && !units[0].rows.some(r => r.on) && <p className="mt-2 text-xs text-danger-400">Keep at least one value.</p>}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Keep it updated</h3>
          {scheduleChips}
        </div>
        <div className="rounded-xl border border-dark-700 bg-dark-850 p-4">
          <h3 className="text-sm font-semibold text-foreground">Re-sync history</h3>
          <p className="text-xs text-dark-400 mt-0.5 mb-3">
            Pull this period from Zoho again and replace the synced values. Use it after changing values above, or if older numbers look off.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={resyncDays} onChange={e => setResyncDays(Number(e.target.value))} className={cn(selectClass, 'w-auto')}>
              {HISTORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              type="button"
              onClick={resyncHistory}
              disabled={resyncing}
              className="px-3 py-2 rounded-lg border border-dark-600 text-sm font-semibold text-dark-200 hover:text-foreground hover:border-dark-500 disabled:opacity-50"
            >
              {resyncing ? 'Starting…' : 'Re-sync'}
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-dark-400"><Spinner /> Loading…</div>
    )
    footer = (
      <div className="flex gap-2 ml-auto">
        <button onClick={onClose} className="px-4 py-2 text-sm text-dark-300 hover:text-foreground">Cancel</button>
        <button onClick={saveEdit} disabled={busy || !units[0]} className="px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={syncing ? () => {} : onClose}
      className="w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-2xl shadow-xl overflow-hidden"
    >
      {header}
      {stepper}
      <div className="px-5 sm:px-6 py-5 max-h-[65vh] overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/30 rounded-lg text-sm text-danger-400">{error}</div>
        )}
        {showErrors && !validation.ok && screen === 'map' && (
          <div className="mb-4 p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg text-sm text-warning-400">
            Fix the highlighted values before syncing.
          </div>
        )}
        {body}
      </div>
      {footer && <div className="flex flex-wrap items-center gap-3 px-5 sm:px-6 py-4 border-t border-dark-700">{footer}</div>}
    </Modal>
  )
}
