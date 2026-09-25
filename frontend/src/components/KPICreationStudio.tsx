import { useState, useEffect, useMemo } from 'react'
import {
  BookmarkSquareIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  Bars3BottomLeftIcon,
} from '@heroicons/react/24/outline'
import { ChatInterface } from './ChatInterface'
import { useToast } from '../context/ToastContext'
import { useRoom } from '../context/RoomContext'
import api from '../services/api'
import { getApiError } from '../lib/apiError'
import type { TimePeriod } from '../types/kpi'


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

interface Preset {
  name: string
  description: string
  formula: string
  category: string
  time_period?: TimePeriod
}

export interface StudioHistoryItem {
  id: string
  title: string
  timestamp: string // ISO string
  type: 'ai' | 'manual' | 'presets'
  kpiName?: string
  roomName?: string
  messages?: Message[]
  manualDraft?: {
    name: string
    category: string
    formula: string
    time_period: TimePeriod
    unit: string
    direction: 'up' | 'down'
    description?: string
  }
}

const STORAGE_KEY = 'metricflow_kpi_studio_history_v1'

const PRESET_CATEGORIES = ['All', 'Sales', 'Marketing', 'Operations', 'Finance']

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
  const [activeMiddleTab, setActiveMiddleTab] = useState<'ai' | 'manual' | 'presets'>('ai')

  // Selected Room for Assignment
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')

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
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `session_${Date.now()}`)
  const [historySearchQuery, setHistorySearchQuery] = useState('')

  // Manual Form State
  const [manualName, setManualName] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualCategory, setManualCategory] = useState('Sales')
  const [manualFormula, setManualFormula] = useState('')
  const [manualPeriod, setManualPeriod] = useState<TimePeriod>('monthly')
  const [manualUnit, setManualUnit] = useState('%')
  const [manualDirection, setManualDirection] = useState<'up' | 'down'>('up')
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)

  // Presets State
  const [presets, setPresets] = useState<Preset[]>([])
  const [isLoadingPresets, setIsLoadingPresets] = useState(false)
  const [presetSearch, setPresetSearch] = useState('')
  const [selectedPresetCategory, setSelectedPresetCategory] = useState('All')
  const [importingPresetName, setImportingPresetName] = useState<string | null>(null)

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
          setRateLimitError(`Daily limit reached (${limit_per_day}/${limit_per_day} used). Resets at midnight UTC.`)
        }
      })
      .catch(() => {})
  }, [])

  // Load presets when switching to Presets tab
  useEffect(() => {
    if (activeMiddleTab === 'presets' && presets.length === 0) {
      setIsLoadingPresets(true)
      api
        .get('/api/kpis/available-presets')
        .then((res) => {
          setPresets(res.data?.available_presets || [])
        })
        .catch((err) => {
          console.error('Failed to load presets:', err)
          showError('Presets Error', 'Could not load preset library.')
        })
        .finally(() => {
          setIsLoadingPresets(false)
        })
    }
  }, [activeMiddleTab, presets.length, showError])

  // Record or update current session in History
  const updateCurrentSessionInHistory = (
    title: string,
    type: 'ai' | 'manual' | 'presets',
    customMessages?: Message[],
    kpiName?: string
  ) => {
    const roomName = rooms.find((r) => r.id === selectedRoomId)?.name
    setSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === currentSessionId)
      const newItem: StudioHistoryItem = {
        id: currentSessionId,
        title,
        timestamp: new Date().toISOString(),
        type,
        roomName,
        kpiName: kpiName || (existingIdx >= 0 ? prev[existingIdx].kpiName : undefined),
        messages: customMessages || messages,
      }
      const updated =
        existingIdx >= 0
          ? [newItem, ...prev.filter((s) => s.id !== currentSessionId)]
          : [newItem, ...prev.slice(0, 24)] // keep max 25 sessions

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }

  // Handle "+ New Session" click
  const handleStartNewSession = () => {
    const newId = `session_${Date.now()}`
    setCurrentSessionId(newId)
    setMessages([])
    setConversationHistory([])
    setLastCreatedKpi(null)
    setActiveMiddleTab('ai')
    setManualName('')
    setManualFormula('')
    setManualDescription('')
  }

  // Handle restoring a session from history
  const handleRestoreSession = (session: StudioHistoryItem) => {
    setCurrentSessionId(session.id)
    setActiveMiddleTab(session.type)
    if (session.messages && session.messages.length > 0) {
      const restored = session.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
      setMessages(restored)
      setConversationHistory(
        restored.map((m) => ({ role: m.role, content: m.content }))
      )
    }
    if (session.manualDraft) {
      setManualName(session.manualDraft.name)
      setManualCategory(session.manualDraft.category)
      setManualFormula(session.manualDraft.formula)
      setManualPeriod(session.manualDraft.time_period)
      setManualUnit(session.manualDraft.unit)
      setManualDirection(session.manualDraft.direction)
      setManualDescription(session.manualDraft.description || '')
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
      updateCurrentSessionInHistory(content, 'ai', nextMessages)
    }

    try {
      const response = await api.post('/api/ai/kpi-builder', {
        user_message: content,
        conversation_history: newHistory,
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
          content: "I couldn't generate a response right now. Please try again.",
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

      // Update session in history
      const sessionTitle = suggested_kpi?.name || content
      updateCurrentSessionInHistory(sessionTitle, 'ai', updatedMessages)
    } catch (err: any) {
      console.error('AI request error:', err)
      if (err.response?.status === 429) {
        setRateLimitError('Rate limit reached for today. Resets at midnight UTC.')
        if (rateLimitInfo) setRateLimitInfo({ ...rateLimitInfo, remaining: 0 })
      } else {
        showError('AI Error', 'Failed to reach AI service.')
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
        data_field_mappings:
          Object.keys(dataFieldMappings).length > 0 ? dataFieldMappings : undefined,
        room_id: selectedRoomId || undefined,
      })

      const assignedRoomObj = rooms.find((r) => r.id === selectedRoomId)
      const targetLocation = assignedRoomObj ? ` and assigned to ${assignedRoomObj.name}` : ''
      success('KPI Created', `"${suggestion.name}" has been created${targetLocation}`)
      setLastCreatedKpi(suggestion.name)
      onKpiCreated?.(suggestion.name)

      // Add confirmation bubble
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great! "${suggestion.name}" has been created${targetLocation}. You can view it in the All KPIs directory or track it in entries. Would you like to build another KPI?`,
        timestamp: new Date(),
      }
      const withConfirm = [...messages, confirmMessage]
      setMessages(withConfirm)

      // Update session in history
      updateCurrentSessionInHistory(suggestion.name, 'ai', withConfirm, suggestion.name)
    } catch (err: any) {
      console.error('Failed to create KPI:', err)
      if (err.response?.data?.detail?.includes('already exists')) {
        showError('KPI Exists', 'A KPI with this name already exists')
      } else {
        showError('Failed to Create', getApiError(err, 'Could not create the KPI.'))
      }
    } finally {
      setIsAddingKPI(false)
    }
  }

  // Manual Form Submit Handler
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName.trim()) {
      showError('Validation Error', 'KPI Name is required')
      return
    }
    if (!manualFormula.trim()) {
      showError('Validation Error', 'KPI Formula is required')
      return
    }

    setIsSubmittingManual(true)
    try {
      await api.post('/api/kpis', {
        name: manualName.trim(),
        description: manualDescription.trim() || undefined,
        category: manualCategory,
        formula: manualFormula.trim(),
        time_period: manualPeriod,
        unit: manualUnit.trim() || undefined,
        direction: manualDirection,
        room_id: selectedRoomId || undefined,
      })

      const assignedRoomObj = rooms.find((r) => r.id === selectedRoomId)
      const targetLocation = assignedRoomObj ? ` and assigned to ${assignedRoomObj.name}` : ''
      success('KPI Created', `"${manualName}" created successfully${targetLocation}`)
      setLastCreatedKpi(manualName)
      onKpiCreated?.(manualName)

      // Add to history
      updateCurrentSessionInHistory(manualName, 'manual', undefined, manualName)

      // Reset form
      setManualName('')
      setManualFormula('')
      setManualDescription('')
    } catch (err: any) {
      console.error('Failed to create manual KPI:', err)
      if (err.response?.data?.detail?.includes('already exists')) {
        showError('KPI Exists', 'A KPI with this name already exists')
      } else {
        showError('Failed to Create', getApiError(err, 'Could not create the KPI.'))
      }
    } finally {
      setIsSubmittingManual(false)
    }
  }

  // Presets 1-Click Import Handler
  const handleImportSinglePreset = async (preset: Preset) => {
    setImportingPresetName(preset.name)
    try {
      await api.post('/api/kpis/seed-presets', {
        preset_names: [preset.name],
      })
      success('Preset Added', `"${preset.name}" imported successfully`)
      setLastCreatedKpi(preset.name)
      onKpiCreated?.(preset.name)

      // Add to history
      updateCurrentSessionInHistory(preset.name, 'presets', undefined, preset.name)
    } catch (err: any) {
      console.error('Failed to import preset:', err)
      showError('Import Error', 'Could not import preset. It may already exist.')
    } finally {
      setImportingPresetName(null)
    }
  }

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesCategory =
        selectedPresetCategory === 'All' || p.category === selectedPresetCategory
      const matchesSearch =
        !presetSearch.trim() ||
        p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.formula.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(presetSearch.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [presets, selectedPresetCategory, presetSearch])


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
      {/* SECTION 2: CHAT & WORKSPACE (Middle Column) */}
      {/* ========================================================================= */}
      <main className="flex-1 min-w-0 h-full self-stretch flex flex-col relative">
        {/* Floating Top Pill: 3 Tabs [AI, Manual, Presets] */}
        <div className="flex items-center justify-center pt-1 pb-2 flex-shrink-0 z-20">
          <div className="flex items-center p-1 bg-dark-850 dark:bg-dark-900 border border-dark-700 rounded-full">
            <button
              type="button"
              onClick={() => setActiveMiddleTab('ai')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeMiddleTab === 'ai'
                  ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                  : 'text-dark-400 hover:text-foreground border border-transparent'
              }`}
            >
              <span>AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMiddleTab('manual')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeMiddleTab === 'manual'
                  ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                  : 'text-dark-400 hover:text-foreground border border-transparent'
              }`}
            >
              <span>Manual</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMiddleTab('presets')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeMiddleTab === 'presets'
                  ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                  : 'text-dark-400 hover:text-foreground border border-transparent'
              }`}
            >
              <span>Presets</span>
            </button>
          </div>
        </div>

        {/* Rate limit warning if applicable */}
        {rateLimitError && (
          <div className="mx-auto max-w-xl mb-2 px-4 py-2 bg-warning-500/10 border border-warning-500/20 rounded-xl flex items-center gap-2.5 text-xs text-warning-400 flex-shrink-0">
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{rateLimitError}</span>
          </div>
        )}

        {/* Success Banner if KPI created */}
        {lastCreatedKpi && (
          <div className="mx-auto max-w-xl mb-2 px-4 py-2 bg-success-500/10 border border-success-500/20 rounded-xl flex items-center justify-between text-xs text-success-400 flex-shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
              <span>
                <strong>"{lastCreatedKpi}"</strong> created successfully!
              </span>
            </div>
            {onViewAllKpis && (
              <button
                type="button"
                onClick={onViewAllKpis}
                className="flex items-center gap-1 font-semibold text-brand hover:text-brand transition-colors cursor-pointer"
              >
                <span>View in All KPIs</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}
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
            />
          </div>
        )}

        {/* Tab 2: Manual Definition Form */}
        {activeMiddleTab === 'manual' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center p-2 sm:p-4">
            <div className="w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Manual KPI Definition</h2>
                <p className="text-xs text-dark-300 mt-0.5">
                  Define exact mathematical formulas, aggregation intervals, and measurement units.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                    KPI Name <span className="text-brand">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Net Profit Margin"
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                  />
                </div>

                {/* Category & Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Category
                    </label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
                    >
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                      <option value="Finance">Finance</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Aggregation Period
                    </label>
                    <select
                      value={manualPeriod}
                      onChange={(e) => setManualPeriod(e.target.value as TimePeriod)}
                      className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Formula */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-dark-300">
                      Formula Expression <span className="text-brand">*</span>
                    </label>
                    <span className="text-[11px] text-dark-400">
                      e.g. (revenue - expenses) / revenue * 100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={manualFormula}
                    onChange={(e) => setManualFormula(e.target.value)}
                    placeholder="(metric_a - metric_b) / metric_a"
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm font-mono text-brand placeholder-dark-500 focus:outline-none focus:border-dark-500 transition-colors"
                  />
                  <p className="text-[11px] text-dark-400 mt-1">
                    Use standard operators (+, -, *, /). Variable names will automatically map to your data fields.
                  </p>
                </div>

                {/* Unit & Direction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Display Unit
                    </label>
                    <input
                      type="text"
                      value={manualUnit}
                      onChange={(e) => setManualUnit(e.target.value)}
                      placeholder="%, $, pts, hrs"
                      className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Target Direction
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setManualDirection('up')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          manualDirection === 'up'
                            ? 'bg-success-500/20 border-success-500/40 text-success-300'
                            : 'bg-dark-950 border-dark-700 text-dark-400 hover:text-foreground'
                        }`}
                      >
                        <span>Higher (↑)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualDirection('down')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          manualDirection === 'down'
                            ? 'bg-warning-500/20 border-warning-500/40 text-warning-300'
                            : 'bg-dark-950 border-dark-700 text-dark-400 hover:text-foreground'
                        }`}
                      >
                        <span>Lower (↓)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                    Description & Context (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder="Describe how this metric impacts performance..."
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingManual || !manualName.trim() || !manualFormula.trim()}
                    className="px-6 py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    {isSubmittingManual && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    <span>Create Metric</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Presets Explorer */}
        {activeMiddleTab === 'presets' && (
          <div className="flex-1 overflow-hidden flex flex-col p-4">
            {/* Presets Toolbar: Search & Category Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 flex-shrink-0">
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="Search 30+ industry presets..."
                  className="w-full pl-8 pr-3 py-1.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-dark-850 dark:bg-dark-950 border border-dark-700 rounded-xl overflow-x-auto">
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedPresetCategory(cat)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      selectedPresetCategory === cat
                        ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                        : 'text-dark-400 hover:text-foreground border border-transparent'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {isLoadingPresets ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ArrowPathIcon className="w-6 h-6 text-dark-400 animate-spin mb-2" />
                  <p className="text-xs text-dark-300">Loading preset formula library...</p>
                </div>
              ) : filteredPresets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <BookmarkSquareIcon className="w-8 h-8 text-dark-500 mb-2 opacity-50 stroke-[1.5]" />
                  <p className="text-xs font-medium text-dark-300">No matching presets found</p>
                  <p className="text-[11px] text-dark-400 mt-1">
                    Try another search keyword or switch categories.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPresets.map((preset) => {
                    const isImporting = importingPresetName === preset.name
                    return (
                      <div
                        key={preset.name}
                        className="p-4 rounded-xl border border-dark-700/80 bg-dark-950/60 hover:bg-dark-800/40 hover:border-dark-600 transition-all flex flex-col justify-between gap-3 group shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h4 className="text-sm font-semibold text-foreground tracking-tight truncate">
                              {preset.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-dark-800 border border-dark-700 text-dark-300 flex-shrink-0">
                              {preset.category}
                            </span>
                          </div>
                          <p className="text-xs text-dark-300 line-clamp-2 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-dark-800/80 flex items-center justify-between gap-2">
                          <code className="text-[11px] font-mono text-brand/90 bg-dark-900/80 px-2 py-1 rounded border border-dark-800 truncate flex-1">
                            {preset.formula}
                          </code>
                          <button
                            type="button"
                            disabled={isImporting}
                            onClick={() => handleImportSinglePreset(preset)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 text-white font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex-shrink-0 shadow-sm"
                          >
                            {isImporting ? (
                              <ArrowPathIcon className="w-3 h-3 animate-spin" />
                            ) : (
                              <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                            )}
                            <span>Import</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* SECTION 3: STUDIO / ASSIGNED SPACE (Right Column, Collapsible) */}
      {/* ========================================================================= */}
      {isStudioOpen ? (
        <aside className="w-80 flex-shrink-0 h-full self-stretch flex flex-col rounded-2xl bg-dark-900 border border-dark-700/80 overflow-hidden shadow-sm animate-in fade-in duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-dark-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bars3BottomLeftIcon className="w-4 h-4 text-dark-400 stroke-[2]" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Studio
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-dark-300 border border-dark-700 font-medium">
                Assigned Space
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStudioOpen(false)}
              title="Collapse Studio"
              className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Clean Open Assigned Space matching mockup */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-dark-400">
            <div className="w-12 h-12 rounded-2xl bg-dark-950 border border-dark-800 flex items-center justify-center mb-3">
              <AdjustmentsHorizontalIcon className="w-6 h-6 text-dark-500 stroke-[1.5]" />
            </div>
            <p className="text-xs font-semibold text-dark-300">Studio Space Allocated</p>
            <p className="text-[11px] text-dark-400 mt-1 max-w-[200px] leading-relaxed">
              Advanced formula sandbox, alert bands & live data feeds will be built here.
            </p>
          </div>
        </aside>
      ) : (
        /* Collapsed Studio Rail */
        <aside className="w-12 flex-shrink-0 h-full self-stretch flex flex-col items-center py-3.5 rounded-2xl bg-dark-900 border border-dark-700/80 shadow-sm animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => setIsStudioOpen(true)}
            title="Expand Studio"
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
              Studio
            </span>
          </div>
        </aside>
      )}
    </div>
  )
}
