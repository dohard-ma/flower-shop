import axios from 'axios'
// 禁用 follow-redirects 的调试输出
process.env.DEBUG = ''
process.env.REDIRECTS_DEBUG = 'false'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  max_tokens?: number
  stop?: string[]
  temperature?: number
  top_p?: number
  presence_penalty?: number
  frequency_penalty?: number
}

// 优化：创建axios实例并配置
const api = axios.create({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DOUBAO_API_KEY || '83deb95b-187f-4f78-832c-99ae6c022cf9'}`,
  },
})

export async function createChatCompletion(messages: ChatMessage[]) {
  const requestData: ChatCompletionRequest = {
    model: 'ep-20250209211851-f4tsr',
    messages,
    stream: false,
  }

  try {
    const response = await api.post('/chat/completions', requestData)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.status, error.response?.statusText)
      // 避免记录完整错误对象，这可能会导致更多日志
    }
    throw error
  }
}
