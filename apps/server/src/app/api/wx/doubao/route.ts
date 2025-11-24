import { NextRequest, NextResponse } from 'next/server'
import { createChatCompletion } from './chat'
import { z } from 'zod'
import { Logger } from '@/utils/logger'
import { ApiResponseBuilder } from '@/lib/api-response'
import { SYSTEM_PROMPT, userPrompt } from '@/lib/prompt'
import dayjs from 'dayjs'

const runWorkflowSchema = z.object({
  text: z.string().min(1, '文本不能为空'),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const traceId = request.headers.get('X-Trace-ID')!

  try {
    const body = await request.json()
    const result = runWorkflowSchema.safeParse(body)

    if (!result.success) {
      return ApiResponseBuilder.error(traceId, '参数验证失败', 400, result.error.errors)
    }

    const { text } = result.data
    Logger.info(traceId, '开始处理工作流', { text })

    const prompt = userPrompt(dayjs().format('YYYY/MM/DD HH:mm:ss'), text)

    const response = await createChatCompletion([
      { role: 'system', content: SYSTEM_PROMPT() },
      { role: 'user', content: prompt },
    ])

    Logger.info(traceId, 'Doubao 工作流处理完成', {
      text,
      cost: Date.now() - startTime,
      response,
    })

    return ApiResponseBuilder.success(traceId, {
      response,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
