/**
 * 生成 traceid，仅仅在中间件中使用
 */

function generateTraceId(pathname: string): string {
    const path = pathname.replace(/^\//, '').replace(/\//g, '.')
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).slice(-3)
    return `${path}.${timestamp}${random}`
}

export default generateTraceId;