import * as qiniu from 'qiniu';

// 配置七牛云
const accessKey = process.env.QINIU_ACCESS_KEY!;
const secretKey = process.env.QINIU_SECRET_KEY!;
const bucket = process.env.QINIU_PUBLIC_BUCKET!;
const domain = process.env.QINIU_PUBLIC_DOMAIN!;

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z2; // 根据你的空间所在区域选择

// 上传凭证
const options = {
  scope: bucket,
  expires: 7200,
  returnBody:
    '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(fname)"}'
};

// 定义文件目录
export const OSS_DIR = {
  PRODUCTS: {
    IMAGES: 'huajianli/products/images',
  },
  USERS: {
    AVATAR: 'huajianli/users/avatars'
  },
  AUDIO: {
    VOICE: 'huajianli/audio/voice'
  }
} as const;

/**
 * 获取上传凭证
 */
export function getUploadToken() {
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
}

/**
 * 上传文件到七牛云
 * @param file 文件 Buffer
 * @param key 文件名
 * @param directory 存储目录
 * @returns 文件访问URL
 */
export async function uploadToQiniu(
  file: Buffer,
  key: string,
  directory: string
): Promise<string> {
  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();
  const uploadToken = getUploadToken();

  // 组合完整的文件路径
  const fullKey = `${directory.replace(/^\/+|\/+$/g, '')}/${key}`;

  return new Promise((resolve, reject) => {
    formUploader.put(
      uploadToken,
      fullKey,
      file,
      putExtra,
      function (err: any, body: any, info: any) {
        if (err) {
          return reject(err);
        }
        if (info.statusCode === 200) {
          resolve(`${domain}/${body.key}`);
        } else {
          reject(new Error('上传失败'));
        }
      }
    );
  });
}

/**
 * 生成唯一的文件名
 * @param originalFilename 原始文件名
 * @param prefix 文件名前缀
 * @returns 新文件名
 */
export function generateUniqueFilename(
  originalFilename: string,
  prefix?: string
): string {
  const ext = originalFilename.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix ? prefix + '-' : ''}${timestamp}-${random}.${ext}`;
}


/**
 * 上传产品图片
 * @param file 文件 Buffer
 * @param filename 文件名
 */
export async function uploadImage(
  file: Buffer,
  filename: string,
  directory: string
): Promise<string> {
  return uploadToQiniu(file, filename, directory);
}
