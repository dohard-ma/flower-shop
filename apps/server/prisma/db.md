# 数据库设计

## 1. 用户与会员相关

### 用户表：`user`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | bigint PK | 用户ID，唯一索引 |
| openid | varchar | 微信openid，唯一索引 |
| avatar | varchar | 头像 |
| nickname | varchar | 昵称 |
| name | varchar | 姓名（真实） |
| phone | varchar | 手机号 |
| gender | enum | 性别 0未知 1男 2女 |
| birthday | date | 生日 |

---

### 会员表：`user_membership`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_membership_id | bigint PK | 记录ID |
| user_id | bigint FK | 用户ID，普通索引。一对一，一个用户只能有一个会员 |
| vip_type | enum | 类型 VIP、SVIP |
| start_time | datetime | 开通时间 |
| end_time | datetime | 到期时间 |
| status | enum | 0-未开通 1-开通中 2-过期 |

### 地址表：`address`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| address_id | bigint PK | 地址ID |
| user_id | bigint FK | 用户ID，普通索引。一对多，一个用户可以有多个地址 |
| name | varchar | 收货人姓名 |
| phone | varchar | 收货人手机号 |
| address | varchar | 收货地址 |
| province | varchar | 省 |
| city | varchar | 市 |
| area | varchar | 区 |
| latitude | decimal(10,6) | 纬度 |
| longitude | decimal(10,6) | 经度 |
| is_default | boolean | 是否为默认地址 |

---

## 2. 商品与礼盒相关

### 商品表：`product`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| product_id | bigint PK | 商品ID |
| product_name | varchar | 商品名称 |
| product_type | enum | 类型 1-年卡 2-礼盒 3-周边 |
| price | decimal(10,2) | 售价 |
| stock | int | 库存 |
| cover_image | varchar | 商品封面图 |
| detail | text | 商品详情描述 |
| images | json | 商品详情图链接 |
| is_subscription | boolean | 是否订阅商品**（false-否 true-是） |
| max_deliveries | int | 最大发货次数 |
| delivery_type | enum | 交付类型: `once`（一次性）  `interval`（固定间隔）、`solar_term`（节气） |
| delivery_interval | int | 固定间隔值（7/14/30），只有 `interval` 类型时有效 |
| is_active | boolean | 是否上架 |

### 订阅商品表：`subscription_product`

> 订阅商品和商品的区别：
>
> 1. 商品有礼盒、订阅卡、周边等。
> 2. 订阅商品不单独售卖，只用于订阅卡类商品，如月卡、周卡、节气卡等商品的订阅。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| subscription_product_id | bigint PK | 订阅商品ID |
| stock | int | 库存 |
| cover_image | varchar | 商品封面图 |
| detail | text | 商品详情描述 |
| images | json | 商品详情图链接 |
| is_active | boolean | 是否上架 |

---

## 3. 电子封面DIY相关

### 电子封面表：`diy_cover`

> 简化实现，电子封面只支持背景图，不支持文字、贴纸。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| diy_cover_id | bigint PK | 封面ID |
| user_id | bigint FK | 创建人，关联 `user` 表。可以为空，则表示系统创建。一对多，一个用户可以创建多个封面 |
| background_image | varchar | 背景图地址 |

---

## 4. 订单系统相关

### 订单表：`order`

> 订单分为两种：
>
> 1. 商品订单：自己购买商品的订单。这种情况关联的是 `product` 表。
> 2. 订阅订单：订阅商品的订单。这种情况关联的是 `subscription_product` 表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order_id | bigint PK | 订单ID |
| order_no | varchar | 订单号，唯一索引 |
| user_id | bigint FK | 下单人。关联 `user` 表。一对多，一个用户可以有多个订单 |
| receiver_id | bigint FK | 接收人（自己买填自己，赠送填好友ID），可为空。关联 `user` 表。一对多，一个用户可以有多个订单 |
| product_id | bigint FK | 商品ID。关联 `product` 表。一对多，一个商品可以有多个订单 |
| subscription_order_id | bigint FK | 订阅主订单ID，关联 `subscription_order` 表。一对一，一个订阅主订单只关联一个订单 |
| product_name | varchar | 商品名称快照 |
| cover_id | bigint FK | 电子封面ID（可为空）。关联 `diy_cover` 表。一对多，一个封面可以有多个订单 |
| amount | decimal(10,2) | 金额 |
| user_coupon_id | bigint FK | 优惠券ID（可为空）。关联 `user_coupon` 表。一对一，一个用户优惠券只能使用一次 |
| pay_type | enum | 支付方式 1-微信 2-余额 |
| status | enum | 0-待支付 1-已支付 2-已赠送 3-已完成 4-已取消 |
| is_gift | boolean | false-自己购买 true-赠送他人 |
| paid_at | datetime | 支付时间 |
| is_subscription | boolean | 是否为订阅订单 |

### 订阅订单表：`subscription_order`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| subscription_order_id | bigint PK | 订阅主订单ID |
| order_id | bigint FK | 订单ID。关联 `order` 表。一对多，一个订单中，可能购买了多个订阅商品 |
| user_id | bigint FK | 用户ID。关联 `user` 表。一对多，一个用户可以有多个订阅主订单 |
| product_id | bigint FK | 商品ID。关联 `product` 表。一对多，一个商品可以有多个订阅主订单 |
| total_deliveries | int | 总发货次数 |
| delivered_count | int | 已发货次数 |
| delivery_type | enum | 交付类型: `interval`（固定间隔）、`solar_term`（节气） |
| delivery_interval | int | 固定间隔值（7/14/30），只有 `interval` 类型时有效 |
| status | enum | 0-待发货 1-已发货 2-已完成 3-已取消 |

### 发货计划表：`delivery_plan`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| delivery_plan_id | bigint PK | 发货计划ID |
| order_id | bigint FK | 订单ID。关联 `order` 表。一对多，订阅商品订单可以有多个发货计划，一个订单中可能购买了多个商品 |
| subscription_order_id | bigint FK | 订阅订单ID。关联 `subscription_order` 表。一对多，一个订阅订单可以有多个发货计划 |
| solar_term_id | bigint FK | 节气ID。关联 `solar_term` 表。一对多，一个节气可以有多个发货计划 |
| product_id | bigint FK | 商品ID。关联 `product` 表。一对多，一个商品可以有多个发货计划 |
| subscription_product_id | bigint FK | 订阅商品ID。关联 `subscription_product` 表。一对多，一个订阅商品可以有多个发货计划 |
| user_id | bigint FK | 下单人。关联 `user` 表。一对多，一个用户可以有多个发货计划 |
| receiver_id | bigint FK | 接收人（自己买填自己，赠送填好友ID），可为空。关联 `user` 表。一对多，一个用户可以有多个发货计划 |
| address_id | bigint FK | 地址ID。关联 `address` 表。一对多，一个地址可以有多个发货计划 |
| delivery_start_date | date | 计划发货起始日期 |
| delivery_end_date | date | 计划发货结束日期 |
| delivery_date | date | 实际发货日期 |
| express_company | varchar | 快递公司 |
| express_number | varchar | 快递单号 |
| status | enum | 0-待发货 1-已排期 2-已发货 3-已完成 4-已取消 |

---

## 5. 支付&余额&梵氧币

### 用户钱包表：`user_wallet`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_wallet_id | bigint PK | 钱包ID |
| user_id | bigint FK | 用户ID，唯一索引。关联 `user` 表。一对一，一个用户只有一个钱包 |
| balance | decimal(10,2) | 余额 |

---

### 用户钱包交易记录表：`wallet_transaction`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| wallet_transaction_id | bigint PK | 交易记录ID |
| user_id | bigint FK | 用户ID。关联 `user` 表。一对多，一个用户可以有多个钱包交易记录 |
| type | enum | 交易类型 1-充值 2-消费 3-赠送 4-其他 |
| amount | decimal(10,2) | 金额变动 |
| description | varchar | 交易描述 |

---

## 6. 营销活动

### 优惠券表：`coupon`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| coupon_id | bigint PK | 优惠券ID |
| name | varchar | 名称 |
| discount | decimal(10,2) | 优惠金额 |
| min_spend | decimal(10,2) | 最低消费 |
| start_time | datetime | 有效期开始 |
| end_time | datetime | 有效期结束 |

---

### 用户优惠券表：`user_coupon`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_coupon_id | bigint PK | 记录ID |
| user_id | bigint FK | 用户ID。关联 `user` 表。一对多，一个用户可以有多个优惠券 |
| coupon_id | bigint FK | 优惠券ID。关联 `coupon` 表。一对多，一个优惠券可以有多个用户优惠券 |
| status | enum | 0-未使用 1-已使用 2-已过期 |
| received_at | datetime | 领取时间 |
| used_at | datetime | 使用时间 |

---

## 7. 情感管理（好友关系管理）

### 好友关系表：`user_relation`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_relation_id | bigint PK | 记录ID |
| user_id | bigint FK | 本人ID。关联 `user` 表。一对多，一个用户可以有多个好友关系 |
| friend_user_id | bigint FK | 好友ID。关联 `user` 表。一对多，一个用户可以有多个好友关系 |
| relation_type | enum | 1-亲人 2-朋友 3-恋人 4-同事 5-其他 |
| remark | varchar | 备注 |

---

## 8. 系统表

### 节气表：`solar_term`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| solar_term_id | bigint PK | 节气ID |
| name | varchar | 节气名称 |
| start_time | date | 节气开始时间 |
| end_time | date | 节气结束时间 |
| year | int | 年份 |
| is_active | boolean | 是否启用 |
