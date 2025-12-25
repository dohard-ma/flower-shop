import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from '../config/index';

// 七牛云上传配置
interface QiniuConfig {
  token: string;
  ossKey: string;
  // mimeType: string;
  [key: string]: any;
}

interface TokenResponse {
  success: boolean;
  data: {
    token: string;
    expires: number;
    ossKey: string;
    domain: string;
  };
}

interface DownloadTokenResponse {
  success: boolean;
  data: {
    url: string; // 已经包含下载凭证的完整URL
    expires: number;
  };
}

const accountInfo = wx.getAccountInfoSync();
const appId = accountInfo.miniProgram.appId;

// 获取七牛云上传token
export async function getQiniuToken(type: 'private' | 'public' = 'public'): Promise<{
  token: string;
  ossKey: string;
  domain: string;
}> {
  return new Promise(async (resolve, reject) => {
    await wx.request<TokenResponse>({
      url: `${API_BASE_URL}/file/token?type=${type}`,
      header: {
        Authorization: `Bearer ${wx.getStorageSync(AUTH_TOKEN_STORAGE_KEY)}`,
        'x-wechat-appid': appId,
      },
      method: 'GET',
      success: ({ data }) => {
        resolve(data?.data || ({} as { token: string; ossKey: string; domain: string }));
      },
      fail: reject,
    });
  });
}

// 上传文件到七牛云
export async function uploadToQiniu(
  filePath: string,
  config: QiniuConfig
): Promise<{ url: string;[key: string]: any }> {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://up-z2.qiniup.com',
      filePath,
      name: 'file',
      formData: {
        ...config,
        key: `${config.ossKey}`, // 指定文件名
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const data = JSON.parse(res.data);
          resolve({
            ...data,
            key: `${config.ossKey}`, // 确保返回的数据中包含key
          });
        } else {
          reject(new Error('上传失败'));
        }
      },
      fail: reject,
    });
  });
}

// 获取私有资源访问URL
export async function getPrivateDownloadUrl(key: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await wx.request({
      url: `${API_BASE_URL}/file/download/${key}`,
      header: {
        Authorization: `Bearer ${wx.getStorageSync(AUTH_TOKEN_STORAGE_KEY)}`,
      },
      method: 'GET',
      success: ({ data }: { data: DownloadTokenResponse }) => {
        if (data?.success) {
          resolve(data.data.url);
        } else {
          reject(new Error('获取下载链接失败'));
        }
      },
      fail: reject,
    });
  });
}

// 图片处理参数类型
interface ImageProcessOptions {
  quality?: number;     // 质量压缩，1-100
  width?: number;       // 指定宽度
  height?: number;      // 指定高度
  scale?: number;       // 缩放比例，1-100
}

// 处理七牛云图片URL，添加图片处理参数
export function processImageUrl(url: string, options: ImageProcessOptions = {}): string {
  if (!url) return url;

  let params = [];

  // 同时指定宽高
  if (options.width && options.height) {
    params.push(`thumbnail/${options.width}x${options.height}`);
  }
  // 仅指定宽度，等比缩放
  else if (options.width) {
    params.push(`thumbnail/w/${options.width}`);
  }
  // 按比例缩放
  else if (options.scale) {
    params.push(`thumbnail/!${options.scale}p`);
  }

  // 质量压缩
  if (options.quality) {
    params.push(`quality/${options.quality}`);
  }

  if (params.length === 0) return url;

  // 组合处理参数
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}imageMogr2/${params.join('/')}`;
}
