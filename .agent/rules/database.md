---
trigger: model_decision
description: 一人公司电商系统的核心数据架构、SPU/SKU 定义及读写分离协议
---

# Flower Shop - 核心数据架构文档 (V1.0)

## 1. 架构哲学 (Architecture Philosophy)

本系统设计遵循以下三大核心原则，旨在平衡“一人公司”的维护成本与用户体验：

1. **中心驱动 (Center-First)**：
* 所有数据以中心数据库（MySQL）为“真相源 (SSOT)”。
* 外部平台（美团、抖音）被视为“分发渠道”或“数据矿山”，而非主控端。


2. **SPU-SKU 分离 (SPU-SKU Separation)**：
* **SPU (Product)**：管理“商品心智”（如：韩式碎冰蓝），承载图片、描述、分类。
* **SKU (ProductVariant)**：管理“交易物理”（如：19枝/33枝），承载库存、成本、店内码。


3. **读写分离 (Read-Write Separation)**：
* **写（复杂）**：把美团同步、多规格比价等复杂逻辑留在后台脚本和数据库写入阶段。
* **读（极速）**：前端（小程序）读取时，只读“缓存”好的结果，不做计算。



---

## 2. 核心模型图解 (Core Models)

### 🟢 Product (SPU - 商品集)

> **定位**：商品的“面子”。管理所有公共信息。

* `id`: 系统内码 (CUID)
* `displayId`: 员工/前端可见的短号
* `name`: 商品名称 (如 "韩式碎冰蓝")
* `images`: 主图列表 (JSON)
* `materials`: 花材配方 (JSON)
* `status`: SPU 级总开关 (ACTIVE/INACTIVE)

### 🔴 ProductVariant (SKU - 规格/库存)

> **定位**：商品的“里子”。管理库存和成交。

* `storeCode`: **核心锚点**。对应美团/饿了么的“店内码”或 `source_food_code`。**同步脚本靠它识别商品。**
* `name`: 规格名 (如 "19枝", "标准款")
* `stock`: 物理库存 (SSOT)
* `price`: 内部指导价/成交基准价
* `channelData`: **渠道差异化数据 (JSON)**。存储美团特有的价格、外部ID等。

### 🟡 ProductChannel (渠道映射/价格缓存)

> **定位**：连接器与加速器。**这是给小程序列表页专门设计的“快取层”。**

* `channelId`: 对应 Channels 表 (如 "wechat_mini")
* `isListed`: 上下架开关。控制该商品是否在该渠道可见。
* `price`: **展示起售价 (Cache)**。脚本在写入 SKU 时，自动计算该商品最低价并填入此字段。
* `externalId`: 渠道端的 SPU ID (用于反向链接或更新)。

---

## 3. 开发逻辑规范 (Developer SOP)

### 🚀 场景一：微信小程序 - 商品列表页 (极速查询)

**目标**：用户滑动列表时，必须丝般顺滑，瞬间显示“￥199 起”。

**❌ 错误做法 (Anti-Pattern)**：
查询 `Product` -> `include Variants` -> 遍历 Variant 数组 -> 算出最小值 -> 返回前端。
*后果：数据库压力大，接口响应慢，流量大时会卡顿。*

**✅ 正确做法 (Best Practice)**：
直接读取 `ProductChannel` 表中的 `price` 字段。我们利用“空间换时间”，在写入时就已经算好了。

```typescript
// Prisma Query 示例
const products = await prisma.product.findMany({
  where: {
    // 1. 筛选上架状态
    channels: { 
      some: { 
        channel: { code: 'wechat_mini' }, // 锁定微信渠道
        isListed: true 
      } 
    }
  },
  select: {
    id: true,
    name: true,
    images: true,
    // 2. 直接拿“展示价”，零计算
    channels: {
      where: { channel: { code: 'wechat_mini' } },
      select: { price: true }
    }
  }
});

```

### 🛒 场景二：微信小程序 - 商品详情页/下单 (精准交易)

**目标**：用户选择规格，显示准确价格和库存。

**逻辑**：
此时需要查 `ProductVariant` 表。

1. **展示**：遍历 `variants`，渲染“19枝”、“33枝”按钮。
2. **价格**：点击按钮时，显示该 Variant 的 `price`。
3. **下单**：创建订单时，锁定的是 `ProductVariant.id`，扣减的是 `ProductVariant.stock`。

### 🔄 场景三：美团数据同步脚本 (双层更新)

**目标**：将外部数据清洗并入库。

**SOP 步骤**：

1. **锚点匹配**：读取美团数据的 `skus`，通过 `box_code` (店内码) 在 `ProductVariant` 表中查找。
2. **写入 Variant (里子)**：
* 更新物理库存 `stock`。
* 将美团的成交价、外部 ID 写入 `channelData` (JSON)。


3. **计算并广播 (面子)**：
* 在内存中计算该商品所有 SKU 的**最低价格 (Min Price)**。
* 将这个最低价更新到 `ProductChannel` 表的 `price` 字段（对应美团渠道和微信渠道）。
* *注：这就是“写入时广播”策略，确保列表页永远能读到最新的起售价。*



---

## 4. 数据库性能与扩展性建议

1. **索引 (Indexes)**：
* `ProductVariant.storeCode` 必须加索引（已加）。这是同步脚本最高频查询的字段。
* `ProductChannel.isListed` 配合 `channelId` 的复合索引能加速列表页筛选。


2. **JSON 字段的使用约束**：
* **读**：`channelData` (JSON) 适合存“只读不查”的数据（如美团的活动标签、外部ID）。
* **查**：不要尝试用 SQL 去 `WHERE channelData->'$.meituan.price' > 100`。如果有这种需求，说明该字段应该升级为物理列。


3. **图片处理**：
* 目前 `images` 存的是 JSON 字符串列表。建议前端组件封装好“懒加载”和“缩略图”逻辑，不要直接加载原图，保持小程序流畅。



---

**Virtual Board Note:**
这份文档是你技术资产的核心。当你下次让 AI (Cursor) 帮你写“购物车功能”或“美团库存回回落脚本”时，**请务必先把这段文档发给它**。它会立刻理解你的架构意图，写出符合规范的代码。