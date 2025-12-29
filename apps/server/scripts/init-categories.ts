// 运行命令: npx ts-node scripts/init-categories.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 你的美团分类列表 (保持原序，用于设置 sortOrder)
const CATEGORIES_LIST = [
  "热卖爆款【推荐】",
  "生日鲜花【祝贺】",
  "老婆恋人【浪漫】",
  "男士花束【专属】",
  "长辈领导【暖心】",
  "前程似锦【毕业】",
  "盲盒不撞款不纠结",
  "手提花篮【礼盒】",
  "童心未泯【六一】",
  "高级布置",
  "婚庆用花",
  "开业花篮/桌花",
  "祭祀鲜花【缅怀】",
  "礼品/包装",
  "绿植盆栽",
  "仿真花/永生花",
  "花瓶/花器"
];

async function main() {
  console.log('🚀 [董事会] 开始初始化中心分类库...');

  // 1. 获取店铺 ID
  const store = await prisma.store.findFirst();
  if (!store) {
    throw new Error('❌ 错误：数据库中没有店铺(Store)。请先创建一个店铺。');
  }
  console.log(`🏠 目标店铺: ${store.name}`);

  let createdCount = 0;
  let updatedCount = 0;

  // 2. 遍历并执行 Upsert (有则更新排序，无则创建)
  for (let i = 0; i < CATEGORIES_LIST.length; i++) {
    const categoryName = CATEGORIES_LIST[i];
    // 使用 index 作为排序权重 (0, 10, 20...) 方便后续中间插入
    const sortOrder = i * 10; 

    // 核心逻辑：Upsert
    // 即使你反复运行这个脚本，也不会产生重复数据，只会更新排序
    const result = await prisma.storeCategory.upsert({
      where: {
        storeId_name: {
          storeId: store.id,
          name: categoryName // 以名称为唯一锚点
        }
      },
      update: {
        sortOrder: sortOrder, // 如果分类已存在，强制更新排序，确保持续一致
        isVisible: true       // 确保是可见的
      },
      create: {
        storeId: store.id,
        name: categoryName,
        sortOrder: sortOrder,
        isVisible: true
      }
    });

    //简单的计数逻辑，判断是新建还是更新（通过 createdAt 时间判断）
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      createdCount++;
    } else {
      updatedCount++;
    }
    
    console.log(`   ✅ [${i + 1}/${CATEGORIES_LIST.length}] 处理: ${categoryName}`);
  }

  console.log(`
  📊 执行报告:
  -----------------------------------
  ✨ 新增分类: ${createdCount}
  🔄 更新排序: ${updatedCount}
  -----------------------------------
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });