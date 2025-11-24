import { NextRequest } from 'next/server'
import { Logger } from '@/utils/logger'
import { ApiResponseBuilder } from '@/lib/api-response'
import { getFileDownloadUrl } from '@/lib/api/files'
import { APIError } from '@/types'

interface RouteParams {
  key: string
}

export async function GET(request: NextRequest, context: { params: Promise<RouteParams> }) {
  const traceId = request.headers.get('X-Trace-ID')!
  const startTime = Date.now()
  const params = await context.params

  try {
    const { key } = params
    const downloadData = getFileDownloadUrl(key)

    Logger.info(traceId, '生成文件下载链接', {
      key,
      responseTime: Date.now() - startTime,
    })

    return ApiResponseBuilder.success(traceId, downloadData)
  } catch (error: unknown) {
    const apiError = error as APIError
    Logger.error(traceId, '生成下载链接失败', {
      key: params.key,
      responseTime: Date.now() - startTime,
      error: apiError,
    })

    return ApiResponseBuilder.error(
      traceId,
      apiError.response?.data?.message || '生成下载链接失败',
      apiError.response?.status || 500
    )
  }
}
