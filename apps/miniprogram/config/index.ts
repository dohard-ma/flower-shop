const accountInfo = wx.getAccountInfoSync();

const env = accountInfo.miniProgram.envVersion; // 获取当前环境版本

export const API_BASE_URL = 'http://192.168.1.3:3000/api/wx';

export const QINIU_BASE_URL = 'http://192.168.1.3:3000/api/file';
export const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

