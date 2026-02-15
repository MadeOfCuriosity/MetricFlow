import api from './api'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AdminAgentResponse {
  ai_response: string
  error: string | null
  rate_limit_remaining: number | null
}

export async function sendAdminAgentMessage(
  userMessage: string,
  conversationHistory: ConversationMessage[]
): Promise<AdminAgentResponse> {
  const response = await api.post('/api/ai/admin-agent', {
    user_message: userMessage,
    conversation_history: conversationHistory,
  })
  return response.data
}
