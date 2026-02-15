import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ChatInterface } from '../components/ChatInterface'
import { useToast } from '../context/ToastContext'
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

export function AIBuilder() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const { success, error: showError } = useToast()

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingKPI, setIsAddingKPI] = useState(false)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string>('')

  useEffect(() => {
    if (roomId) {
      roomsApi.getRoom(roomId).then((room) => {
        setRoomName(room.name)
      }).catch(() => {
        setRoomName('Unknown Room')
      })
    }
  }, [roomId])

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

      const { ai_response: aiResponse, suggested_kpi } = response.data

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
    try {
      await api.post('/api/kpis', {
        name: suggestion.name,
        description: suggestion.description,
        category: suggestion.category,
        formula: suggestion.formula,
        time_period: suggestion.time_period || 'daily',
        data_field_mappings: Object.keys(dataFieldMappings).length > 0 ? dataFieldMappings : undefined,
        room_id: roomId,
      })

      success('KPI Created', `"${suggestion.name}" has been created and assigned to ${roomName}`)

      // Add confirmation message
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great! I've added "${suggestion.name}" to ${roomName}. You can now start tracking this metric from the Data Entry page. Would you like to create another KPI?`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, confirmMessage])
    } catch (err: any) {
      console.error('Failed to create KPI:', err)

      if (err.response?.data?.detail?.includes('already exists')) {
        showError('KPI Exists', 'A KPI with this name already exists')
      } else {
        showError('Failed to Create', 'Could not create the KPI. Please try again.')
      }
    } finally {
      setIsAddingKPI(false)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate(`/rooms/${roomId}`)}
          className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
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

      {/* Rate limit warning */}
      {rateLimitError && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-warning-500/10 border border-warning-500/20 rounded-xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-warning-400 flex-shrink-0" />
          <p className="text-sm text-warning-400">{rateLimitError}</p>
        </div>
      )}

      {/* Chat interface */}
      <div className="flex-1 bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
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
