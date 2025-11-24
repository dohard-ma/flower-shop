generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id               Int              @id @default(autoincrement()) @map("user_id")
  userNo           String?          @unique @map("user_no") // 用户编号，如 QL0001
  openid           String?          @unique
  avatar           String?
  nickname         String?
  name             String?
  phone            String?
  gender           Int?             // 性别 0未知 1男 2女
  birthday         DateTime?        @db.Date
  city             String?
  province         String?

  // 关联
  membership       UserMembership?
  addresses        Address[]
  orders           Order[]          @relation("UserOrders")
  receivedOrderItems OrderItem[]    @relation("OrderItemReceiver")
  wallet           UserWallet?
  userCoupons      UserCoupon[]
  deliveryPlans    DeliveryPlan[]   @relation("UserDeliveryPlans")
  receivedDeliveryPlans DeliveryPlan[] @relation("ReceiverDeliveryPlans")
  diyCover         DiyCover[]
  walletTransactions WalletTransaction[]
  // 用户关系
  relations        UserRelation[]   @relation("UserRelations")
  friendRelations  UserRelation[]   @relation("FriendRelations")

  @@map("user")
}

// 会员表
model UserMembership {
  id          Int       @id @default(autoincrement()) @map("user_membership_id")
  userId      Int       @unique @map("user_id")
  vipType     String    // VIP、SVIP
  startTime   DateTime  @map("start_time")
  endTime     DateTime  @map("end_time")
  status      Int       // 0-未开通 1-开通中 2-过期

  // 关联
  user        User      @relation(fields: [userId], references: [id])

  @@map("user_membership")
}

// 地址表
model Address {
  id          Int       @id @default(autoincrement()) @map("address_id")
  userId      Int       @map("user_id")
  name        String
  phone       String
  address     String
  province    String
  city        String
  area        String
  latitude    Decimal?  @db.Decimal(10, 6)
  longitude   Decimal?  @db.Decimal(10, 6)
  isDefault   Boolean   @map("is_default")

  // 关联
  user        User      @relation(fields: [userId], references: [id])

  @@map("address")
}

// 商品表（用户可以直接下单购买的商品）
model Product {
  id              Int       @id @default(autoincrement()) @map("product_id")
  productName     String    @map("product_name")
  productType     Int       @map("product_type") // 类型 1-年卡 2-礼盒 3-周边
  price           Decimal   @db.Decimal(10, 2)
  stock           Int
  coverImages     Json?
  detail          String?   @db.Text
  images          Json?
  isSubscription  Boolean   @map("is_subscription") // 是否订阅商品
  maxDeliveries   Int?      @map("max_deliveries") // 最大发货次数（订阅商品用）
  deliveryType    String?   @map("delivery_type") // 交付类型: once、interval、solar_term
  deliveryInterval Int?     @map("delivery_interval") // 固定间隔值（天数）
  isActive        Boolean   @map("is_active") // 是否上架

  // 关联
  orderItems      OrderItem[]

  @@map("product")
}

// 订阅商品内容表（每次发货的具体商品内容）
model SubscriptionProduct {
  id              Int       @id @default(autoincrement()) @map("subscription_product_id")
  productName     String    @map("product_name")
  stock           Int
  coverImage      String?   @map("cover_image")
  detail          String?   @db.Text
  images          Json?
  isActive        Boolean   @map("is_active") // 是否上架

  // 关联
  deliveryPlans   DeliveryPlan[]

  @@map("subscription_product")
}

// 电子封面表
model DiyCover {
  id              Int       @id @default(autoincrement()) @map("diy_cover_id")
  userId          Int?      @map("user_id")
  backgroundImage String    @map("background_image")
  createdAt       DateTime  @default(now()) @map("created_at")

  // 关联
  user            User?     @relation(fields: [userId], references: [id])

  @@map("diy_cover")
}

// 订单表
model Order {
  id                Int       @id @default(autoincrement()) @map("order_id")
  orderNo          String    @unique @map("order_no") // 运营用编号：日期+5位流水号
  displayNo        String?   @unique @map("display_no") // 用户展示编号：日期+6位随机数
  userId           Int       @map("user_id")
  giftCard          String?      @map("gift_card")
  amount           Decimal   @db.Decimal(10, 2)
  userCouponId     Int?      @unique @map("user_coupon_id")
  payType          Int       @map("pay_type") // 支付方式 1-微信 2-余额
  status           Int       // 0-待支付 1-已支付 2-已赠送 3-已完成 4-已取消 5-已退款
  isGift           Boolean   @map("is_gift") // false-自己购买 true-赠送他人
  giftType         Int?      @map("gift_type") // 赠送类型 1-单人专属 2-多人领取 (仅当isGift=true时有效)

  // 赠送相关信息
  giftRelationship String?   @map("gift_relationship") // 赠送关系：好友、客户、领导、师长、爱人
  giftReceiverName String?   @map("gift_receiver_name") // 接受者姓名
  giftMessage      String?   @map("gift_message") @db.Text // 祝福语

  addressSnapshot  Json?     @map("address_snapshot") // 地址信息快照（支付时临时存储）
  paidAt           DateTime? @map("paid_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // 关联
  user             User      @relation("UserOrders", fields: [userId], references: [id])
  orderItems       OrderItem[]
  userCoupon       UserCoupon? @relation(fields: [userCouponId], references: [id])

  @@map("order")
}

// 订单项表（包含订阅信息）
model OrderItem {
  id          Int     @id @default(autoincrement())
  orderId     Int     @map("order_id")
  productId   Int     @map("product_id")
  quantity    Int     @default(1)
  price       Decimal @db.Decimal(10, 2)
  receiverId  Int?    @map("receiver_id") // 订单项级别的接收人

  // 订阅相关字段
  isSubscription    Boolean   @default(false) @map("is_subscription") // 是否订阅商品
  totalDeliveries   Int       @default(1) @map("total_deliveries") // 总发货次数
  deliveredCount    Int       @default(0) @map("delivered_count") // 已发货次数
  deliveryType      String?   @map("delivery_type") // 交付类型: once、interval、solar_term
  deliveryInterval  Int?      @map("delivery_interval") // 固定间隔值（天数）

  // 送礼相关字段
  giftStatus        Int       @default(0) @map("gift_status") // 送礼状态：0-待领取 1-已领取 2-已过期 3-已退款
  receivedAt        DateTime? @map("received_at") // 领取时间
  expiredAt         DateTime? @map("expired_at") // 过期时间

  // 关联
  order       Order   @relation(fields: [orderId], references: [id])
  product     Product @relation(fields: [productId], references: [id])
  receiver    User?   @relation("OrderItemReceiver", fields: [receiverId], references: [id])
  deliveryPlans DeliveryPlan[]

  @@map("order_item")
}

// 发货计划表（包含收货信息快照）
model DeliveryPlan {
  id                  Int       @id @default(autoincrement()) @map("delivery_plan_id")
  deliveryNo          String?    @unique @map("delivery_no") // 发货计划编号：日期+5位流水号
  orderItemId         Int       @map("order_item_id")
  subscriptionProductId Int?    @map("subscription_product_id") // 订阅商品的具体内容
  solarTermId         Int?      @map("solar_term_id")
  userId              Int       @map("user_id") // 购买用户
  receiverId          Int?      @map("receiver_id") // 接收用户（关联关系，用于查询）

  // 收货信息快照（不使用关联关系，确保数据稳定性）
  receiverName        String?    @map("receiver_name") // 收货人姓名
  receiverPhone       String?    @map("receiver_phone") // 收货人电话
  receiverAddress     String?    @map("receiver_address") // 收货地址
  receiverProvince    String?    @map("receiver_province") // 省份
  receiverCity        String?    @map("receiver_city") // 城市
  receiverArea        String?    @map("receiver_area") // 区域

  // 发货信息
  deliveryStartDate   DateTime  @map("delivery_start_date") @db.Date
  deliveryEndDate     DateTime  @map("delivery_end_date") @db.Date
  deliveryDate        DateTime? @map("delivery_date") @db.Date
  expressCompany      String?   @map("express_company")
  expressNumber       String?   @map("express_number")
  status              Int       // 0-待确认 1-已确认 2-已发货 3-已完成 4-已取消
  deliverySequence    Int       @default(1) @map("delivery_sequence") // 发货序号（第几次发货）
  remark              String?   // 备注信息

  // 关联
  orderItem           OrderItem @relation(fields: [orderItemId], references: [id])
  subscriptionProduct SubscriptionProduct? @relation(fields: [subscriptionProductId], references: [id])
  solarTerm           SolarTerm? @relation(fields: [solarTermId], references: [id])
  user                User      @relation("UserDeliveryPlans", fields: [userId], references: [id])
  receiver            User?     @relation("ReceiverDeliveryPlans", fields: [receiverId], references: [id])

  @@map("delivery_plan")
}

// 用户钱包表
model UserWallet {
  id        Int       @id @default(autoincrement()) @map("user_wallet_id")
  userId    Int       @unique @map("user_id")
  balance   Decimal   @db.Decimal(10, 2)

  // 关联
  user      User      @relation(fields: [userId], references: [id])

  @@map("user_wallet")
}

// 用户钱包交易记录表
model WalletTransaction {
  id          Int       @id @default(autoincrement()) @map("wallet_transaction_id")
  userId      Int       @map("user_id")
  type        Int       // 交易类型 1-充值 2-消费 3-赠送 4-其他
  amount      Decimal   @db.Decimal(10, 2)
  createdAt   DateTime  @map("createdAt") @db.Date
  description String?

  // 关联
  user        User      @relation(fields: [userId], references: [id])

  @@map("wallet_transaction")
}

// 优惠券表
model Coupon {
  id          Int       @id @default(autoincrement()) @map("coupon_id")
  name        String
  discount    Decimal   @db.Decimal(10, 2)
  minSpend    Decimal   @map("min_spend") @db.Decimal(10, 2)
  startTime   DateTime  @map("start_time")
  endTime     DateTime  @map("end_time")

  // 关联
  userCoupons UserCoupon[]

  @@map("coupon")
}

// 用户优惠券表
model UserCoupon {
  id          Int       @id @default(autoincrement()) @map("user_coupon_id")
  userId      Int       @map("user_id")
  couponId    Int       @map("coupon_id")
  status      Int       // 0-未使用 1-已使用 2-已过期
  receivedAt  DateTime  @map("received_at")
  usedAt      DateTime? @map("used_at")

  // 关联
  user        User      @relation(fields: [userId], references: [id])
  coupon      Coupon    @relation(fields: [couponId], references: [id])
  order       Order?

  @@map("user_coupon")
}

// 用户关系表
model UserRelation {
  id            Int       @id @default(autoincrement()) @map("user_relation_id")
  userId        Int       @map("user_id")
  friendUserId  Int       @map("friend_user_id")
  relationType  Int       @map("relation_type") // 1-亲人 2-朋友 3-恋人 4-同事 5-其他
  remark        String?

  // 关联
  user          User      @relation("UserRelations", fields: [userId], references: [id])
  friend        User      @relation("FriendRelations", fields: [friendUserId], references: [id])

  @@map("user_relation")
}

// 节气表
model SolarTerm {
  id          Int       @id @default(autoincrement()) @map("solar_term_id")
  name        String
  startTime   DateTime  @map("start_time") @db.Date
  endTime     DateTime  @map("end_time") @db.Date
  year        Int
  isActive    Boolean   @map("is_active")

  // 关联
  deliveryPlans DeliveryPlan[]

  @@map("solar_term")
}

// 编号生成器表（解决高并发重复问题）
model NumberGenerator {
  id          Int      @id @default(autoincrement()) @map("number_generator_id")
  type        String   @unique // 编号类型: user_no, order_no
  prefix      String   // 前缀: QL, ORD
  currentNum  Int      @default(0) @map("current_num") // 当前序号
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("number_generator")
}
