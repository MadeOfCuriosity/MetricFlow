import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  Bars3BottomLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ChatInterface } from './ChatInterface'
import { useToast } from '../context/ToastContext'
import { useRoom } from '../context/RoomContext'
import api from '../services/api'
import { dataFieldsApi } from '../services/dataFields'
import { getApiError } from '../lib/apiError'
import { checkFormula } from '../lib/formula'
import type { TimePeriod } from '../types/kpi'
import type { DataField } from '../types/dataField'
import { ManualKPIForm, EMPTY_DRAFT, KPI_CATEGORIES, type ManualDraft } from './kpi-studio/ManualKPIForm'
import { PresetLibrary, type Preset } from './kpi-studio/PresetLibrary'
import { StudioSidePanel } from './kpi-studio/StudioSidePanel'


interface KPISuggestion {
  name: string
  description?: string
  category: string
  formula: string
  input_fields: string[]
  unit?: string
  direction?: 'up' | 'down'
  time_period?: TimePeriod
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestion?: KPISuggestion
  timestamp: Date
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

type StudioTab = 'ai' | 'manual' | 'presets'

export interface StudioHistoryItem {
  id: string
  title: string
  timestamp: string // ISO string
  type: StudioTab
  kpiName?: string
  roomName?: string
  messages?: Message[]
  manualDraft?: ManualDraft
}

const STORAGE_KEY = 'metricflow_kpi_studio_history_v1'
const MAX_SESSIONS = 25

const TABS: { value: StudioTab; label: string; title: string }[] = [
  { value: 'ai', label: 'AI', title: 'Describe what you want to measure and get a formula suggested' },
  { value: 'manual', label: 'Manual', title: 'Write the formula yourself from your data fields' },
  { value: 'presets', label: 'Presets', title: 'Pick a proven, ready-made KPI' },
]

const SIDE_PANEL_TITLES: Record<StudioTab, string> = {
  ai: 'How it works',
  manual: 'Preview',
  presets: 'About presets',
}

const newSessionId = () => `session_${Date.now()}`
const normalizeName = (name: string) => name.trim().toLowerCase()

export interface KPICreationStudioProps {
  onKpiCreated?: (kpiName: string) => void
  onViewAllKpis?: () => void
}

export function KPICreationStudio({
  onKpiCreated,
  onViewAllKpis,
}: KPICreationStudioProps) {
  const { success, error: showError } = useToast()
  const { rooms } = useRoom()

  // Panel Collapse States
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)
  const [isStudioOpen, setIsStudioOpen] = useState(true)

  // Middle Section Active Tab
  const [activeMiddleTab, setActiveMiddleTab] = useState<StudioTab>('ai')

  // Room new KPIs are assigned to — shared by all three modes
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')

  // Org context: data fields (for formula suggestions) and existing KPI names (duplicate checks)
  const [dataFields, setDataFields] = useState<DataField[]>([])
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set())

  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingKPI, setIsAddingKPI] = useState(false)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; limit: number } | null>(null)

  // Success Banner State
  const [lastCreatedKpi, setLastCreatedKpi] = useState<string | null>(null)

  // History State
  const [sessions, setSessions] = useState<StudioHistoryItem[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>(newSessionId)
  const [historySearchQuery, setHistorySearchQuery] = useState('')

  // Manual Form State
  const [draft, setDraft] = useState<ManualDraft>(EMPTY_DRAFT)
  const [manualSubmitAttempted, setManualSubmitAttempted] = useState(false)
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)

  // Presets State
  const [presets, setPresets] = useState<Preset[]>([])
  const [presetsLoaded, setPresetsLoaded] = useState(false)
  const [isLoadingPresets, setIsLoadingPresets] = useState(false)
  const [presetsError, setPresetsError] = useState<string | null>(null)
  const [importingPresetName, setImportingPresetName] = useState<string | null>(null)

  const loadDataFields = useCallback(() => {
    dataFieldsApi
      .getAll()
      .then((res) => setDataFields(res.data_fields))
      .catch(() => {})
  }, [])

  const loadKpiNames = useCallback(() => {
    api
      .get<{ kpis: { name: string }[] }>('/api/kpis')
      .then((res) => setExistingNames(new Set(res.data.kpis.map((k) => normalizeName(k.name)))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadDataFields()
    loadKpiNames()
  }, [loadDataFields, loadKpiNames])

  // Load History from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setSessions(parsed)
        }
      }
    } catch (e) {
      console.error('Failed to parse studio history:', e)
    }
  }, [])

  // Save History to localStorage helper
  const saveSessions = (updated: StudioHistoryItem[]) => {
    setSessions(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to save studio history:', e)
    }
  }

  // Proactively check AI rate limit on mount
  useEffect(() => {
    api
      .get('/api/ai/rate-limit')
      .then((res) => {
        const { remaining_calls, limit_per_day, allowed } = res.data
        setRateLimitInfo({ remaining: remaining_calls, limit: limit_per_day })
        if (!allowed) {
          setRateLimitError(`You've used all ${limit_per_day} AI messages for today. They reset at midnight UTC — meanwhile, use Manual or Presets.`)
        }
      })
      .catch(() => {})
  }, [])

  const loadPresets = useCallback(() => {
    setIsLoadingPresets(true)
    setPresetsError(null)
    api
      .get('/api/kpis/available-presets')
      .then((res) => {
        setPresets(res.data?.available_presets || [])
        setPresetsLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load presets:', err)
        setPresetsError(getApiError(err, "Couldn't load the preset library."))
      })
      .finally(() => setIsLoadingPresets(false))
  }, [])

  // Load presets the first time the Presets tab opens
  useEffect(() => {
    if (activeMiddleTab === 'presets' && !presetsLoaded && !isLoadingPresets && !presetsError) {
      loadPresets()
    }
  }, [activeMiddleTab, presetsLoaded, isLoadingPresets, presetsError, loadPresets])

  // After any KPI is created: remember the name, pick up auto-created data fields, notify the page
  const markCreated = (kpiName: string) => {
    setExistingNames((prev) => new Set(prev).add(normalizeName(kpiName)))
    setLastCreatedKpi(kpiName)
    loadDataFields()
    onKpiCreated?.(kpiName)
  }

  const roomSuffix = () => {
    const room = rooms.find((r) => r.id === selectedRoomId)
    return room ? ` and added to ${room.name}` : ''
  }

  // Record or update a session in History
  const updateSessionInHistory = (
    sessionId: string,
    item: Omit<StudioHistoryItem, 'id' | 'timestamp' | 'roomName'>
  ) => {
    const roomName = rooms.find((r) => r.id === selectedRoomId)?.name
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === sessionId)
      const newItem: StudioHistoryItem = {
        id: sessionId,
        timestamp: new Date().toISOString(),
        roomName,
        ...item,
        kpiName: item.kpiName || existing?.kpiName,
      }
      const updated = [newItem, ...prev.filter((s) => s.id !== sessionId)].slice(0, MAX_SESSIONS)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }

  const resetWorkspace = () => {
    setCurrentSessionId(newSessionId())
    setMessages([])
    setConversationHistory([])
    setLastCreatedKpi(null)
    setDraft(EMPTY_DRAFT)
    setManualSubmitAttempted(false)
  }

  // Handle "+ New Session" click — stays on the current tab
  const handleStartNewSession = () => resetWorkspace()

  // Handle restoring a session from history
  const handleRestoreSession = (session: StudioHistoryItem) => {
    resetWorkspace()
    setCurrentSessionId(session.id)
    setActiveMiddleTab(session.type)
    if (session.messages && session.messages.length > 0) {
      const restored = session.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
      setMessages(restored)
      setConversationHistory(restored.map((m) => ({ role: m.role, content: m.content })))
    }
    if (session.manualDraft) {
      setDraft({ ...EMPTY_DRAFT, ...session.manualDraft, unit: session.manualDraft.unit ?? '' })
    }
    setLastCreatedKpi(session.kpiName || null)
  }

  // Delete a session from history
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = sessions.filter((s) => s.id !== sessionId)
    saveSessions(updated)
    if (currentSessionId === sessionId) {
      handleStartNewSession()
    }
  }

  // Clear all history
  const handleClearAllHistory = () => {
    saveSessions([])
    handleStartNewSession()
  }

  // Filtered History
  const filteredSessions = useMemo(() => {
    if (!historySearchQuery.trim()) return sessions
    const q = historySearchQuery.toLowerCase()
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.kpiName && s.kpiName.toLowerCase().includes(q)) ||
        (s.roomName && s.roomName.toLowerCase().includes(q))
    )
  }, [sessions, historySearchQuery])

  // AI Send Message handler
  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)

    const newHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content },
    ]
    setConversationHistory(newHistory)

    setIsLoading(true)
    setRateLimitError(null)

    // Save session title if this is the first message
    if (messages.length === 0) {
      updateSessionInHistory(currentSessionId, { title: content, type: 'ai', messages: nextMessages })
    }

    try {
      const response = await api.post('/api/ai/kpi-builder', {
        user_message: content,
        conversation_history: conversationHistory,
      })

      const {
        ai_response: aiResponse,
        suggested_kpi,
        rate_limit_remaining,
        error: aiError,
      } = response.data

      if (rateLimitInfo && typeof rate_limit_remaining === 'number') {
        setRateLimitInfo({ ...rateLimitInfo, remaining: rate_limit_remaining })
      }

      if (!aiResponse || aiError) {
        showError('AI Error', aiError || 'Empty response received. Please try again.')
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I couldn't generate a response right now. Please try again, or build the KPI in the Manual tab.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errMsg])
        return
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        suggestion: suggested_kpi || undefined,
        timestamp: new Date(),
      }
      const updatedMessages = [...nextMessages, assistantMessage]
      setMessages(updatedMessages)
      setConversationHistory((prev) => [
        ...prev,
        { role: 'assistant', content: aiResponse },
      ])

      updateSessionInHistory(currentSessionId, {
        title: suggested_kpi?.name || nextMessages[0].content,
        type: 'ai',
        messages: updatedMessages,
      })
    } catch (err: any) {
      console.error('AI request error:', err)
      if (err.response?.status === 429) {
        setRateLimitError("You've used all of today's AI messages. They reset at midnight UTC — meanwhile, use Manual or Presets.")
        if (rateLimitInfo) setRateLimitInfo({ ...rateLimitInfo, remaining: 0 })
      } else {
        showError('AI Error', 'Failed to reach the AI service. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // AI Add KPI handler
  const handleAddKPIFromAi = async (
    suggestion: KPISuggestion,
    dataFieldMappings: Record<string, string>
  ) => {
    setIsAddingKPI(true)
    setLastCreatedKpi(null)
    try {
      await api.post('/api/kpis', {
        name: suggestion.name,
        description: suggestion.description,
        category: suggestion.category,
        formula: suggestion.formula,
        time_period: suggestion.time_period || 'daily',
        unit: suggestion.unit || undefined,
        direction: suggestion.direction || undefined,
        data_field_mappings:
          Object.keys(dataFieldMappings).length > 0 ? dataFieldMappings : undefined,
        room_id: selectedRoomId || undefined,
      })

      const where = roomSuffix()
      success('KPI Created', `"${suggestion.name}" has been created${where}`)
      markCreated(suggestion.name)

      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Done — "${suggestion.name}" has been created${where}. Enter values for its data fields on the Entries page and it will calculate automatically. Would you like to build another KPI?`,
        timestamp: new Date(),
      }
      const withConfirm = [...messages, confirmMessage]
      setMessages(withConfirm)
      updateSessionInHistory(currentSessionId, {
        title: suggestion.name,
        type: 'ai',
        messages: withConfirm,
        kpiName: suggestion.name,
      })
    } catch (err: any) {
      console.error('Failed to create KPI:', err)
      if (err.response?.data?.detail?.includes?.('already exists')) {
        setExistingNames((prev) => new Set(prev).add(normalizeName(suggestion.name)))
        showError('Name already used', `A KPI named "${suggestion.name}" already exists. Use Customize to rename it.`)
      } else {
        showError('Failed to Create', getApiError(err, 'Could not create the KPI.'))
      }
    } finally {
      setIsAddingKPI(false)
    }
  }

  // Load an AI suggestion or preset into the manual editor
  const openInManual = (source: {
    name: string
    description?: string | null
    category: string
    formula: string
    time_period?: TimePeriod
    unit?: string | null
    direction?: 'up' | 'down' | null
  }) => {
    setDraft({
      name: source.name,
      description: source.description || '',
      category: (KPI_CATEGORIES as readonly string[]).includes(source.category) ? source.category : 'Custom',
      formula: source.formula,
      time_period: source.time_period || 'monthly',
      unit: source.unit || '',
      direction: source.direction || 'up',
    })
    setManualSubmitAttempted(false)
    setLastCreatedKpi(null)
    setActiveMiddleTab('manual')
  }

  // Manual Form Submit Handler
  const formulaCheck = useMemo(() => checkFormula(draft.formula), [draft.formula])
  const handleManualSubmit = async () => {
    setManualSubmitAttempted(true)
    const name = draft.name.trim()
    if (name.length < 2 || existingNames.has(normalizeName(name)) || !formulaCheck.valid) {
      return
    }

    setIsSubmittingManual(true)
    try {
      await api.post('/api/kpis', {
        name,
        description: draft.description?.trim() || undefined,
        category: draft.category,
        formula: draft.formula.trim(),
        time_period: draft.time_period,
        unit: draft.unit.trim() || undefined,
        direction: draft.direction,
        room_id: selectedRoomId || undefined,
      })

      success('KPI Created', `"${name}" has been created${roomSuffix()}`)
      markCreated(name)
      updateSessionInHistory(currentSessionId, {
        title: name,
        type: 'manual',
        kpiName: name,
        manualDraft: { ...draft, name },
      })

      // Next KPI starts a fresh session; keep category/frequency/unit/direction for batch creation
      setCurrentSessionId(newSessionId())
      setDraft((prev) => ({ ...prev, name: '', formula: '', description: '' }))
      setManualSubmitAttempted(false)
    } catch (err: any) {
      console.error('Failed to create manual KPI:', err)
      if (err.response?.data?.detail?.includes?.('already exists')) {
        setExistingNames((prev) => new Set(prev).add(normalizeName(name)))
      } else {
        showError('Failed to Create', getApiError(err, 'Could not create the KPI.'))
      }
    } finally {
      setIsSubmittingManual(false)
    }
  }

  // Presets: add one as-is
  const handleImportSinglePreset = async (preset: Preset) => {
    setImportingPresetName(preset.name)
    setLastCreatedKpi(null)
    try {
      const res = await api.post('/api/kpis/seed-presets', {
        preset_names: [preset.name],
        room_id: selectedRoomId || undefined,
      })
      // The preset is no longer available either way
      setPresets((prev) => prev.filter((p) => p.name !== preset.name))

      if (!res.data?.presets_created) {
        setExistingNames((prev) => new Set(prev).add(normalizeName(preset.name)))
        showError('Already added', `A KPI named "${preset.name}" already exists.`)
        return
      }

      success('KPI Added', `"${preset.name}" has been added${roomSuffix()}`)
      markCreated(preset.name)
      updateSessionInHistory(newSessionId(), { title: preset.name, type: 'presets', kpiName: preset.name })
    } catch (err: any) {
      console.error('Failed to import preset:', err)
      showError('Could not add preset', getApiError(err, 'Please try again.'))
    } finally {
      setImportingPresetName(null)
    }
  }


  return (
    <div className="flex-1 min-h-0 h-full flex items-stretch gap-3.5 overflow-hidden">
      {/* ========================================================================= */}
      {/* SECTION 1: HISTORY (Left Column, Collapsible) */}
      {/* ========================================================================= */}
      {isHistoryOpen ? (
        <aside className="w-72 flex-shrink-0 h-full self-stretch flex flex-col rounded-2xl bg-dark-900 border border-dark-700 overflow-hidden shadow-sm animate-in fade-in duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-dark-700/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-dark-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                History
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-dark-800 text-dark-400 font-mono">
                {sessions.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleStartNewSession}
                title="New Session"
                className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                title="Collapse History"
                className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* "+ New Session" Quick Action Card */}
          <div className="p-3 border-b border-dark-800">
            <button
              type="button"
              onClick={handleStartNewSession}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dark-700 bg-dark-800/80 hover:bg-dark-750 text-foreground text-xs font-semibold transition-all cursor-pointer shadow-sm group"
            >
              <PlusIcon className="w-3.5 h-3.5 stroke-[2.5] text-brand group-hover:rotate-90 transition-transform" />
              <span>New Session</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="px-3 pt-2.5 pb-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-dark-950/80 border border-dark-700/80 rounded-lg text-xs text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
              />
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
            {filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 px-3 text-center">
                <ClockIcon className="w-8 h-8 text-dark-500 mb-2 opacity-50 stroke-[1.5]" />
                <p className="text-xs font-medium text-dark-300">No history yet</p>
                <p className="text-[11px] text-dark-400 mt-1 max-w-[180px]">
                  Generated KPIs and conversations will appear here.
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isActive = session.id === currentSessionId
                return (
                  <div
                    key={session.id}
                    onClick={() => handleRestoreSession(session)}
                    className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-dark-800 border-dark-600 shadow-sm'
                        : 'bg-dark-950/40 border-dark-800/80 hover:bg-dark-800/50 hover:border-dark-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                              session.type === 'ai'
                                ? 'bg-brand/15 text-brand border border-brand/20'
                                : session.type === 'manual'
                                ? 'bg-warning-500/15 text-warning-400 border border-warning-500/20'
                                : 'bg-success-500/15 text-success-400 border border-success-500/20'
                            }`}
                          >
                            {session.type}
                          </span>
                          {session.roomName && (
                            <span className="text-[10px] text-dark-400 truncate max-w-[80px]">
                              {session.roomName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">
                          {session.title || 'Untitled Session'}
                        </p>
                        {session.kpiName && (
                          <p className="text-[11px] text-success-400 flex items-center gap-1 mt-0.5 truncate font-mono">
                            <CheckIcon className="w-3 h-3 stroke-[2.5]" />
                            {session.kpiName}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Delete Session"
                        className="opacity-0 group-hover:opacity-100 p-1 text-dark-400 hover:text-danger-400 rounded transition-all cursor-pointer flex-shrink-0"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {sessions.length > 0 && (
            <div className="p-2.5 border-t border-dark-800 flex items-center justify-between text-[11px] text-dark-400">
              <span>{sessions.length} sessions stored</span>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="text-dark-400 hover:text-danger-400 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </aside>
      ) : (
        /* Collapsed History Rail */
        <aside className="w-12 flex-shrink-0 h-full self-stretch flex flex-col items-center py-3.5 rounded-2xl bg-dark-900 border border-dark-700/80 shadow-sm animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            title="Expand History"
            className="p-2 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <div className="mt-6 flex flex-col items-center gap-2.5 flex-1 select-none">
            <ClockIcon className="w-4 h-4 text-dark-400 flex-shrink-0" />
            <span
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              className="text-[10px] font-bold uppercase tracking-widest text-dark-400 py-1"
            >
              History
            </span>
            {sessions.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-dark-800 text-dark-300 border border-dark-700 font-mono">
                {sessions.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleStartNewSession}
            title="New Session"
            className="mt-auto p-2 text-brand hover:bg-dark-800 rounded-xl transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
          </button>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: WORKSPACE (Middle Column) */}
      {/* ========================================================================= */}
      <main className="flex-1 min-w-0 h-full self-stretch flex flex-col relative">
        {/* Mode switch: AI · Manual · Presets */}
        <div className="flex items-center justify-center pt-1 pb-2 flex-shrink-0 z-20">
          <div role="tablist" aria-label="How to create the KPI" className="flex items-center p-1 bg-dark-850 dark:bg-dark-900 border border-dark-700 rounded-full">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeMiddleTab === tab.value}
                title={tab.title}
                onClick={() => setActiveMiddleTab(tab.value)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeMiddleTab === tab.value
                    ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                    : 'text-dark-400 hover:text-foreground border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-dark-400 -mt-1 mb-2 flex-shrink-0">
          {TABS.find((t) => t.value === activeMiddleTab)?.title}
        </p>

        {/* Rate limit warning (AI only) */}
        {rateLimitError && activeMiddleTab === 'ai' && (
          <div className="mx-auto max-w-xl mb-2 px-4 py-2 bg-warning-500/10 border border-warning-500/20 rounded-xl flex items-center gap-2.5 text-xs text-warning-400 flex-shrink-0">
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{rateLimitError}</span>
          </div>
        )}

        {/* Success Banner if KPI created */}
        {lastCreatedKpi && (
          <div className="mx-auto w-full max-w-2xl mb-2 px-4 py-2 bg-success-500/10 border border-success-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-success-400 flex-shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <CheckIcon className="w-4 h-4 flex-shrink-0 stroke-[2.5]" />
              <span className="truncate">
                <strong>"{lastCreatedKpi}"</strong> is ready — enter its data on the Entries page.
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {onViewAllKpis && (
                <button
                  type="button"
                  onClick={onViewAllKpis}
                  className="flex items-center gap-1 font-semibold text-brand transition-colors cursor-pointer"
                >
                  <span>View in All KPIs</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setLastCreatedKpi(null)}
                aria-label="Dismiss"
                className="p-0.5 text-success-400/70 hover:text-success-400 cursor-pointer"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: AI Chat View */}
        {activeMiddleTab === 'ai' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              onAddKPI={handleAddKPIFromAi}
              isLoading={isLoading}
              isAddingKPI={isAddingKPI}
              selectedRoomId={selectedRoomId}
              onSelectRoomId={setSelectedRoomId}
              rooms={rooms}
              isSuggestionAdded={(s) => existingNames.has(normalizeName(s.name))}
              onCustomizeSuggestion={openInManual}
            />
          </div>
        )}

        {/* Tab 2: Manual Definition Form */}
        {activeMiddleTab === 'manual' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center px-2 sm:px-4 pb-4">
            <ManualKPIForm
              draft={draft}
              onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
              roomId={selectedRoomId}
              onRoomChange={setSelectedRoomId}
              dataFields={dataFields}
              onFieldCreated={(field) =>
                setDataFields((prev) => [...prev.filter((f) => f.id !== field.id), field])
              }
              existingNames={existingNames}
              formulaValid={formulaCheck.valid}
              submitAttempted={manualSubmitAttempted}
              isSubmitting={isSubmittingManual}
              onSubmit={handleManualSubmit}
              onReset={() => {
                setDraft(EMPTY_DRAFT)
                setManualSubmitAttempted(false)
              }}
            />
          </div>
        )}

        {/* Tab 3: Presets Explorer */}
        {activeMiddleTab === 'presets' && (
          <PresetLibrary
            presets={presets}
            isLoading={isLoadingPresets}
            loadError={presetsError}
            onRetry={loadPresets}
            dataFields={dataFields}
            roomId={selectedRoomId}
            onRoomChange={setSelectedRoomId}
            importingName={importingPresetName}
            onImport={handleImportSinglePreset}
            onCustomize={openInManual}
          />
        )}
      </main>

      {/* ========================================================================= */}
      {/* SECTION 3: CONTEXT PANEL (Right Column, Collapsible) */}
      {/* ========================================================================= */}
      {isStudioOpen ? (
        <aside className="w-80 flex-shrink-0 h-full self-stretch flex flex-col rounded-2xl bg-dark-900 border border-dark-700/80 overflow-hidden shadow-sm animate-in fade-in duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-dark-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bars3BottomLeftIcon className="w-4 h-4 text-dark-400 stroke-[2]" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                {SIDE_PANEL_TITLES[activeMiddleTab]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStudioOpen(false)}
              title="Collapse panel"
              className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <StudioSidePanel
              mode={activeMiddleTab}
              draft={draft}
              dataFields={dataFields}
              roomId={selectedRoomId}
              existingNames={existingNames}
              aiRemaining={rateLimitInfo}
            />
          </div>
        </aside>
      ) : (
        /* Collapsed Panel Rail */
        <aside className="w-12 flex-shrink-0 h-full self-stretch flex flex-col items-center py-3.5 rounded-2xl bg-dark-900 border border-dark-700/80 shadow-sm animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => setIsStudioOpen(true)}
            title="Expand panel"
            className="p-2 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <div className="mt-6 flex flex-col items-center gap-2.5 flex-1 select-none">
            <Bars3BottomLeftIcon className="w-4 h-4 text-dark-400 flex-shrink-0" />
            <span
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              className="text-[10px] font-bold uppercase tracking-widest text-dark-400 py-1"
            >
              {SIDE_PANEL_TITLES[activeMiddleTab]}
            </span>
          </div>
        </aside>
      )}
    </div>
  )
}
