// import { NextRequest } from 'next/server';
// import { PrismaClient } from '@prisma/client';
// import { getVerifiedToken } from '@/lib/auth/jwt';
// import { UserRole } from '@/lib/auth/types';
// import { ApiResponseBuilder } from '@/lib/api-response';
// import { z } from 'zod';

// const prisma = new PrismaClient();

// // 地址更新数据验证Schema
// const updateAddressSchema = z.object({
//     name: z.string().min(1, '收货人姓名不能为空').optional(),
//     phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
//     province: z.string().min(1, '省份不能为空').optional(),
//     city: z.string().min(1, '城市不能为空').optional(),
//     area: z.string().min(1, '区域不能为空').optional(),
//     address: z.string().min(1, '详细地址不能为空').optional(),
//     isDefault: z.boolean().optional()
// });

// // PUT - 更新地址
// export async function PUT(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     const traceId = request.headers.get('X-Trace-ID') || 'unknown';

//     try {
//         // 验证用户身份
//         const authResult = await getVerifiedToken(request, UserRole.USER);
//         const userId = authResult.userId;
//         const addressId = parseInt((await params).id);

//         if (isNaN(addressId)) {
//             return ApiResponseBuilder.error(traceId, '无效的地址ID', 400);
//         }

//         const body = await request.json();

//         // 数据验证
//         const validation = updateAddressSchema.safeParse(body);
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

//         const updateData = validation.data;

//         // 验证地址是否属于当前用户
//         const existingAddress = await prisma.address.findFirst({
//             where: {
//                 id: addressId,
//                 userId: userId
//             }
//         });

//         if (!existingAddress) {
//             return ApiResponseBuilder.error(traceId, '地址不存在或无权限操作', 404);
//         }

//         // 更新地址
//         const result = await prisma.$transaction(async (tx) => {
//             // 如果设置为默认地址，先取消其他默认地址
//             if (updateData.isDefault) {
//                 await tx.address.updateMany({
//                     where: {
//                         userId,
//                         isDefault: true,
//                         id: { not: addressId }
//                     },
//                     data: {
//                         isDefault: false
//                     }
//                 });
//             }

//             // 更新地址信息
//             const updatedAddress = await tx.address.update({
//                 where: { id: addressId },
//                 data: updateData
//             });

//             return updatedAddress;
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
//         }, '地址更新成功');

//     } catch (error: any) {
//         console.error(`[${traceId}] 更新地址失败:`, error);
//         return ApiResponseBuilder.error(traceId, error.message || '更新地址失败', 500);
//     }
// }

// // DELETE - 删除地址
// export async function DELETE(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     const traceId = request.headers.get('X-Trace-ID') || 'unknown';

//     try {
//         // 验证用户身份
//         const authResult = await getVerifiedToken(request, UserRole.USER);
//         const userId = authResult.userId;
//         const addressId = parseInt((await params).id);

//         if (isNaN(addressId)) {
//             return ApiResponseBuilder.error(traceId, '无效的地址ID', 400);
//         }

//         // 验证地址是否属于当前用户
//         const existingAddress = await prisma.address.findFirst({
//             where: {
//                 id: addressId,
//                 userId: userId
//             }
//         });

//         if (!existingAddress) {
//             return ApiResponseBuilder.error(traceId, '地址不存在或无权限操作', 404);
//         }

//         // 删除地址
//         await prisma.$transaction(async (tx) => {
//             // 删除地址
//             await tx.address.delete({
//                 where: { id: addressId }
//             });

//             // 如果删除的是默认地址，需要设置新的默认地址
//             if (existingAddress.isDefault) {
//                 const firstAddress = await tx.address.findFirst({
//                     where: { userId },
//                     orderBy: { id: 'asc' }
//                 });

//                 if (firstAddress) {
//                     await tx.address.update({
//                         where: { id: firstAddress.id },
//                         data: { isDefault: true }
//                     });
//                 }
//             }
//         });

//         return ApiResponseBuilder.success(traceId, {
//             deletedAddressId: addressId
//         }, '地址删除成功');

//     } catch (error: any) {
//         console.error(`[${traceId}] 删除地址失败:`, error);
//         return ApiResponseBuilder.error(traceId, error.message || '删除地址失败', 500);
//     }
// }

// // GET - 获取单个地址详情
// export async function GET(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     const traceId = request.headers.get('X-Trace-ID') || 'unknown';

//     try {
//         // 验证用户身份
//         const authResult = await getVerifiedToken(request, UserRole.USER);
//         const userId = authResult.userId;
//         const addressId = parseInt((await params).id);

//         if (isNaN(addressId)) {
//             return ApiResponseBuilder.error(traceId, '无效的地址ID', 400);
//         }

//         // 查询地址详情
//         const address = await prisma.address.findFirst({
//             where: {
//                 id: addressId,
//                 userId: userId
//             }
//         });

//         if (!address) {
//             return ApiResponseBuilder.error(traceId, '地址不存在或无权限查看', 404);
//         }

//         return ApiResponseBuilder.success(traceId, {
//             id: address.id,
//             name: address.name,
//             phone: address.phone,
//             province: address.province,
//             city: address.city,
//             area: address.area,
//             address: address.address,
//             fullAddress: `${address.province}${address.city}${address.area}${address.address}`,
//             isDefault: address.isDefault,
//             latitude: address.latitude,
//             longitude: address.longitude
//         });

//     } catch (error: any) {
//         console.error(`[${traceId}] 获取地址详情失败:`, error);
//         return ApiResponseBuilder.error(traceId, error.message || '获取地址详情失败', 500);
//     }
// }