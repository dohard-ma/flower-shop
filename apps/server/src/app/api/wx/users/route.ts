import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { WechatService } from '@/lib/wechat';
import { generateToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { generateDisplayId, IdType } from '@/lib/id-generator';
import { uploadImage, generateUniqueFilename, OSS_DIR } from '@/lib/qiniu';

export async function POST(request: NextRequest) {
  const traceId = request.headers.get('X-Trace-ID')!;
  const appId = request.headers.get('x-wechat-appid')!;
  const contentType = request.headers.get('content-type') || '';

  try {
    let code: string;
    let phoneCode: string | null = null;
    let nickname: string | null = null;
    let avatarFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      code = formData.get('code') as string;
      phoneCode = formData.get('phoneCode') as string | null;
      nickname = formData.get('nickname') as string | null;
      avatarFile = formData.get('avatar') as File | null;
    } else {
      const body = await request.json();
      code = body.code;
      phoneCode = body.phoneCode;
      nickname = body.nickname;
      // JSON 模式下不支持直接传文件，除非是 base64，这里暂不处理
    }

    if (!code) {
      return ApiResponseBuilder.error(traceId, 'code 不能为空', 400);
    }

    // 1. 确定店铺信息并获取 AppSecret
    let store = await prisma.store.findUnique({
      where: { appId }
    });

    if (!store) {
      store = await prisma.store.create({
        data: {
          name: '默认花店',
          code: 'H',
          appId: appId,
          appSecret: process.env.WECHAT_SECRET
        }
      });
    }

    const appSecret = store.appSecret || process.env.WECHAT_SECRET;

    // 2. 调用微信接口换取 openid
    let openid: string;
    if (process.env.NODE_ENV === 'development' && !appSecret) {
      openid = `mock-openid-${code}`;
    } else {
      const session = await WechatService.code2Session(code, appId, appSecret);
      if (!session.openid) {
        return ApiResponseBuilder.error(traceId, `微信登录失败: ${session.errmsg || '未知错误'}`, 400);
      }
      openid = session.openid;
    }

    // 3. 处理手机号 (如果有 phoneCode)
    let phoneNumber: string | undefined;
    if (phoneCode && phoneCode !== 'undefined') {
      try {
        const phoneRes = await WechatService.getPhoneNumber(phoneCode, appId, appSecret);
        if (phoneRes.errcode === 0 && phoneRes.phone_info) {
          phoneNumber = phoneRes.phone_info.phoneNumber;
        } else {
          console.error('[GetPhoneNumber Error]:', phoneRes);
        }
      } catch (err) {
        console.error('[GetPhoneNumber Exception]:', err);
      }
    }

    // 4. 处理头像上传 (如果有文件)
    let avatarUrl: string | undefined;
    if (avatarFile) {
      try {
        const buffer = Buffer.from(await avatarFile.arrayBuffer());
        const filename = generateUniqueFilename(avatarFile.name || 'avatar.png', 'avatar');
        avatarUrl = await uploadImage(buffer, filename, OSS_DIR.USERS.AVATAR);
      } catch (err) {
        console.error('[Avatar Upload Error]:', err);
      }
    }

    // 5. 查找或创建用户
    let user = await prisma.user.findUnique({
      where: {
        openid_storeId: {
          openid,
          storeId: store.id
        }
      }
    });

    if (!user) {
      const displayId = await generateDisplayId(store.code, IdType.USER);
      user = await prisma.user.create({
        data: {
          openid,
          storeId: store.id,
          displayId,
          role: 'USER',
          nickname: nickname || undefined,
          avatar: avatarUrl || undefined,
          phone: phoneNumber || undefined,
        }
      });
    } else {
      // 如果用户已存在，更新信息
      const updateData: any = {};
      if (nickname) updateData.nickname = nickname;
      if (avatarUrl) updateData.avatar = avatarUrl;
      if (phoneNumber) updateData.phone = phoneNumber;

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    }

    // 6. 生成 JWT Token
    const roleMap: Record<string, UserRole> = {
      'USER': UserRole.USER,
      'ADMIN': UserRole.ADMIN
    };
    const mappedRole = roleMap[user.role] || UserRole.USER;

    const token = await generateToken({
      userId: user.id,
      userNo: user.displayId,
      username: user.nickname || '微信用户',
      role: mappedRole,
      storeId: user.storeId,
    }, UserRole.USER);

    return ApiResponseBuilder.success(traceId, {
      ...user,
      token
    });

  } catch (error: any) {
    console.error('[Login POST] Error:', error);
    return ApiResponseBuilder.error(traceId, '登录失败', 500, [
      { message: error.message }
    ]);
  }
}

