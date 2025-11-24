import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

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
    Authorization: `Bearer ${process.env.DOUBAO_API_KEY}`,
  },
})

export async function createChatCompletion(type: 'text' | 'image', messages: any[]) {
  const requestData: ChatCompletionRequest = {
    model: type === 'text' ? 'doubao-1-5-pro-32k-250115' : 'doubao-seed-1-6-vision-250815',
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

/**
 * 语音转文本
 * @param audioUrl 音频文件URL
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  // 火山引擎语音转文本API
  const speechApi = axios.create({
    baseURL: 'https://openspeech.bytedance.com/api/v3',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const requestId = uuidv4()

  // 从环境变量获取配置
  const appKey = process.env.VOLC_APP_KEY || process.env.DOUBAO_API_KEY || ''
  const accessKey = process.env.VOLC_ACCESS_KEY || process.env.DOUBAO_API_KEY || ''

  // 设置请求头
  const headers = {
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': 'volc.bigasr.auc',
    'X-Api-Request-Id': requestId,
    'X-Api-Sequence': '-1',
  }

  // 构建请求体（根据文档格式）
  const requestBody = {
    user: {
      uid: 'flower-shop-admin' // 用户标识，建议采用IMEI或MAC
    },
    audio: {
      url: audioUrl,
      format: 'mp3', // 音频容器格式：raw/wav/mp3/ogg（必填）
      language: '', // 语言，空字符串表示支持多语言
    },
    request: {
      model_name: 'bigmodel', // 模型名称（必填）
      model_version: '400', // 使用400模型版本，效果更好
      enable_itn: true, // 启用文本规范化
      enable_punc: true, // 启用标点
    }
  }

  try {
    // 提交任务
    const submitResponse = await speechApi.post('/auc/bigmodel/submit', requestBody, { headers })

    // 检查HTTP状态码
    if (submitResponse.status !== 200) {
      throw new Error(`HTTP请求失败: ${submitResponse.status}`)
    }

    // 检查响应头中的状态码（火山引擎API通过响应头返回状态）
    const statusCode = submitResponse.headers['x-api-status-code'] ||
      submitResponse.headers['X-Api-Status-Code']
    const message = submitResponse.headers['x-api-message'] ||
      submitResponse.headers['X-Api-Message']

    // 20000000 表示提交成功
    if (statusCode !== undefined && statusCode !== '20000000') {
      const errorMsg = message || '未知错误'
      throw new Error(`提交语音转文本任务失败: ${errorMsg} (status-code: ${statusCode})`)
    }

    // 如果响应头中没有状态码，检查响应体
    if (submitResponse.data && Object.keys(submitResponse.data).length > 0) {
      if (submitResponse.data.code !== undefined && submitResponse.data.code !== 0) {
        const errorMsg = submitResponse.data.message || submitResponse.data.msg || '未知错误'
        throw new Error(`提交语音转文本任务失败: ${errorMsg} (code: ${submitResponse.data.code})`)
      }

      if (submitResponse.data.error) {
        throw new Error(`提交语音转文本任务失败: ${submitResponse.data.error}`)
      }
    }

    // 轮询查询结果（最多等待30秒）
    const maxWaitTime = 30000 // 30秒
    const pollInterval = 2000 // 每2秒查询一次
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      try {
        // 查询任务状态（和提交任务时使用相同的请求ID）
        const queryHeaders = {
          ...headers,
          'X-Api-Request-Id': requestId
        }

        // 查询接口：POST方法，body为空，task_id通过Header中的X-Api-Request-Id传递
        // 根据文档：查询时需使用提交成功的任务Id作为X-Api-Request-Id
        const queryResponse = await speechApi.post('/auc/bigmodel/query', {}, {
          headers: queryHeaders
        })

        // 检查HTTP状态码
        if (queryResponse.status !== 200) {
          console.warn(`查询接口HTTP状态码异常: ${queryResponse.status}`)
          continue
        }

        // 检查响应头中的状态码（火山引擎API通过响应头返回状态）
        const queryStatusCode = queryResponse.headers['x-api-status-code'] ||
          queryResponse.headers['X-Api-Status-Code']
        const queryMessage = queryResponse.headers['x-api-message'] ||
          queryResponse.headers['X-Api-Message']

        // 根据文档，状态码含义：
        // 20000000 - 成功
        // 20000001 - 正在处理中
        // 20000002 - 任务在队列中
        // 其他 - 错误

        if (queryStatusCode === '20000000') {
          // 成功，提取文本
          // 根据文档，响应格式为：{ result: { text: "...", utterances: [...] }, audio_info: {...} }
          if (queryResponse.data?.result?.text) {
            const text = queryResponse.data.result.text
            if (text && text.trim().length > 0) {
              console.log('提取到文本:', text)
              return text.trim()
            }
          }
        } else if (queryStatusCode === '20000001' || queryStatusCode === '20000002') {
          // 正在处理中或队列中，继续轮询
          // console.log(`任务状态: ${queryStatusCode === '20000001' ? '正在处理中' : '任务在队列中'}，继续轮询...`)
          continue
        } else if (queryStatusCode !== undefined) {
          // 其他错误码
          const errorMsg = queryMessage || '查询任务失败'
          throw new Error(`查询任务失败: ${errorMsg} (status-code: ${queryStatusCode})`)
        }

        // 如果响应头中没有状态码，尝试从响应体判断
        if (queryResponse.data?.result?.text) {
          const text = queryResponse.data.result.text
          if (text && text.trim().length > 0) {
            console.log('从响应体提取到文本:', text)
            return text.trim()
          }
        }
      } catch (queryError: any) {
        // 如果是明确的任务失败错误，直接抛出
        if (queryError.message && queryError.message.includes('语音转文本失败')) {
          throw queryError
        }
        // 其他查询错误不影响继续轮询
        console.warn('查询任务状态失败，继续轮询:', queryError.message || queryError)
      }
    }

    throw new Error('语音转文本超时，请稍后重试')

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('语音转文本API Error:', error.response?.status, error.response?.statusText, error.response?.data)
      throw new Error(`语音转文本失败: ${error.response?.data?.message || error.message}`)
    }
    throw error
  }
}
