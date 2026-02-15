import { useState, useRef, useEffect } from 'react'
import { Transition } from '@headlessui/react'
import {
  XMarkIcon,
  PaperAirplaneIcon,
  UserIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { sendAdminAgentMessage } from '../services/adminAI'

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="9" width="14" height="11" rx="2" />
      <circle cx="9" cy="14" r="1.5" />
      <circle cx="15" cy="14" r="1.5" />
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="12" y1="4" x2="12" y2="9" />
      <circle cx="12" cy="3" r="1" />
      <line x1="3" y1="13" x2="5" y2="13" />
      <line x1="19" y1="13" x2="21" y2="13" />
    </svg>
  )
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export function AdminAIAgent() {
  const { isAdmin } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && !isLoading) {
      inputRef.current?.focus()
    }
  }, [isOpen, isLoading])

  if (!isAdmin) return null

  const handleClose = () => {
    setIsOpen(false)
    setMessages([])
    setConversationHistory([])
    setInput('')
    setRateLimitError(null)
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    const newHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content },
    ]
    setConversationHistory(newHistory)
    setInput('')
    setIsLoading(true)
    setRateLimitError(null)

    try {
      const response = await sendAdminAgentMessage(content, newHistory)

      if (response.error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.ai_response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setConversationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: response.ai_response },
        ])
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        const detail = err.response.data?.detail
        if (typeof detail === 'string') {
          setRateLimitError(detail)
        } else {
          setRateLimitError('Rate limit exceeded. Please try again later.')
        }
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "I've reached the daily limit for AI-powered responses. Please try again tomorrow.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(input.trim())
  }

  const examplePrompts = [
    'What are my top performing KPIs?',
    'Show me recent insights',
    'Which KPIs need attention?',
    'Summarize today\'s data entries',
  ]

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-12 px-5 bg-primary-500 hover:bg-primary-600 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 animate-float hover:[animation-play-state:paused]"
        >
          <span className="text-sm font-medium text-white">Ask</span>
          <img src="/visualise.png" alt="" className="w-5 h-5" />
          <span className="text-sm font-bold text-white">Visualize</span>
        </button>
      )}

      {/* Chat panel */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-300"
        enterFrom="opacity-0 translate-y-4 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-200"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-4 scale-95"
      >
        <div className="fixed bottom-6 right-6 z-40 w-[400px] h-[600px] max-h-[calc(100vh-3rem)] bg-dark-900 border border-dark-700 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center">
                <RobotIcon className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
                <p className="text-xs text-dark-400">Ask about your org data</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Rate limit warning */}
          {rateLimitError && (
            <div className="mx-3 mt-3 flex items-center gap-2 p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg">
              <ExclamationTriangleIcon className="w-4 h-4 text-warning-400 flex-shrink-0" />
              <p className="text-xs text-warning-400">{rateLimitError}</p>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-2">
                <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <RobotIcon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Admin AI Assistant
                </h3>
                <p className="text-xs text-dark-300 mb-6">
                  Ask anything about your KPIs, data, insights, or team performance.
                </p>
                <div className="space-y-2 w-full">
                  {examplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left px-3 py-2.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-xs text-dark-200 transition-colors"
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
                    className={`flex gap-2 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-6 h-6 bg-primary-500/10 rounded-md flex items-center justify-center mt-0.5">
                        <RobotIcon className="w-3 h-3 text-primary-400" />
                      </div>
                    )}

                    <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
                      <div
                        className={`rounded-xl px-3 py-2 ${
                          message.role === 'user'
                            ? 'border border-primary-500 text-foreground'
                            : 'bg-dark-800 text-dark-200'
                        }`}
                      >
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      <p
                        className={`text-[10px] text-dark-400 mt-0.5 ${
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
                      <div className="flex-shrink-0 w-6 h-6 bg-dark-600 rounded-md flex items-center justify-center order-2 mt-0.5">
                        <UserIcon className="w-3 h-3 text-dark-300" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-500/10 rounded-md flex items-center justify-center">
                      <RobotIcon className="w-3 h-3 text-primary-400" />
                    </div>
                    <div className="bg-dark-800 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" />
                        <div
                          className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"
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
          <div className="border-t border-dark-700 p-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your data..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-xs text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </Transition>
    </>
  )
}
