// import { NextRequest } from 'next/server';
// import { PrismaClient } from '@prisma/client';
// import { getVerifiedToken } from '@/lib/auth/jwt';
// import { UserRole } from '@/lib/auth/types';
// import { ApiResponseBuilder } from '@/lib/api-response';
// import { z } from 'zod';

// const prisma = new PrismaClient();

// // 地址数据验证Schema
// const addressSchema = z.object({
//     name: z.string().min(1, '收货人姓名不能为空'),
//     phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
//     province: z.string().min(1, '省份不能为空'),
//     city: z.string().min(1, '城市不能为空'),
//     area: z.string().min(1, '区域不能为空'),
//     address: z.string().min(1, '详细地址不能为空'),
//     isDefault: z.boolean().optional()
// });

// // GET - 获取用户地址列表
// export async function GET(request: NextRequest) {
//     const traceId = request.headers.get('X-Trace-ID') || 'unknown';

//     try {
//         // 验证用户身份
//         const authResult = await getVerifiedToken(request, UserRole.USER);
//         const userId = authResult.userId;

//         // 查询用户地址列表
//         const addresses = await prisma.address.findMany({
//             where: { userId },
//             orderBy: [
//                 { isDefault: 'desc' }, // 默认地址排在前面
//                 { id: 'desc' }          // 最新添加的排在前面
//             ]
//         });

//         return ApiResponseBuilder.success(traceId, {
//             addresses: addresses.map(addr => ({
//                 id: addr.id,
//                 name: addr.name,
//                 phone: addr.phone,
//                 province: addr.province,
//                 city: addr.city,
//                 area: addr.area,
//                 address: addr.address,
//                 fullAddress: `${addr.province}${addr.city}${addr.area}${addr.address}`,
//                 isDefault: addr.isDefault,
//                 latitude: addr.latitude,
//                 longitude: addr.longitude
//             }))
//         });

//     } catch (error: any) {
//         console.error(`[${traceId}] 获取地址列表失败:`, error);
//         return ApiResponseBuilder.error(traceId, error.message || '获取地址列表失败', 500);
//     }
// }

// // POST - 添加新地址
// export async function POST(request: NextRequest) {
//     const traceId = request.headers.get('X-Trace-ID') || 'unknown';

//     try {
//         // 验证用户身份
//         const authResult = await getVerifiedToken(request, UserRole.USER);
//         const userId = authResult.userId;

//         const body = await request.json();

//         // 数据验证
//         const validation = addressSchema.safeParse(body);
//         if (!validation.success) {
//             return ApiResponseBuilder.error(
//                 traceId,
//                 '数据校验失败',
//                 400,
//                 Object.entries(validation.error.flatten().fieldErrors).map(
//                     ([field, errors]) => ({
//                         field,
//                         message: errors?.[0] || '验证失败'
//                     })
//                 )
//             );
//         }

//         const addressData = validation.data;

//         // 检查是否已存在相同地址
//         const existingAddress = await prisma.address.findFirst({
//             where: {
//                 userId,
//                 name: addressData.name,
//                 phone: addressData.phone,
//                 province: addressData.province,
//                 city: addressData.city,
//                 area: addressData.area,
//                 address: addressData.address
//             }
//         });

//         if (existingAddress) {
//             return ApiResponseBuilder.error(traceId, '该地址已存在', 400);
//         }

//         // 创建新地址
//         const result = await prisma.$transaction(async (tx) => {
//             // 如果设置为默认地址，先取消其他默认地址
//             if (addressData.isDefault) {
//                 await tx.address.updateMany({
//                     where: {
//                         userId,
//                         isDefault: true
//                     },
//                     data: {
//                         isDefault: false
//                     }
//                 });
//             }

//             // 如果用户没有地址，自动设为默认
//             const addressCount = await tx.address.count({
//                 where: { userId }
//             });

//             const newAddress = await tx.address.create({
//                 data: {
//                     userId,
//                     name: addressData.name,
//                     phone: addressData.phone,
//                     province: addressData.province,
//                     city: addressData.city,
//                     area: addressData.area,
//                     address: addressData.address,
//                     isDefault: addressData.isDefault || addressCount === 0
//                 }
//             });

//             return newAddress;
//         });

//         return ApiResponseBuilder.success(traceId, {
//             id: result.id,
//             name: result.name,
//             phone: result.phone,
//             province: result.province,
//             city: result.city,
//             area: result.area,
//             address: result.address,
//             fullAddress: `${result.province}${result.city}${result.area}${result.address}`,
//             isDefault: result.isDefault
//         }, '地址添加成功');

//     } catch (error: any) {
//         console.error(`[${traceId}] 添加地址失败:`, error);
//         return ApiResponseBuilder.error(traceId, error.message || '添加地址失败', 500);
//     }
// }