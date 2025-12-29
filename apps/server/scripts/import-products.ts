
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// 数据文件路径
const DATA_FILE_PATH = path.join(__dirname, "../../../商品数据/all_products.js");

async function main() {
  console.log("🚀 开始导入商品数据...");

  // 1. 读取并解析数据文件
  // 由于文件是 JS 格式且包含 const productData = [...]，我们通过读取字符串并提取 JSON 部分来处理
  let fileContent = fs.readFileSync(DATA_FILE_PATH, "utf-8");
  
  // 提取数组部分
  const startIndex = fileContent.indexOf("[");
  const endIndex = fileContent.lastIndexOf("]");
  
  if (startIndex === -1 || endIndex === -1) {
    console.error("❌ 无法在文件中找到有效的数据数组");
    return;
  }

  const jsonContent = fileContent.substring(startIndex, endIndex + 1);
  let products: any[] = [];
  try {
    // 简单清洗：有些字段可能包含不规范的换行或字符，尝试直接解析
    // 如果解析失败，可能需要更复杂的正则清洗
    products = JSON.parse(jsonContent);
  } catch (error) {
    console.warn("⚠️ JSON 直接解析失败，尝试使用 eval (仅限本地脚本)...");
    try {
        // 使用 Function 构造器模拟 eval 以安全运行 JS 字面量
        products = new Function(`return ${jsonContent}`)();
    } catch (evalError) {
        console.error("❌ 无法解析数据内容:", evalError);
        return;
    }
  }

  console.log(`📦 发现 ${products.length} 个原始商品记录`);

  // 2. 获取基础配置
  const store = await prisma.store.findFirst();
  if (!store) {
    console.error("❌ 数据库中未发现店铺 (Store)，请先创建店铺");
    return;
  }
  
  const meituanChannel = await prisma.channel.findFirst({
    where: { code: "meituan" }
  });
  if (!meituanChannel) {
    console.warn("⚠️ 未发现美团渠道 (Channel)，将尝试自动创建...");
    // 自动创建美团渠道（如果不存在）
    /* 
    const newChannel = await prisma.channel.create({
        data: { storeId: store.id, code: "meituan", name: "美团点评" }
    });
    */
  }

  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // 3. 循环导入
  for (const item of products) {
    const { 
        original_name, 
        main_flower, 
        color_system, 
        style, 
        images, 
        categories, 
        skus, 
        source_food_code: spuSourceCode,
        sell_status // 0: 在售, 1: 下架
    } = item;

    // 状态转换逻辑
    const productStatus = sell_status === 1 ? "INACTIVE" : "ACTIVE";
    const isListed = sell_status === 0;

    try {
      // 检查 SKU 是否已存在（核心去重逻辑）
      const skuCodes = skus.map((s: any) => s.source_food_code).filter(Boolean);
      const existingVariants = await prisma.productVariant.findMany({
        where: { storeCode: { in: skuCodes } },
        include: { product: { include: { channels: true } } }
      });

      if (existingVariants.length > 0) {
        // 如果已存在，则进入“状态更新模式”
        const productId = existingVariants[0].productId;
        
        await prisma.product.update({
          where: { id: productId },
          data: {
            status: productStatus,
            channels: meituanChannel ? {
              updateMany: {
                where: { channelId: meituanChannel.id },
                data: { isListed: isListed }
              }
            } : undefined
          }
        });

        console.log(`🔄 已更新状态 [${original_name}]: ${productStatus}`);
        skippedCount++; // 依然记为跳过新建，但状态已更新
        continue;
      }

      // 获取或创建款式 (ProductStyle)
      // ... (中间代码保持不变)
      let styleId: string | undefined;
      if (style) {
        const styles = await prisma.productStyle.findMany({ where: { storeId: store.id, name: style } });
        let styleObj = styles[0];
        if (!styleObj) {
            styleObj = await prisma.productStyle.create({ data: { storeId: store.id, name: style } });
        }
        styleId = styleObj.id;
      }

      // 获取或创建分类 (StoreCategory)
      const categoryNames = categories ? categories.split(/[,，]/) : ["未分类"];
      const categoryIds: string[] = [];
      for (const catName of categoryNames) {
        if (!catName.trim()) continue;
        const category = await prisma.storeCategory.upsert({
            where: { storeId_name: { storeId: store.id, name: catName.trim() } },
            update: {},
            create: { storeId: store.id, name: catName.trim() }
        });
        categoryIds.push(category.id);
      }

      // 创建商品 (Product)
      const displayId = `P${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;

      const product = await prisma.product.create({
        data: {
          storeId: store.id,
          displayId,
          name: original_name,
          mainFlower: main_flower || null,
          colorSeries: color_system || null,
          materials: {}, 
          images: typeof images === 'string' ? [images] : (Array.isArray(images) ? images : []),
          styleId: styleId || null,
          status: productStatus, // 使用解析后的状态
          // 关联分类
          categories: {
            create: categoryIds.map(id => ({ categoryId: id }))
          },
          // 关联渠道
          channels: meituanChannel ? {
            create: {
                channelId: meituanChannel.id,
                externalId: String(spuSourceCode || skuCodes[0]),
                price: skus[0]?.price || 0,
                isListed: isListed, // 使用解析后的上架状态
                syncStatus: "SYNCED",
                lastSyncAt: new Date()
            }
          } : undefined,
          // 创建规格
          variants: {
            create: skus.map((sku: any) => ({
                name: sku.spec || "默认规格",
                storeCode: String(sku.source_food_code),
                price: sku.price || 0,
                costPrice: sku.discount_price > 0 ? sku.discount_price : 0,
                stock: sku.stock || 99,
                isActive: true
            }))
          }
        }
      });

      console.log(`✅ 已导入: ${original_name} (ID: ${product.id})`);
      importedCount++;
    } catch (err) {
      console.error(`❌ 导入失败 [${original_name}]:`, err);
      errorCount++;
    }
  }

  console.log(`\n🏁 导入任务完成!`);
  console.log(`📊 统计报告:`);
  console.log(`   - 成功导入: ${importedCount}`);
  console.log(`   - 跳过已存在: ${skippedCount}`);
  console.log(`   - 失败记录: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
