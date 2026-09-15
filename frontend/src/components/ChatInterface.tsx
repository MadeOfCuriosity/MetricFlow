import { useState, useRef, useEffect, useMemo } from 'react'
import {
  SparklesIcon,
  UserIcon,
  PlusIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { KPISuggestionCard } from './KPISuggestionCard'
import type { Room } from '../types/room'

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other'

export interface KPISuggestion {
  name: string
  description?: string
  category: string
  formula: string
  input_fields: string[]
  unit?: string
  direction?: 'up' | 'down'
  time_period?: TimePeriod
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestion?: KPISuggestion
  timestamp: Date
}

export interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  onAddKPI: (suggestion: KPISuggestion, dataFieldMappings: Record<string, string>) => void
  isLoading: boolean
  isAddingKPI: boolean
  selectedRoomId?: string
  onSelectRoomId?: (roomId: string) => void
  rooms?: Room[]
}

/**
 * Lightweight inline markdown rendering for **bold** and *italic*.
 * Safer than dangerouslySetInnerHTML — builds a React tree from plain text.
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    } else {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="text-sm leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary-400 font-medium flex-shrink-0">
                {numMatch[1]}.
              </span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          )
        }
        return <div key={i}>{renderInline(line)}</div>
      })}
    </div>
  )
}

/**
 * Detect common decision points in the assistant message and return chip options.
 * Only the most recent assistant message uses these — answering one replaces it.
 */
function detectQuickReplies(text: string): { label: string; value: string }[] {
  const lower = text.toLowerCase()

  // Time period / frequency
  const mentionsAllPeriods =
    lower.includes('daily') &&
    lower.includes('weekly') &&
    lower.includes('monthly')
  const asksAboutFrequency =
    /how often|time ?period|frequency|collect.*data|track.*(this|it)/.test(lower)
  if (mentionsAllPeriods || (asksAboutFrequency && /daily|weekly|monthly|quarterly/.test(lower))) {
    return [
      { label: 'Daily', value: 'daily' },
      { label: 'Weekly', value: 'weekly' },
      { label: 'Monthly', value: 'monthly' },
      { label: 'Quarterly', value: 'quarterly' },
    ]
  }

  // Category
  if (
    /category|sales|marketing|operations|finance/.test(lower) &&
    /sales/.test(lower) &&
    /marketing/.test(lower)
  ) {
    return [
      { label: 'Sales', value: 'Sales' },
      { label: 'Marketing', value: 'Marketing' },
      { label: 'Operations', value: 'Operations' },
      { label: 'Finance', value: 'Finance' },
      { label: 'Custom', value: 'Custom' },
    ]
  }

  // Yes / no prompts — e.g. "Would you like to create another KPI?", "Shall I..."
  if (
    /\?\s*$/.test(text.trim()) &&
    /(would you like|shall i|should i|do you want|want me to|ready to|looks good|sound good|another (kpi|one))/i.test(
      text
    )
  ) {
    return [
      { label: 'Yes', value: 'Yes' },
      { label: 'No', value: 'No' },
    ]
  }

  return []
}

const examplePrompts = [
  'Customer retention rate',
  'Sales conversion rate',
  'Average order value',
]

export function ChatInterface({
  messages,
  onSendMessage,
  onAddKPI,
  isLoading,
  isAddingKPI,
  selectedRoomId,
  onSelectRoomId,
  rooms = [],
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId)
  }, [rooms, selectedRoomId])

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus()
    }
  }, [isLoading])

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  // Click outside to close options popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isInputActive = messages.length > 0 || input.trim().length > 0

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-end w-full h-full relative overflow-hidden pb-1">
      {/* Messages area */}
      {messages.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar mb-2">
          {messages.map((message) => {
            const isLastAssistant =
              message.role === 'assistant' && message.id === lastAssistantId
            const quickReplies =
              isLastAssistant && !message.suggestion && !isLoading
                ? detectQuickReplies(message.content)
                : []

            return (
              <div
                key={message.id}
                className={`flex gap-3 animate-fade-in-up ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary-500/20 to-primary-500/5 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-primary-400" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    message.role === 'user' ? 'order-1' : ''
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'border border-primary-500 text-foreground'
                        : 'bg-dark-800 text-dark-200'
                    }`}
                  >
                    <MessageContent text={message.content} />
                  </div>

                  {/* Quick reply chips */}
                  {quickReplies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 animate-fade-in">
                      {quickReplies.map((chip) => (
                        <button
                          key={chip.value}
                          onClick={() => onSendMessage(chip.value)}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-sm rounded-full border border-primary-500/40 bg-primary-500/5 text-primary-300 hover:bg-primary-500/15 hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* KPI Suggestion Card */}
                  {message.suggestion && (
                    <div className="mt-3">
                      <KPISuggestionCard
                        suggestion={message.suggestion}
                        onAdd={(mappings) => onAddKPI(message.suggestion!, mappings)}
                        isAdding={isAddingKPI}
                      />
                    </div>
                  )}

                  <p
                    className={`text-xs text-dark-400 mt-1 ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center order-2">
                    <UserIcon className="w-4 h-4 text-dark-300" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary-500/20 to-primary-500/5 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-primary-400" />
              </div>
              <div className="bg-dark-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <div
                    className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Centered / Docked Input Card & Suggestion Pills */}
      <div
        className="w-full max-w-2xl mx-auto px-4 flex-shrink-0 z-10"
        style={{
          transform: isInputActive ? 'translateY(0)' : 'translateY(-27vh)',
          transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Floating Input Box Card */}
        <div className="rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl p-3.5 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you wanna track"
            disabled={isLoading}
            className="w-full bg-transparent resize-none outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:outline-none border-0 focus:border-0 shadow-none text-foreground placeholder-dark-400 text-sm py-1 px-1.5 font-normal leading-relaxed custom-scrollbar max-h-40"
          />

          <div className="flex items-center justify-between pt-2 px-0.5">
            {/* Left: + Button with Room Assignment Popover */}
            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                title="Options & Room Assignment"
                className="w-7 h-7 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              </button>

              {selectedRoom && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-[11px] font-medium animate-in fade-in">
                  <span className="truncate max-w-[120px]">{selectedRoom.name}</span>
                  <button
                    type="button"
                    onClick={() => onSelectRoomId?.('')}
                    className="hover:text-foreground cursor-pointer"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Popover Menu */}
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute bottom-full left-0 mb-2 w-64 rounded-xl bg-dark-900 border border-dark-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-dark-400 px-2 py-1">
                    Assign to Room
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRoomId?.('')
                        setIsMenuOpen(false)
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        !selectedRoomId
                          ? 'bg-dark-800 text-foreground font-semibold'
                          : 'text-dark-300 hover:bg-dark-800/60 hover:text-foreground'
                      }`}
                    >
                      <span>None (Global Org KPI)</span>
                      {!selectedRoomId && <CheckIcon className="w-3.5 h-3.5 text-primary-400" />}
                    </button>
                    {rooms && rooms.length > 0 ? (
                      rooms.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            onSelectRoomId?.(r.id)
                            setIsMenuOpen(false)
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            selectedRoomId === r.id
                              ? 'bg-dark-800 text-foreground font-semibold'
                              : 'text-dark-300 hover:bg-dark-800/60 hover:text-foreground'
                          }`}
                        >
                          <span className="truncate">{r.name}</span>
                          {selectedRoomId === r.id && (
                            <CheckIcon className="w-3.5 h-3.5 text-primary-400" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-[11px] text-dark-400">No rooms created yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Send Button > */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              title="Send message"
              className="w-8 h-8 rounded-xl bg-foreground text-dark-950 flex items-center justify-center hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer font-bold flex-shrink-0 shadow-sm"
            >
              <ChevronRightIcon className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Suggestion Pills (visible in empty state when not typing) */}
        {messages.length === 0 && (
          <div
            className={`transition-all duration-300 ease-out overflow-hidden ${
              isInputActive
                ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none mt-0'
                : 'max-h-20 opacity-100 translate-y-0 mt-3'
            }`}
          >
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  className="px-4 py-2 rounded-xl bg-dark-900/80 hover:bg-dark-850 border border-dark-800 text-xs text-dark-400 hover:text-foreground hover:border-dark-700 transition-all cursor-pointer shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
