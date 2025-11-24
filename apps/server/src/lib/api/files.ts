import { getUploadToken } from '@/lib/qiniu'
import { v4 as uuidv4 } from 'uuid'

export async function createOssFile(): Promise<{
  token: string
  ossKey: string
  expires: number
  domain: string
}> {
  const ossKey = `huajianli/products/images/${uuidv4()}`
  const token = getUploadToken()
  const domain = process.env.QINIU_PUBLIC_DOMAIN!

  return {
    token,
    ossKey,
    expires: 3600,
    domain
  }
}

// export function getFileDownloadUrl(key: string): {
//   url: string
//   expires: number
// } {
//   const url = getPrivateDownloadUrl(key)
//   return {
//     url,
//     expires: 3600,
//   }
// }
