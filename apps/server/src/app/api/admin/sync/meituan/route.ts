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

    // 1. 解析所有 JSON 块并合并商品 (带去重和分类合并逻辑)
    const productMap = new Map<string, any>();
    const meituanTagList: any[] = [];

    for (const jsonStr of jsonList) {
      try {
        const json = JSON.parse(jsonStr);
        let products = [];
        if (Array.isArray(json)) {
          products = json;
        } else if (json.data && Array.isArray(json.data.productList)) {
          products = json.data.productList;
          if (json.data.tagList) meituanTagList.push(...json.data.tagList);
        } else if (json.productList && Array.isArray(json.productList)) {
          products = json.productList;
          if (json.tagList) meituanTagList.push(...json.tagList);
        }

        // 预处理：按 sourceFoodCode 去重并合并分类
        for (const mtProduct of products) {
          const skus = mtProduct.wmProductSkus || [];
          if (skus.length === 0) continue;

          // 核心逻辑：以第一个 SKU 的 sourceFoodCode 作为该 SPU 的唯一标识（锚点）
          const mainSkuCode = skus[0].sourceFoodCode;
          if (!mainSkuCode) continue;

          // 提取当前商品的分类标签
          const currentTags = new Set<string>();
          if (mtProduct.tagList) mtProduct.tagList.forEach((t: any) => t.name && currentTags.add(t.name));
          if (mtProduct.tagName) currentTags.add(mtProduct.tagName);

          if (productMap.has(mainSkuCode)) {
            // 如果已存在，合并分类
            const existing = productMap.get(mainSkuCode);
            currentTags.forEach(tag => existing._allCategories.add(tag));
          } else {
            // 如果是新商品，初始化
            mtProduct._allCategories = currentTags;
            mtProduct._processIndex = productMap.size; // 记录原始出现顺序
            productMap.set(mainSkuCode, mtProduct);
          }
        }
      } catch (e) {
        console.error('JSON 解析失败', e);
      }
    }

    // 2. 处理分类元数据 (保持排序)
    const uniqueTagNames = Array.from(new Set(meituanTagList.map(tag => tag.name).filter(Boolean)));
    for (let i = 0; i < uniqueTagNames.length; i++) {
        const tagName = uniqueTagNames[i] as string;
        await prisma.storeCategory.upsert({
            where: { storeId_name: { storeId, name: tagName } },
            create: { storeId, name: tagName, sortOrder: i },
            update: { sortOrder: i }
        });
    }

    // 3. 开始执行同步 (遍历去重后的商品)
    const sortedUniqueProducts = Array.from(productMap.values()).sort((a, b) => a._processIndex - b._processIndex);

    for (const mtProduct of sortedUniqueProducts) {
      const skus = mtProduct.wmProductSkus || [];
      const mainSku = skus[0];
      const mainSkuCode = mainSku.sourceFoodCode;

      // 查找现有的 Variant (SPU 级)
      const existingVariant = await prisma.productVariant.findFirst({
        where: { storeCode: mainSkuCode, product: { storeId } },
        include: { product: true }
      });

      if (existingVariant) {
        // --- 更新已有商品 ---
        const channelData: any = existingVariant.channelData || {};
        channelData.meituan = {
          price: mainSku.price,
          discount_price: mainSku.discountPrice,
          externalId: mainSku.id?.toString(),
          updatedAt: new Date().toISOString()
        };

        let priceUpdated = false;
        for (const channelCode of broadcastChannels) {
          if (channelCode === 'meituan') continue;
          if (!channelData[channelCode]) channelData[channelCode] = {};
          channelData[channelCode].price = mainSku.price;
          priceUpdated = true;

          const channel = await prisma.channel.findUnique({
            where: { storeId_code: { storeId, code: channelCode } }
          });
          if (channel) {
            await prisma.productChannel.upsert({
              where: { productId_channelId: { productId: existingVariant.productId, channelId: channel.id } },
              create: { productId: existingVariant.productId, channelId: channel.id, price: mainSku.price, isListed: true },
              update: { price: mainSku.price }
            });
          }
        }

        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            stock: mainSku.stock,
            channelData: channelData,
            price: priceUpdated ? mainSku.price : undefined
          }
        });

        // 重点：分类更新 (合并多来源分类)
        const combinedCategories = Array.from(mtProduct._allCategories as Set<string>);
        const matchedCategories = await prisma.storeCategory.findMany({
          where: { storeId, name: { in: combinedCategories } }
        });

        // 全量同步分类关联
        await prisma.categoryOnProduct.deleteMany({ where: { productId: existingVariant.productId } });
        if (matchedCategories.length > 0) {
          await prisma.categoryOnProduct.createMany({
            data: matchedCategories.map(cat => ({ productId: existingVariant.productId, categoryId: cat.id }))
          });
        }

        await prisma.product.update({
          where: { id: existingVariant.productId },
          data: { 
            sortOrder: mtProduct._processIndex,
            name: mtProduct.name,
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
        
        // 分类关联 (使用合并后的分类)
        const combinedCategories = Array.from(mtProduct._allCategories as Set<string>);
        const matchedCategories = await prisma.storeCategory.findMany({
          where: { storeId, name: { in: combinedCategories } }
        });

        const newProduct = await prisma.product.create({
          data: {
            storeId,
            name: mtProduct.name, // 使用美团原始标题
            displayId,
            images: mtProduct.picture ? [mtProduct.picture] : [],
            materials: [], // 添加缺失的必填字段
            status: 'ACTIVE',
            sortOrder: mtProduct._processIndex,
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
                          price: mainSku.price,
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
                  price: mainSku.price,
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
