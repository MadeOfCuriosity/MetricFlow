import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { ChatInterface } from '../components/ChatInterface'
import { useToast } from '../context/ToastContext'
import { useRoom } from '../context/RoomContext'
import api from '../services/api'
import { roomsApi } from '../services/rooms'

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other'

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

export interface AIBuilderProps {
  embedded?: boolean
  roomId?: string
  onKpiCreated?: (kpiName: string) => void
  onViewAllKpis?: () => void
}

export function AIBuilder({
  embedded = false,
  roomId: propRoomId,
  onKpiCreated,
  onViewAllKpis,
}: AIBuilderProps = {}) {
  const navigate = useNavigate()
  const params = useParams<{ roomId: string }>()
  const routeRoomId = params.roomId
  const [selectedRoomId, setSelectedRoomId] = useState<string>(propRoomId || routeRoomId || '')
  const effectiveRoomId = propRoomId || routeRoomId || selectedRoomId

  const { success, error: showError } = useToast()
  const { rooms } = useRoom()

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingKPI, setIsAddingKPI] = useState(false)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; limit: number } | null>(null)
  const [roomName, setRoomName] = useState<string>('')
  const [lastCreatedKpi, setLastCreatedKpi] = useState<string | null>(null)

  useEffect(() => {
    if (effectiveRoomId) {
      roomsApi
        .getRoom(effectiveRoomId)
        .then((room) => {
          setRoomName(room.name)
        })
        .catch(() => {
          setRoomName('')
        })
    } else {
      setRoomName('')
    }
  }, [effectiveRoomId])

  // Proactively check rate limit on mount
  useEffect(() => {
    api.get('/api/ai/rate-limit').then((res) => {
      const { remaining_calls, limit_per_day, allowed } = res.data
      setRateLimitInfo({ remaining: remaining_calls, limit: limit_per_day })
      if (!allowed) {
        setRateLimitError(`Daily limit reached (${limit_per_day}/${limit_per_day} used). Resets at midnight UTC.`)
      }
    }).catch(() => {
      // Silently fail - rate limit will be enforced server-side
    })
  }, [])

  const sendMessage = async (content: string) => {
    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Update conversation history
    const newHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content },
    ]
    setConversationHistory(newHistory)

    setIsLoading(true)
    setRateLimitError(null)

    try {
      const response = await api.post('/api/ai/kpi-builder', {
        user_message: content,
        conversation_history: newHistory,
      })

      const { ai_response: aiResponse, suggested_kpi, rate_limit_remaining, error: aiError } = response.data

      // Update rate limit info from response
      if (rateLimitInfo && typeof rate_limit_remaining === 'number') {
        setRateLimitInfo({ ...rateLimitInfo, remaining: rate_limit_remaining })
      }

      // If upstream failed (empty response or error field), surface it instead of a blank bubble
      if (!aiResponse || aiError) {
        showError('AI Error', aiError || 'The AI service returned an empty response. Please try again.')
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I couldn't generate a response right now. Please try again in a moment.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
        return
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        suggestion: suggested_kpi || undefined,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: 'assistant', content: aiResponse },
      ])
    } catch (err: any) {
      console.error('AI request failed:', err)

      if (err.response?.status === 429) {
        const detail = err.response.data?.detail
        if (Array.isArray(detail)) {
          setRateLimitError(detail.map((e: any) => e.msg).join(', '))
        } else if (typeof detail === 'string') {
          setRateLimitError(detail)
        } else {
          setRateLimitError('Rate limit exceeded. Please try again later.')
        }
        if (rateLimitInfo) {
          setRateLimitInfo({ ...rateLimitInfo, remaining: 0 })
        }
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "I've reached my daily limit for AI-powered suggestions. You can still create KPIs manually from the KPIs page, or try again tomorrow.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } else {
        showError('AI Error', 'Failed to get AI response. Please try again.')
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddKPI = async (suggestion: KPISuggestion, dataFieldMappings: Record<string, string>) => {
    setIsAddingKPI(true)
    setLastCreatedKpi(null)
    try {
      await api.post('/api/kpis', {
        name: suggestion.name,
        description: suggestion.description,
        category: suggestion.category,
        formula: suggestion.formula,
        time_period: suggestion.time_period || 'daily',
        data_field_mappings: Object.keys(dataFieldMappings).length > 0 ? dataFieldMappings : undefined,
        room_id: effectiveRoomId || undefined,
      })

      const targetRoom = roomName || rooms.find((r) => r.id === effectiveRoomId)?.name
      const locationText = targetRoom ? ` and assigned to ${targetRoom}` : ''
      success('KPI Created', `"${suggestion.name}" has been created${locationText}`)
      setLastCreatedKpi(suggestion.name)
      onKpiCreated?.(suggestion.name)

      // Add confirmation message
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great! I've added "${suggestion.name}"${locationText}. You can now start tracking this metric or view it in All KPIs. Would you like to create another KPI?`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, confirmMessage])
    } catch (err: any) {
      console.error('Failed to create KPI:', err)

      if (err.response?.data?.detail?.includes('already exists')) {
        showError('KPI Exists', 'A KPI with this name already exists')
      } else {
        showError('Failed to Create', err.response?.data?.detail || 'Could not create the KPI. Please try again.')
      }
    } finally {
      setIsAddingKPI(false)
    }
  }

  return (
    <div className={embedded ? 'space-y-3' : 'h-[calc(100vh-8rem)] flex flex-col'}>
      {/* Header */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-semibold text-foreground">AI KPI Creation</span>
            <span className="text-xs text-dark-400">— Natural language formula builder</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {rooms.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-dark-400">Assign to Room:</span>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="px-2.5 py-1.5 bg-dark-900 border border-dark-700 rounded-lg text-foreground text-xs focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
                >
                  <option value="">None (Global Organization KPI)</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {rateLimitInfo && (
              <span className="text-xs text-dark-400 bg-dark-900 border border-dark-700/80 px-2.5 py-1 rounded-lg">
                {rateLimitInfo.remaining}/{rateLimitInfo.limit} calls left today
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(effectiveRoomId ? `/rooms/${effectiveRoomId}` : '/rooms')}
              className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI KPI Builder</h1>
              <p className="text-sm text-dark-300">
                Create KPIs for {roomName || 'this room'}
              </p>
            </div>
          </div>
          {rateLimitInfo && (
            <p className="text-xs text-dark-400">
              {rateLimitInfo.remaining}/{rateLimitInfo.limit} AI calls remaining today
            </p>
          )}
        </div>
      )}

      {/* Rate limit warning */}
      {rateLimitError && (
        <div className="flex items-center gap-3 p-4 bg-warning-500/10 border border-warning-500/20 rounded-2xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-warning-400 flex-shrink-0" />
          <p className="text-sm text-warning-400">{rateLimitError}</p>
        </div>
      )}

      {/* KPI created action banner */}
      {lastCreatedKpi && (
        <div className="flex items-center justify-between p-3.5 bg-success-500/10 border border-success-500/20 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-success-400" />
            <p className="text-sm text-success-400 font-medium">
              "{lastCreatedKpi}" created successfully
            </p>
          </div>
          <div className="flex items-center gap-3">
            {embedded && onViewAllKpis && (
              <button
                type="button"
                onClick={onViewAllKpis}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
              >
                <span>View in All KPIs</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {effectiveRoomId && (
              <Link
                to={`/rooms/${effectiveRoomId}`}
                className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                View Room
              </Link>
            )}
            <Link
              to="/entries"
              className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              Enter Data
            </Link>
          </div>
        </div>
      )}

      {/* Chat interface */}
      <div
        className={`bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-sm flex flex-col ${
          embedded ? 'h-[560px]' : 'flex-1'
        }`}
      >
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage}
          onAddKPI={handleAddKPI}
          isLoading={isLoading}
          isAddingKPI={isAddingKPI}
        />
      </div>
    </div>
  )
}
