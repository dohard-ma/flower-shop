import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import getContext from '@/lib/get-context';
import { generateDisplayId, IdType } from '@/lib/id-generator';

const syncSchema = z.object({
  jsonList: z.array(z.string()),
  channels: z.array(z.string()), // 需要广播价格的渠道
});

// 促销词汇列表 (同步 process_data.js 中的逻辑)
const PROMOTIONS = ['送老婆', '送女友', '表白神器', '送朋友', '送男友', '接机花束', '送闺蜜', '送妈妈', '送恋人', '送爱人', '送什么', '爱人', '送男士', '送客户', '送长辈', '送老师', '送花上门'];

function cleanTitle(name: string) {
  if (!name) return '';
  let cleanName = name;
  cleanName = cleanName.replace(/【.*?】/g, '');
  PROMOTIONS.forEach(promo => {
    cleanName = cleanName.split(promo).join('');
  });
  cleanName = cleanName.replace(/^[,，\s]+/, '').trim();
  return cleanName;
}

export async function POST(request: NextRequest) {
  const { traceId, storeId } = getContext(request);
  if (!storeId) return ApiResponseBuilder.error(traceId, '未找到店铺上下文', 400);

  try {
    const body = await request.json();
    const validation = syncSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseBuilder.error(traceId, '数据校验失败', 400);
    }

    const { jsonList, channels: broadcastChannels } = validation.data;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return ApiResponseBuilder.error(traceId, '店铺不存在', 404);

    let updatedStockCount = 0;
    let updatedPriceCount = 0;
    let newProductCount = 0;

    // 解析所有 JSON 块并合并商品列表
    // 重要: jsonList 的顺序由前端上传顺序决定 (如: 1.json, 2.json, 3.json)
    // 合并后的 allMeituanProducts 会保持这个顺序:
    //   - 第1个文件的所有商品排在前面
    //   - 第2个文件的所有商品排在中间
    //   - 第3个文件的所有商品排在最后
    // 每个文件内部的商品顺序也会保持美团返回的顺序
    let allMeituanProducts: any[] = [];
    let meituanTagList: any[] = [];

    for (const jsonStr of jsonList) {
      try {
        const json = JSON.parse(jsonStr);
        let products = [];
        if (Array.isArray(json)) {
          products = json;
        } else if (json.data && Array.isArray(json.data.productList)) {
          products = json.data.productList;
          if (json.data.tagList) meituanTagList = [...meituanTagList, ...json.data.tagList];
        } else if (json.productList && Array.isArray(json.productList)) {
          products = json.productList;
          if (json.tagList) meituanTagList = [...meituanTagList, ...json.tagList];
        }
        // 按顺序追加到总列表,保持文件顺序
        allMeituanProducts = [...allMeituanProducts, ...products];
      } catch (e) {
        console.error('JSON 解析失败', e);
      }
    }

    // 处理分类 (保持排序)
    // 去重分类名
    const uniqueTagNames = Array.from(new Set(meituanTagList.map(tag => tag.name).filter(Boolean)));
    for (let i = 0; i < uniqueTagNames.length; i++) {
        const tagName = uniqueTagNames[i] as string;
        await prisma.storeCategory.upsert({
            where: { storeId_name: { storeId, name: tagName } },
            create: { storeId, name: tagName, sortOrder: i },
            update: { sortOrder: i }
        });
    }

    // 开始执行同步
    // sortOrder 逻辑说明:
    //   - i 是商品在 allMeituanProducts 数组中的索引 (0, 1, 2, ...)
    //   - 由于数组按文件顺序合并,所以:
    //     * 1.json 的商品: sortOrder = 0~19 (假设每页20个)
    //     * 2.json 的商品: sortOrder = 20~39
    //     * 3.json 的商品: sortOrder = 40~59
    //   - 前端查询时使用 ORDER BY sortOrder ASC,所以会按这个顺序显示
    //   - 这样就实现了:第1页商品排最前,第2页商品排中间,第3页商品排最后
    for (let i = 0; i < allMeituanProducts.length; i++) {
      const mtProduct = allMeituanProducts[i];
      const skus = mtProduct.wmProductSkus || [];
      if (skus.length === 0) continue;

      // 遍历 SKU，每个 SKU 对应一个 ProductVariant
      for (const mtSku of skus) {
        const storeCode = mtSku.sourceFoodCode;
        if (!storeCode) continue;

        // 查找现有的 Variant
        const existingVariant = await prisma.productVariant.findFirst({
          where: { storeCode, product: { storeId } },
          include: { product: true }
        });

        if (existingVariant) {
          // --- 更新逻辑 ---
          const channelData: any = existingVariant.channelData || {};
          
          // 更新美团数据
          channelData.meituan = {
            price: mtSku.price,
            discount_price: mtSku.discountPrice,
            externalId: mtSku.id?.toString(),
            updatedAt: new Date().toISOString()
          };

          // 价格广播
          let priceUpdated = false;
          for (const channelCode of broadcastChannels) {
            if (channelCode === 'meituan') continue; // 美团已经在上面更新了
            
            // 更新对应渠道的 channelData
            if (!channelData[channelCode]) channelData[channelCode] = {};
            channelData[channelCode].price = mtSku.price;
            priceUpdated = true;

            // 同时更新 ProductChannel 表中的展示价格
            const channel = await prisma.channel.findUnique({
              where: { storeId_code: { storeId, code: channelCode } }
            });
            if (channel) {
              await prisma.productChannel.upsert({
                where: { productId_channelId: { productId: existingVariant.productId, channelId: channel.id } },
                create: { 
                  productId: existingVariant.productId, 
                  channelId: channel.id, 
                  price: mtSku.price,
                  isListed: true 
                },
                update: { price: mtSku.price }
              });
            }
          }

          await prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              stock: mtSku.stock,
              channelData: channelData,
              // 如果广播了价格，也更新主变体的基准价 (选第一个 SKU 价格作为参考)
              price: priceUpdated ? mtSku.price : undefined
            }
          });

          // 处理分类更新
          const meituanCategories = (mtProduct.tagList || []).map((t: any) => t.name).filter(Boolean);
          if (mtProduct.tagName) meituanCategories.push(mtProduct.tagName);
          const uniqueMeituanCats = Array.from(new Set(meituanCategories));

          const matchedCategories = await prisma.storeCategory.findMany({
            where: { storeId, name: { in: uniqueMeituanCats as string[] } }
          });

          // 先删除旧的分类关联,再创建新的
          await prisma.categoryOnProduct.deleteMany({
            where: { productId: existingVariant.productId }
          });

          if (matchedCategories.length > 0) {
            await prisma.categoryOnProduct.createMany({
              data: matchedCategories.map(cat => ({
                productId: existingVariant.productId,
                categoryId: cat.id
              }))
            });
          }

          // 更新 SPU 的基本信息和排序
          await prisma.product.update({
            where: { id: existingVariant.productId },
            data: { 
              sortOrder: i,
              name: mtProduct.name, // 使用美团原始标题,不清理
              images: mtProduct.picture ? [mtProduct.picture] : existingVariant.product.images as any
            }
          });

          updatedStockCount++;
          if (priceUpdated) updatedPriceCount++;

        } else {
          // --- 新增逻辑 ---
          // 只有 Product 下的第一个 SKU 匹配不到时才创建 Product？
          // 美团结构是 1 Product : N SKUs。
          // 我们的逻辑是：如果这个 storeCode (SKU) 不存在，就要考虑是否需要新建 Product。
          // 为了简化，由于我们要支持“锚点匹配”，通常认为 storeCode 是唯一的。
          
          // 这里的策略是：如果没有 storeCode 对应的 Variant，则新建一个 SPU 并包含这个 Variant。
          // 如果多个 SKU 指向同一个 SPU (美团侧)，但在我们系统里都没有，会重复创建 SPU 吗？
          // 美团的一个 mtProduct 里有多个 SKU。我们应该以 mtProduct 级来判断。
          
          // 重新整理：检查该 mtProduct 的 ID 或第一个 SKU 的 storeCode。
          // 由于 storeCode 是锚点，我们暂时以 storeCode 为准新建。
          
          const displayId = await generateDisplayId(store.code, IdType.PRODUCT);
          
          // 处理分类关联
          const meituanCategories = (mtProduct.tagList || []).map((t: any) => t.name).filter(Boolean);
          if (mtProduct.tagName) meituanCategories.push(mtProduct.tagName);
          const uniqueMeituanCats = Array.from(new Set(meituanCategories));

          const matchedCategories = await prisma.storeCategory.findMany({
            where: { storeId, name: { in: uniqueMeituanCats as string[] } }
          });

          const newProduct = await prisma.product.create({
            data: {
              storeId,
              name: mtProduct.name, // 使用美团原始标题
              displayId,
              images: mtProduct.picture ? [mtProduct.picture] : [],
              materials: [], // 添加缺失的必填字段
              status: 'ACTIVE',
              sortOrder: i,
              categories: {
                create: matchedCategories.map(cat => ({ categoryId: cat.id }))
              },
              variants: {
                create: skus.map((sku: any, idx: number) => ({
                   name: sku.spec || '默认规格',
                   stock: sku.stock,
                   price: sku.price,
                   storeCode: sku.sourceFoodCode,
                   sortOrder: idx,
                   channelData: {
                     meituan: {
                       price: sku.price,
                       discount_price: sku.discountPrice,
                       externalId: sku.id?.toString()
                     }
                   }
                }))
              }
            }
          });

          // 如果勾选了广播，也要为新商品创建其他渠道的展示记录
          for (const channelCode of broadcastChannels) {
            if (channelCode === 'meituan') {
                // 美团渠道关联
                const mtChannel = await prisma.channel.findUnique({ where: { storeId_code: { storeId, code: 'meituan' } } });
                if (mtChannel) {
                    await prisma.productChannel.create({
                        data: {
                            productId: newProduct.id,
                            channelId: mtChannel.id,
                            price: mtProduct.wmProductSkus[0].price,
                            isListed: true,
                            externalId: mtProduct.id?.toString()
                        }
                    });
                }
                continue;
            };

            const channel = await prisma.channel.findUnique({
              where: { storeId_code: { storeId, code: channelCode } }
            });
            if (channel) {
                await prisma.productChannel.create({
                  data: {
                    productId: newProduct.id,
                    channelId: channel.id,
                    price: mtProduct.wmProductSkus[0].price,
                    isListed: true
                  }
                });
                
                // 同时也要更新刚才新建的 Variant 的 channelData (目前 Variant 更新逻辑已包含在 create 中)
                // 这里可能需要对刚建出的 Variants 进行二次更新添加广播渠道的数据，或者在 create 时就注入。
                // 为了简单，我们只对美团数据做 Variant 级的 channelData，后续变体如果需要跨渠道也可以在这里处理。
            }
          }

          newProductCount++;
          // 停止处理这个 mtProduct 的其他 SKU，因为已经在 create 里处理完了
          break; 
        }
      }
    }

    return ApiResponseBuilder.success(traceId, {
      updatedStockCount,
      updatedPriceCount,
      newProductCount
    }, '数据同步完成');

  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '同步失败: ' + (error.message || '未知错误'), 500);
  }
}
