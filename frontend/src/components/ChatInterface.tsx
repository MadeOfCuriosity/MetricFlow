import { useState, useRef, useEffect, useMemo } from 'react'
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { KPISuggestionCard } from './KPISuggestionCard'

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

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  onAddKPI: (suggestion: KPISuggestion, dataFieldMappings: Record<string, string>) => void
  isLoading: boolean
  isAddingKPI: boolean
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

export function ChatInterface({
  messages,
  onSendMessage,
  onAddKPI,
  isLoading,
  isAddingKPI,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      inputRef.current?.focus()
    }
  }, [isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    onSendMessage(input.trim())
    setInput('')
  }

  const examplePrompts = [
    { icon: '📈', label: 'Customer retention rate' },
    { icon: '💰', label: 'Sales conversion rate' },
    { icon: '⚡', label: 'Employee productivity' },
    { icon: '🛒', label: 'Average order value' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-primary-500/5 rounded-2xl flex items-center justify-center mb-6 animate-float">
              <SparklesIcon className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              What do you want to track?
            </h2>
            <p className="text-dark-300 mb-8 max-w-md">
              Describe a metric in plain English and I'll turn it into a KPI with
              the right formula and inputs.
            </p>
            <div className="w-full max-w-md">
              <p className="text-xs uppercase tracking-wider text-dark-400 mb-3">
                Quick starts
              </p>
              <div className="grid grid-cols-2 gap-2">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => onSendMessage(prompt.label)}
                    className="flex items-center gap-2 px-3 py-3 bg-dark-800 hover:bg-dark-700 hover:border-primary-500/40 border border-dark-600 rounded-xl text-sm text-dark-200 transition-all text-left"
                  >
                    <span className="text-base">{prompt.icon}</span>
                    <span className="truncate">{prompt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
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
                            className="px-3 py-1.5 text-sm rounded-full border border-primary-500/40 bg-primary-500/5 text-primary-300 hover:bg-primary-500/15 hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-dark-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to track..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 border border-primary-500 bg-transparent text-foreground rounded-xl hover:bg-primary-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-dark-400 mt-2 text-center">
          AI may make mistakes. Review suggested KPIs before adding.
        </p>
      </div>
    </div>
  )
}
