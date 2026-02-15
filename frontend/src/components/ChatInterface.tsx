import { useState, useRef, useEffect } from 'react'
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    'Track customer retention rate',
    'Measure sales conversion',
    'Monitor employee productivity',
    'Calculate average order value',
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-6">
              <SparklesIcon className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              AI KPI Builder
            </h2>
            <p className="text-dark-300 mb-8 max-w-md">
              Describe what you want to track and I'll help you create the perfect KPI
              with the right formula and inputs.
            </p>
            <div className="space-y-2 w-full max-w-md">
              <p className="text-xs text-dark-400 mb-2">Try one of these:</p>
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className="w-full text-left px-4 py-3 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-200 transition-colors"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center">
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

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
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-primary-400" />
                </div>
                <div className="bg-dark-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
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
