import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';

export class WechatService {
  private static readonly APPID = process.env.WECHAT_APPID!;
  private static readonly SECRET = process.env.WECHAT_SECRET!;
  private static readonly MCHID = process.env.WECHAT_MCHID!; // 商户号
  private static readonly API_KEY = process.env.WECHAT_API_KEY!; // APIv3密钥
  private static readonly CERT_SERIAL_NO = process.env.WECHAT_CERT_SERIAL_NO!; // 证书序列号
  private static readonly PRIVATE_KEY_PATH = process.env.WECHAT_PRIVATE_KEY_PATH!; // 商户私钥路径
  private static readonly PLATFORM_CERT_PATH = process.env.WECHAT_PLATFORM_CERT_PATH!; // 微信支付平台证书路径

  static async code2Session(code: string, appId?: string, secret?: string) {
    try {
      const url = 'https://api.weixin.qq.com/sns/jscode2session';
      const response = await axios.get(url, {
        params: {
          appid: appId || this.APPID,
          secret: secret || this.SECRET,
          js_code: code,
          grant_type: 'authorization_code'
        }
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 获取手机号
  static async getPhoneNumber(code: string, appId?: string, secret?: string) {
    try {
      // 首先获取access_token
      const tokenUrl = 'https://api.weixin.qq.com/cgi-bin/token';
      const tokenResponse = await axios.get(tokenUrl, {
        params: {
          grant_type: 'client_credential',
          appid: appId || this.APPID,
          secret: secret || this.SECRET
        }
      });

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new Error('获取access_token失败');
      }

      // 调用获取手机号接口
      const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${access_token}`;
      const phoneResponse = await axios.post(phoneUrl, {
        code: code
      });

      return phoneResponse.data;
    } catch (error) {
      console.error('获取手机号失败:', error);
      throw error;
    }
  }

  // 获取access_token
  static async getAccessToken(appId?: string, secret?: string): Promise<string> {
    try {
      const tokenUrl = 'https://api.weixin.qq.com/cgi-bin/token';
      const tokenResponse = await axios.get(tokenUrl, {
        params: {
          grant_type: 'client_credential',
          appid: appId || this.APPID,
          secret: secret || this.SECRET
        }
      });

      const { access_token, errcode, errmsg } = tokenResponse.data;

      if (errcode) {
        throw new Error(`获取access_token失败: ${errmsg}`);
      }

      if (!access_token) {
        throw new Error('获取access_token失败');
      }

      return access_token;
    } catch (error) {
      console.error('获取access_token失败:', error);
      throw error;
    }
  }

  // 发送订阅消息
  static async sendSubscribeMessage(params: {
    touser: string; // 接收者openid
    template_id: string; // 模板ID
    page?: string; // 点击模板卡片后的跳转页面
    miniprogram_state?: 'developer' | 'trial' | 'formal'; // 跳转小程序类型
    lang?: 'zh_CN' | 'en_US' | 'zh_HK' | 'zh_TW'; // 进入小程序查看的语言类型
    data: Record<string, { value: string }>; // 模板内容
  }) {
    try {
      const accessToken = await this.getAccessToken();

      const messageData = {
        touser: params.touser,
        template_id: params.template_id,
        page: params.page || '',
        miniprogram_state: params.miniprogram_state || 'formal',
        lang: params.lang || 'zh_CN',
        data: params.data
      };

      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;
      const response = await axios.post(url, messageData);

      const { errcode, errmsg } = response.data;

      if (errcode !== 0) {
        throw new Error(`发送订阅消息失败: ${errmsg} (错误码: ${errcode})`);
      }

      return response.data;
    } catch (error) {
      console.error('发送订阅消息失败:', error);
      throw error;
    }
  }

  // 发送订单状态变更通知
  static async sendOrderStatusNotification(params: {
    openid: string;
    orderNo: string;
    productName: string;
    status: string;
    tips: string;
    updateTime: string;
    page?: string;
  }) {
    const templateId = 'UXitKzFcB8zlW6Q_cHN2YZRwmYYmpRXSujjkF0gvKfQ'; // 订单状态变更通知模板ID
    console.log('==>> 发送订单状态变更通知:', params);

    // 确保字段长度符合微信订阅消息模板要求
    const truncateText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - 1) + '…';
    };

    return this.sendSubscribeMessage({
      touser: params.openid,
      template_id: templateId,
      page: params.page || `pages/order/detail/index?orderId=${params.orderNo}`,
      data: {
        character_string1: { value: params.orderNo }, // 订单号 - 字符串类型，限制32字符
        thing2: { value: truncateText(params.productName, 20) }, // 项目名称 - thing类型，限制20字符
        phrase3: { value: truncateText(params.status, 5) }, // 订单状态 - phrase类型，限制5字符
        thing4: { value: truncateText(params.tips, 20) }, // 温馨提示 - thing类型，限制20字符
        time7: { value: params.updateTime } // 更新时间 - time类型
      }
    });
  }

  // 发送订阅消息（通用方法，支持权限管理）
  static async sendWechatSubscribeMessage(params: {
    touser: string;
    template_id: string;
    page?: string;
    data: Record<string, { value: string }>;
  }): Promise<{ success: boolean; errcode?: number; error?: string; permissionConsumed?: boolean }> {
    try {
      const { touser, template_id, page, data } = params;

      const accessToken = await this.getAccessToken();

      const requestData = {
        touser,
        template_id,
        page: page || '',
        miniprogram_state: process.env.NODE_ENV === 'development' ? 'developer' : 'formal',
        lang: 'zh_CN',
        data
      };

      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        }
      );

      const result = await response.json();

      if (result.errcode === 0) {
        console.log('订阅消息发送成功:', { openid: touser, templateId: template_id });


        return {
          success: true,
        };
      } else {
        console.error('订阅消息发送失败:', result);
        return {
          success: false,
          errcode: result.errcode,
          error: `${result.errcode}: ${result.errmsg}`,
          permissionConsumed: false
        };
      }
    } catch (error: any) {
      console.error('发送订阅消息异常:', error);
      return {
        success: false,
        error: error.message,
        permissionConsumed: false
      };
    }
  }

  // 创建微信支付订单（小程序支付）
  static async createPayOrder(params: {
    outTradeNo: string; // 商户订单号
    description: string; // 商品描述
    amount: number; // 支付金额（分）
    openid: string; // 用户openid
    notifyUrl: string; // 支付结果通知地址
  }) {
    try {
      const { outTradeNo, description, amount, openid, notifyUrl } = params;

      // 构建请求参数 - 符合官方小程序支付API格式
      const payData = {
        appid: this.APPID,
        mchid: this.MCHID,
        description,
        out_trade_no: outTradeNo,
        notify_url: notifyUrl,
        amount: {
          total: amount,
          currency: 'CNY'
        },
        payer: {
          openid
        }
      };

      const url = '/v3/pay/transactions/jsapi';
      const method = 'POST';
      const body = JSON.stringify(payData);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();

      // 生成签名
      const signature = this.generateSignature(method, url, timestamp, nonceStr, body);

      // 发起支付请求
      const response = await axios.post(
        `https://api.mch.weixin.qq.com${url}`,
        payData,
        {
          headers: {
            'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${this.MCHID}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.CERT_SERIAL_NO}",signature="${signature}"`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const { prepay_id } = response.data;

      // 生成小程序调起支付的参数
      const payParams = this.generateMiniPayParams(prepay_id);

      return payParams;
    } catch (error) {
      console.error('创建支付订单失败:', error);
      throw error;
    }
  }

  /**
   * 获取小程序码 (不限制次数)
   * @param scene 最大32个可见字符，只支持数字，大小写英文以及部分特殊字符
   * @param page 必须是已经发布的小程序界面地址
   * @param appId
   * @param secret
   * @returns
   */
  static async getUnlimitedQRCode(scene: string, page: string, appId?: string, secret?: string): Promise<Buffer> {
    try {
      const accessToken = await this.getAccessToken(appId, secret);
      const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;

      const payload = {
        scene: scene.substring(0, 32), // 强制截断至32位以防万一
        page,
        check_path: false,
        env_version: process.env.NODE_ENV === 'production' ? 'release' : 'develop'
      };

      console.log(`[WechatService] 请求参数:`, JSON.stringify(payload));

      const response = await axios.post(url, payload, {
        responseType: 'arraybuffer'
      });

      // 如果返回的是 JSON，说明出错了
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const result = JSON.parse(Buffer.from(response.data).toString());
        console.error(`[WechatService] 微信返回错误:`, result);
        if (result.errcode) {
          throw new Error(`获取小程序码失败: ${result.errmsg} (错误码: ${result.errcode})`);
        }
      }

      console.log(`[WechatService] 成功获取小程序码, 数据长度: ${response.data.byteLength}`);
      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('获取小程序码异常:', error.message);
      if (error.response?.data) {
        try {
          const errorDetail = JSON.parse(Buffer.from(error.response.data).toString());
          console.error('错误详情:', errorDetail);
        } catch(e) {}
      }
      throw error;
    }
  }

  // 查询支付订单状态
  static async queryPayOrder(outTradeNo: string) {
    try {
      const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.MCHID}`;
      const method = 'GET';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();

      const signature = this.generateSignature(method, url, timestamp, nonceStr, '');

      const response = await axios.get(`https://api.mch.weixin.qq.com${url}`, {
        headers: {
          'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${this.MCHID}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.CERT_SERIAL_NO}",signature="${signature}"`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('查询支付订单失败:', error);
      throw error;
    }
  }

  // 验证支付回调签名
  static verifyPaymentNotify(signature: string, timestamp: string, nonce: string, body: string): boolean {
    try {
      const message = `${timestamp}\n${nonce}\n${body}\n`;

      // 读取微信支付平台证书公钥
      const publicKey = fs.readFileSync(this.PLATFORM_CERT_PATH);

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(message);
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      console.error('验证支付回调签名失败:', error);
      return false;
    }
  }

  // 解密支付回调数据
  static decryptPaymentNotify(encryptedData: {
    ciphertext: string;
    associated_data: string;
    nonce: string;
  }): any {
    try {
      const { ciphertext, associated_data, nonce } = encryptedData;

      // 确保API密钥是32字节
      let key: Buffer;
      if (this.API_KEY.length === 32) {
        // 如果是32个字符，直接转换为Buffer
        key = Buffer.from(this.API_KEY, 'utf8');
      } else {
        // 如果是其他长度，可能是hex编码
        key = Buffer.from(this.API_KEY, 'hex');
      }

      // 确保密钥长度正确
      if (key.length !== 32) {
        throw new Error(`API密钥长度不正确: ${key.length}, 需要32字节`);
      }

      // 注意：nonce 是直接的字符串，不需要base64解码
      const iv = Buffer.from(nonce, 'utf8');
      const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
      const aad = Buffer.from(associated_data, 'utf8');

      // 检查IV长度 - 对于字符串nonce，长度通常是12字符
      if (iv.length !== 12) {
        // 如果不是12字节，尝试填充或截断到12字节
        const paddedIv = Buffer.alloc(12);
        if (iv.length > 12) {
          iv.copy(paddedIv, 0, 0, 12);
        } else {
          iv.copy(paddedIv, 0);
        }
        console.log(`IV长度调整: ${iv.length} -> 12字节`);
        var finalIv = paddedIv;
      } else {
        var finalIv = iv;
      }

      // 分离密文和认证标签
      const authTagLength = 16;
      if (ciphertextBuffer.length < authTagLength) {
        throw new Error('密文长度不足，无法提取认证标签');
      }

      const authTag = ciphertextBuffer.slice(-authTagLength);
      const encryptedContent = ciphertextBuffer.slice(0, -authTagLength);

      console.log('解密参数:', {
        keyLength: key.length,
        ivLength: finalIv.length,
        aadLength: aad.length,
        authTagLength: authTag.length,
        encryptedContentLength: encryptedContent.length,
        originalNonce: nonce,
        nonceByteLength: iv.length
      });

      // AES-256-GCM解密
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, finalIv);
      decipher.setAuthTag(authTag);
      decipher.setAAD(aad);

      let decrypted = decipher.update(encryptedContent);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const result = JSON.parse(decrypted.toString('utf8'));
      console.log('解密成功');
      return result;
    } catch (error) {
      console.error('标准解密方法失败:', error);

      // 尝试备用解密方法
      try {
        return this.decryptPaymentNotifyFallback(encryptedData);
      } catch (fallbackError) {
        console.error('备用解密方法也失败:', fallbackError);

        // 尝试第三种解密方法
        try {
          return this.decryptPaymentNotifyOfficial(encryptedData);
        } catch (officialError) {
          console.error('官方解密方法也失败:', officialError);

          // 提供更详细的错误信息
          if (error instanceof Error) {
            if (error.message.includes('unable to authenticate data')) {
              throw new Error('认证失败：可能是API密钥不正确或数据被篡改');
            } else if (error.message.includes('Unsupported state')) {
              throw new Error('解密状态错误：检查密钥和IV是否正确');
            }
          }

          throw new Error(`所有解密方法都失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    }
  }

  // 备用解密方法 - 尝试不同的密钥处理方式
  private static decryptPaymentNotifyFallback(encryptedData: {
    ciphertext: string;
    associated_data: string;
    nonce: string;
  }): any {
    const { ciphertext, associated_data, nonce } = encryptedData;

    // 尝试使用MD5处理后的密钥
    const md5Key = crypto.createHash('md5').update(this.API_KEY).digest();

    // 扩展到32字节
    const key = Buffer.concat([md5Key, md5Key]); // 16+16=32字节

    // nonce 直接使用字符串
    const iv = Buffer.from(nonce, 'utf8');
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const aad = Buffer.from(associated_data, 'utf8');

    // 确保IV是12字节
    const finalIv = Buffer.alloc(12);
    if (iv.length > 12) {
      iv.copy(finalIv, 0, 0, 12);
    } else {
      iv.copy(finalIv, 0);
    }

    const authTagLength = 16;
    const authTag = ciphertextBuffer.slice(-authTagLength);
    const encryptedContent = ciphertextBuffer.slice(0, -authTagLength);

    console.log('备用解密参数:', {
      originalKeyLength: this.API_KEY.length,
      md5KeyLength: md5Key.length,
      finalKeyLength: key.length,
      ivLength: finalIv.length,
      originalNonceLength: iv.length
    });

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, finalIv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(aad);

    let decrypted = decipher.update(encryptedContent);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const result = JSON.parse(decrypted.toString('utf8'));
    console.log('备用解密成功');
    return result;
  }

  // 第三种解密方法 - 基于官方示例
  private static decryptPaymentNotifyOfficial(encryptedData: {
    ciphertext: string;
    associated_data: string;
    nonce: string;
  }): any {
    const { ciphertext, associated_data, nonce } = encryptedData;

    // 直接使用API密钥字符串，不进行额外处理
    const key = this.API_KEY;

    // 使用crypto-js风格的解密（如果需要的话）
    const algorithm = 'aes-256-gcm';
    const keyBuffer = Buffer.from(key, 'utf8');

    // nonce 直接使用字符串
    const ivBuffer = Buffer.from(nonce, 'utf8');
    const encryptedBuffer = Buffer.from(ciphertext, 'base64');
    const aadBuffer = Buffer.from(associated_data, 'utf8');

    // 确保密钥长度正确
    if (keyBuffer.length !== 32) {
      throw new Error(`第三种方法密钥长度错误: ${keyBuffer.length}`);
    }

    // 确保IV是12字节
    const finalIv = Buffer.alloc(12);
    if (ivBuffer.length > 12) {
      ivBuffer.copy(finalIv, 0, 0, 12);
    } else {
      ivBuffer.copy(finalIv, 0);
    }

    const authTagLength = 16;
    const authTag = encryptedBuffer.slice(-authTagLength);
    const content = encryptedBuffer.slice(0, -authTagLength);

    console.log('官方解密参数:', {
      keyLength: keyBuffer.length,
      ivLength: finalIv.length,
      contentLength: content.length,
      authTagLength: authTag.length,
      originalNonceLength: ivBuffer.length
    });

    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, finalIv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(aadBuffer);

    let result = decipher.update(content);
    result = Buffer.concat([result, decipher.final()]);

    const data = JSON.parse(result.toString('utf8'));
    console.log('官方解密成功');
    return data;
  }

  // 解密调试方法
  static debugDecryptPaymentNotify(encryptedData: any): void {
    const apiKeyBuffer = this.API_KEY ? Buffer.from(this.API_KEY, 'utf8') : null;

    // 正确处理nonce - 直接使用字符串，不是base64解码
    const nonceBuffer = encryptedData.nonce ? Buffer.from(encryptedData.nonce, 'utf8') : null;
    const ciphertextBuffer = encryptedData.ciphertext ? Buffer.from(encryptedData.ciphertext, 'base64') : null;

    console.log('解密调试信息:', {
      // API密钥信息
      hasApiKey: !!this.API_KEY,
      apiKeyLength: this.API_KEY?.length,
      apiKeyBufferLength: apiKeyBuffer?.length,
      apiKeyFirst4Chars: this.API_KEY?.substring(0, 4) + '***',

      // 加密数据信息
      encryptedDataKeys: Object.keys(encryptedData || {}),
      algorithm: encryptedData.algorithm,

      // 数据长度信息
      ciphertextLength: encryptedData.ciphertext?.length,
      ciphertextBufferLength: ciphertextBuffer?.length,
      nonceString: encryptedData.nonce,
      nonceLength: encryptedData.nonce?.length,
      nonceUtf8BufferLength: nonceBuffer?.length,
      associatedDataLength: encryptedData.associated_data?.length,

      // 计算的认证标签长度
      authTagLength: ciphertextBuffer ? Math.min(16, ciphertextBuffer.length) : 0,
      encryptedContentLength: ciphertextBuffer ? Math.max(0, ciphertextBuffer.length - 16) : 0,

      // 处理说明
      processingNote: 'nonce作为UTF-8字符串处理，不进行base64解码'
    });
  }

  // 验证API密钥格式
  static validateApiKey(): { isValid: boolean; message: string; suggestions: string[] } {
    if (!this.API_KEY) {
      return {
        isValid: false,
        message: 'API密钥未配置',
        suggestions: ['检查环境变量WECHAT_API_KEY是否正确设置']
      };
    }

    const suggestions: string[] = [];

    // 检查长度
    if (this.API_KEY.length !== 32) {
      suggestions.push(`当前长度${this.API_KEY.length}，建议32字符`);
    }

    // 检查是否全是数字和字母
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(this.API_KEY);
    if (!isAlphanumeric) {
      suggestions.push('API密钥应该只包含字母和数字');
    }

    // 检查UTF-8编码后的字节长度
    const utf8Length = Buffer.from(this.API_KEY, 'utf8').length;
    if (utf8Length !== 32) {
      suggestions.push(`UTF-8编码后长度${utf8Length}，需要32字节`);
    }

    return {
      isValid: this.API_KEY.length === 32 && isAlphanumeric && utf8Length === 32,
      message: suggestions.length === 0 ? 'API密钥格式正确' : '检测到API密钥格式问题',
      suggestions
    };
  }

  // 生成随机字符串
  private static generateNonceStr(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // 生成请求签名（使用商户私钥）
  private static generateSignature(method: string, url: string, timestamp: string, nonceStr: string, body: string): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;

    // 读取商户私钥
    const privateKey = fs.readFileSync(this.PRIVATE_KEY_PATH);

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(privateKey, 'base64');
  }

  // 生成小程序调起支付的参数
  private static generateMiniPayParams(prepayId: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageValue = `prepay_id=${prepayId}`;
    const signType = 'RSA';

    // 构造签名字符串
    const stringA = `${this.APPID}\n${timestamp}\n${nonceStr}\n${packageValue}\n`;

    // 使用商户私钥签名
    const privateKey = fs.readFileSync(this.PRIVATE_KEY_PATH);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(stringA);
    const paySign = sign.sign(privateKey, 'base64');

    return {
      timeStamp: timestamp,
      nonceStr,
      package: packageValue,
      signType,
      paySign,
      prepayId: prepayId
    };
  }
}

// 导出便捷函数以保持向后兼容性
export const sendWechatSubscribeMessage = WechatService.sendWechatSubscribeMessage;


