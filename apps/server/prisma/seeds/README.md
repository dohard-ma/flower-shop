# 种子数据脚本

本目录包含了千里挑一项目的所有种子数据脚本，用于初始化数据库数据。

## 📁 文件结构

```
seeds/
├── index.mjs                    # 主种子脚本（运行所有种子）
├── user.seed.mjs               # 用户数据种子
├── order.seed.mjs              # 订单数据种子
├── notification.seed.mjs       # 通知系统种子
├── product.seed.mjs            # 商品数据种子
├── solar-term.seed.mjs         # 节气数据种子
├── subscription-product.seed.mjs # 订阅商品种子
├── .eslintrc.json              # ESLint配置
└── README.md                   # 本文档
```

## 🚀 快速开始

### 运行所有种子数据

```bash
# 在 apps/server 目录下运行
pnpm prisma:seed:all
```

### 运行单个种子脚本

```bash
# 用户数据
pnpm prisma:seed:user

# 订单数据
pnpm prisma:seed:order

# 通知系统数据
pnpm prisma:seed:notification

# 商品数据
pnpm prisma:seed:product

# 节气数据
pnpm prisma:seed:solar-term

# 订阅商品数据
pnpm prisma:seed:subscription-product
```

## 📋 种子数据详情

### 通知系统种子 (notification.seed.mjs)

创建完整的微信订阅消息通知系统数据：

#### 📧 通知模板 (3个)

1. **订单状态变更通知** (`UXitKzFcB8zlW6Q_cHN2YZRwmYYmpRXSujjkF0gvKfQ`)
   - 用于：支付成功、礼物领取、发货确认、退款等场景
   - 字段：订单号、项目名称、订单状态、温馨提示、更新时间

2. **订单发货通知** (`PTnCLoWbKXu6iFMDebEYFb6d3iHlMKvtgCkm1t2qAwQ`)
   - 用于：商品发货时通知收货人
   - 字段：订单编号、商品信息、快递公司、快递单号、预计送达时间

3. **促销优惠通知** (`Yy-6b5Xn4ahLRxSugcJqJ7Xetevo6q10HqakVIiog6k`)
   - 用于：优惠券发放、权限提醒等场景
   - 字段：活动名称、活动说明、开始时间、结束时间

#### 🎯 通知场景 (8个)

- `PAYMENT_SUCCESS` - 支付成功通知
- `GIFT_RECEIVED` - 礼物领取成功通知
- `ORDER_SHIPPED` - 订单发货通知
- `DELIVERY_PLAN_CONFIRMED` - 发货计划确认通知
- `GIFT_TIMEOUT` - 礼物超时通知
- `PERMISSION_REMINDER` - 权限不足提醒
- `REFUND_PROCESSED` - 退款处理通知
- `COUPON_GRANTED` - 优惠券发放通知

#### ⚙️ 权限收集配置 (6个)

- `purchase` - 购买时权限收集（主动，3个权限）
- `payment_success` - 支付成功权限收集（主动，2个权限）
- `address_confirm` - 地址确认权限收集（静默，1个权限）
- `order_detail` - 查看详情权限收集（静默，1个权限）
- `gift_receive` - 收礼时权限收集（主动，2个权限）
- `app_launch` - 启动小程序权限收集（静默，1个权限）

#### 📊 示例数据

- 为前3个用户创建权限记录
- 生成发送记录和消息日志
- 更新用户订阅状态

### 订单系统种子 (order.seed.mjs)

创建完整的订单系统测试数据：

#### 📦 商品数据 (4个)

- 精美礼盒装（普通商品）
- 限量周边商品（普通商品）
- 节气茶叶年卡（订阅商品，24次配送）
- 月度美食订阅（订阅商品，12次配送）

#### 🛒 订单数据 (4个)

1. 单个普通商品订单（已完成）
2. 单个订阅商品订单（赠送他人）
3. 多个普通商品订单（已支付）
4. 多个订阅商品订单（已支付）

#### 📍 地址数据

- 为每个用户创建默认地址

#### 🎫 优惠券数据

- 新用户专享券
- 满减优惠券

#### 🚚 发货计划

- 订阅商品发货计划
- 普通商品发货计划

## ⚠️ 注意事项

1. **运行顺序**：建议按以下顺序运行种子脚本

   ```bash
   pnpm prisma:seed:user           # 先创建用户
   pnpm prisma:seed:product        # 创建商品
   pnpm prisma:seed:order          # 创建订单（依赖用户和商品）
   pnpm prisma:seed:notification   # 创建通知系统（依赖用户）
   ```

2. **数据清理**：每个种子脚本运行前会清理相关的现有数据

3. **环境变量**：确保 `.env.local` 文件中配置了正确的数据库连接信息

4. **依赖关系**：
   - 订单种子依赖用户数据
   - 通知种子依赖用户数据
   - 建议先运行用户种子

## 🔧 开发说明

### 添加新的种子脚本

1. 在 `seeds/` 目录下创建新的 `.mjs` 文件
2. 在 `package.json` 中添加对应的脚本命令
3. 在 `index.mjs` 中添加到 `seedFiles` 数组

### ESLint 配置

种子文件使用独立的 ESLint 配置（`.eslintrc.json`），避免 Next.js 相关的解析错误。

### 调试

如果种子脚本运行失败，可以单独运行查看详细错误信息：

```bash
cd apps/server
node prisma/seeds/notification.seed.mjs
```

## 📈 数据统计

运行完所有种子脚本后，数据库将包含：

- 👥 用户数据：根据用户种子脚本
- 📦 商品数据：4个商品（2个普通 + 2个订阅）
- 🛒 订单数据：4个订单 + 相关订单项
- 📧 通知模板：3个微信模板
- 🎯 通知场景：8个业务场景
- ⚙️ 权限配置：6个收集策略
- 🔑 权限记录：用户权限池数据
- 📤 发送记录：通知发送日志
- 💬 消息日志：微信消息记录

这些数据为开发和测试提供了完整的业务场景支持。
