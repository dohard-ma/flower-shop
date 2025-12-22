import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { WechatService } from '@/lib/wechat';
import { generateToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { generateDisplayId, IdType } from '@/lib/id-generator';

const loginSchema = z.object({
  code: z.string().min(1, 'code 不能为空'),
});

export async function POST(request: NextRequest) {
  const traceId = request.headers.get('X-Trace-ID')!;
  const appId = request.headers.get('x-wechat-appid')!;

  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(traceId, '参数错误', 400);
    }

    const { code } = validation.data;

    // 1. 确定店铺信息并获取 AppSecret
    let store = await prisma.store.findUnique({
      where: { appId }
    });

    // 如果店铺不存在，创建一个默认店铺 (方便本地测试)
    if (!store) {
      store = await prisma.store.create({
        data: {
          name: '默认花店',
          code: 'H',
          appId: appId,
          appSecret: process.env.WECHAT_SECRET // 只有默认店铺使用环境变量的 Secret
        }
      });
    }

    // 2. 调用微信接口换取 openid
    let openid: string;
    // 优先使用店铺配置的 Secret
    const appSecret = store.appSecret || process.env.WECHAT_SECRET;

    if (process.env.NODE_ENV === 'development' && !appSecret) {
      console.warn('未配置微信凭证，开发环境下使用模拟 openid');
      openid = `mock-openid-${code}`;
    } else {
      const session = await WechatService.code2Session(code, appId, appSecret);
      if (!session.openid) {
        return ApiResponseBuilder.error(traceId, `微信登录失败: ${session.errmsg || '未知错误'}`, 400);
      }
      openid = session.openid;
    }

    // 3. 查找或创建用户
    let user = await prisma.user.findUnique({
      where: {
        openid_storeId: {
          openid,
          storeId: store.id
        }
      }
    });

    if (!user) {
      // 创建新用户
      const displayId = await generateDisplayId(store.code, IdType.USER);
      user = await prisma.user.create({
        data: {
          openid,
          storeId: store.id,
          displayId,
          role: 'USER', // 默认角色
        }
      });
    }

    // 4. 生成 JWT Token
    // 将 DB 中的 role (USER/ADMIN) 映射到 UserRole enum (user/admin)
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
    }, UserRole.USER); // 统一使用小程序用户的 token 配置 (secret/issuer)

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

