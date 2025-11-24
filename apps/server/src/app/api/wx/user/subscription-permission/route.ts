import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';

// 请求订阅权限的数据验证Schema
const requestPermissionSchema = z.object({
    grantedTemplates: z.array(z.string()).optional().default([]),
    deniedTemplates: z.array(z.string()).optional().default([]),
    alwaysAllowTemplates: z.array(z.string()).optional().default([]),
    allowSubscription: z.boolean().optional().default(true),
});

/**
 * 记录用户订阅权限
 * 支持批量操作和性能优化
 */
export async function POST(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        const body = await request.json();
        const validation = requestPermissionSchema.safeParse(body);

        if (!validation.success) {
            return ApiResponseBuilder.error(
                traceId,
                '数据校验失败',
                400,
                Object.entries(validation.error.flatten().fieldErrors).map(
                    ([field, errors]) => ({
                        field,
                        message: errors?.[0] || '验证失败'
                    })
                )
            );
        }

        const { grantedTemplates, deniedTemplates, alwaysAllowTemplates, allowSubscription } = validation.data;

        // 从请求头获取用户ID（假设已通过中间件验证）
        const userId = parseInt(request.headers.get('X-User-ID') || '0');
        if (!userId) {
            return ApiResponseBuilder.error(traceId, '用户未登录', 401);
        }

        console.log(`[${traceId}] 用户 ${userId} 订阅权限处理:`, {
            grantedTemplates,
            deniedTemplates,
            alwaysAllowTemplates,
            allowSubscription,
        });

        // 使用事务确保数据一致性
        const result = await prisma.$transaction(async (tx) => {
            let createdCount = 0;
            let updatedCount = 0;
            let deniedCount = 0;

            // 处理授权的模板ID
            if (grantedTemplates && grantedTemplates.length > 0) {
                // 批量获取现有权限记录
                const existingPermissions = await tx.subscriptionPermission.findMany({
                    where: {
                        userId,
                        templateId: { in: grantedTemplates }
                    }
                });

                const existingTemplateIds = existingPermissions.map(p => p.templateId);
                const newTemplateIds = grantedTemplates.filter(id => !existingTemplateIds.includes(id));

                // 创建新权限记录，availableCount = 1
                if (newTemplateIds.length > 0) {
                    const createData = newTemplateIds.map(templateId => ({
                        userId,
                        templateId,
                        availableCount: 1
                    }));

                    await tx.subscriptionPermission.createMany({
                        data: createData,
                        skipDuplicates: true
                    });
                    createdCount = newTemplateIds.length;
                }

                // 更新现有权限记录，availableCount += 1
                if (existingTemplateIds.length > 0) {
                    for (const permission of existingPermissions) {
                        await tx.subscriptionPermission.update({
                            where: { id: permission.id },
                            data: {
                                availableCount: {
                                    increment: 1
                                }
                            }
                        });
                    }
                    updatedCount = existingTemplateIds.length;
                }
            }

            // 处理拒绝的模板ID，将 availableCount 重置为 0
            if (deniedTemplates && deniedTemplates.length > 0) {
                const deniedResult = await tx.subscriptionPermission.updateMany({
                    where: {
                        userId,
                        templateId: { in: deniedTemplates }
                    },
                    data: {
                        availableCount: 0
                    }
                });
                deniedCount = deniedResult.count;
            }

            // 更新用户的 allowSubscription 和 alwaysAllowSubscriptionKeys
            await tx.user.update({
                where: { id: userId },
                data: {
                    allowSubscription,
                    alwaysAllowSubscriptionKeys: alwaysAllowTemplates
                }
            });

            return { createdCount, updatedCount, deniedCount };
        });

        console.log(`[${traceId}] 权限处理完成:`, result);

        return ApiResponseBuilder.success(traceId, {
            message: '订阅权限记录成功',
            permissionsCreated: result.createdCount,
            permissionsUpdated: result.updatedCount,
            permissionsDenied: result.deniedCount,
            totalPermissionsGranted: grantedTemplates.length,
            alwaysAllowKeys: alwaysAllowTemplates
        });

    } catch (error: any) {
        console.error(`[${traceId}] 记录订阅权限失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '记录订阅权限失败', 500);
    }
}

// /**
//  * 获取用户订阅权限状态
//  * 支持缓存优化
//  */
// export async function GET(request: NextRequest) {
//     const traceId = request.headers.get('X-Trace-ID') || 'unknown';

//     try {
//         const userId = parseInt(request.headers.get('X-User-ID') || '0');
//         if (!userId) {
//             return ApiResponseBuilder.error(traceId, '用户未登录', 401);
//         }

//         const { searchParams } = new URL(request.url);
//         const templateIds = searchParams.get('templateIds')?.split(',').filter(Boolean) || [];

//         // 优化查询：只查询需要的字段，减少数据传输
//         const userSubscriptionData = await prisma.user.findUnique({
//             where: { id: userId },
//             select: {
//                 allowSubscription: true,
//                 alwaysAllowSubscriptionKeys: true,
//                 subscriptionPermissions: {
//                     where: templateIds.length > 0 ? { templateId: { in: templateIds } } : undefined,
//                     select: {
//                         templateId: true,
//                         availableCount: true,
//                         updatedAt: true
//                     }
//                 }
//             }
//         });

//         if (!userSubscriptionData) {
//             return ApiResponseBuilder.error(traceId, '用户不存在', 404);
//         }

//         let alwaysAllowKeys: string[] = [];
//         try {
//             const keys = userSubscriptionData.alwaysAllowSubscriptionKeys;
//             alwaysAllowKeys = Array.isArray(keys) ? keys as string[] : [];
//         } catch {
//             alwaysAllowKeys = [];
//         }

//         return ApiResponseBuilder.success(traceId, {
//             allowSubscription: userSubscriptionData.allowSubscription,
//             alwaysAllowKeys,
//             permissions: userSubscriptionData.subscriptionPermissions,
//             totalAvailableCount: userSubscriptionData.subscriptionPermissions
//                 .reduce((sum, p) => sum + p.availableCount, 0)
//         });

//     } catch (error: any) {
//         console.error(`[${traceId}] 获取订阅权限状态失败:`, error);
//         return ApiResponseBuilder.error(traceId, error.message || '获取订阅权限状态失败', 500);
//     }
// }