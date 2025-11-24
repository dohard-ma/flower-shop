-- CreateTable
CREATE TABLE `user` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `openid` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `nickname` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `gender` INTEGER NULL,
    `birthday` DATE NULL,

    UNIQUE INDEX `user_openid_key`(`openid`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_membership` (
    `user_membership_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `vipType` VARCHAR(191) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `status` INTEGER NOT NULL,

    UNIQUE INDEX `user_membership_user_id_key`(`user_id`),
    PRIMARY KEY (`user_membership_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `address` (
    `address_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `latitude` DECIMAL(10, 6) NULL,
    `longitude` DECIMAL(10, 6) NULL,
    `is_default` BOOLEAN NOT NULL,

    PRIMARY KEY (`address_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product` (
    `product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_name` VARCHAR(191) NOT NULL,
    `product_type` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL,
    `cover_image` VARCHAR(191) NULL,
    `detail` TEXT NULL,
    `images` JSON NULL,
    `is_subscription` BOOLEAN NOT NULL,
    `max_deliveries` INTEGER NULL,
    `delivery_type` VARCHAR(191) NULL,
    `delivery_interval` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL,

    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_product` (
    `subscription_product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_name` VARCHAR(191) NOT NULL,
    `stock` INTEGER NOT NULL,
    `cover_image` VARCHAR(191) NULL,
    `detail` TEXT NULL,
    `images` JSON NULL,
    `is_active` BOOLEAN NOT NULL,

    PRIMARY KEY (`subscription_product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diy_cover` (
    `diy_cover_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `background_image` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`diy_cover_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `order_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `receiver_id` INTEGER NULL,
    `cover_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `user_coupon_id` INTEGER NULL,
    `pay_type` INTEGER NOT NULL,
    `status` INTEGER NOT NULL,
    `is_gift` BOOLEAN NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_order_no_key`(`order_no`),
    UNIQUE INDEX `order_user_coupon_id_key`(`user_coupon_id`),
    PRIMARY KEY (`order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_order` (
    `subscription_order_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `order_item_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `total_deliveries` INTEGER NOT NULL,
    `delivered_count` INTEGER NOT NULL,
    `delivery_type` VARCHAR(191) NOT NULL,
    `delivery_interval` INTEGER NULL,
    `status` INTEGER NOT NULL,

    PRIMARY KEY (`subscription_order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_plan` (
    `delivery_plan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `order_item_id` INTEGER NULL,
    `subscription_order_id` INTEGER NULL,
    `solar_term_id` INTEGER NULL,
    `product_id` INTEGER NULL,
    `subscription_product_id` INTEGER NULL,
    `user_id` INTEGER NOT NULL,
    `receiver_id` INTEGER NULL,
    `address_id` INTEGER NOT NULL,
    `delivery_start_date` DATE NOT NULL,
    `delivery_end_date` DATE NOT NULL,
    `delivery_date` DATE NULL,
    `express_company` VARCHAR(191) NULL,
    `express_number` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL,

    PRIMARY KEY (`delivery_plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_wallet` (
    `user_wallet_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `user_wallet_user_id_key`(`user_id`),
    PRIMARY KEY (`user_wallet_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transaction` (
    `wallet_transaction_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATE NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`wallet_transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon` (
    `coupon_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL,
    `min_spend` DECIMAL(10, 2) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,

    PRIMARY KEY (`coupon_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_coupon` (
    `user_coupon_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `coupon_id` INTEGER NOT NULL,
    `status` INTEGER NOT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,

    PRIMARY KEY (`user_coupon_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_relation` (
    `user_relation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `friend_user_id` INTEGER NOT NULL,
    `relation_type` INTEGER NOT NULL,
    `remark` VARCHAR(191) NULL,

    PRIMARY KEY (`user_relation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solar_term` (
    `solar_term_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `start_time` DATE NOT NULL,
    `end_time` DATE NOT NULL,
    `year` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL,

    PRIMARY KEY (`solar_term_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_membership` ADD CONSTRAINT `user_membership_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `address` ADD CONSTRAINT `address_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diy_cover` ADD CONSTRAINT `diy_cover_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_cover_id_fkey` FOREIGN KEY (`cover_id`) REFERENCES `diy_cover`(`diy_cover_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_user_coupon_id_fkey` FOREIGN KEY (`user_coupon_id`) REFERENCES `user_coupon`(`user_coupon_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_order` ADD CONSTRAINT `subscription_order_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_order` ADD CONSTRAINT `subscription_order_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_order` ADD CONSTRAINT `subscription_order_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_item`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_subscription_order_id_fkey` FOREIGN KEY (`subscription_order_id`) REFERENCES `subscription_order`(`subscription_order_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_solar_term_id_fkey` FOREIGN KEY (`solar_term_id`) REFERENCES `solar_term`(`solar_term_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`product_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_subscription_product_id_fkey` FOREIGN KEY (`subscription_product_id`) REFERENCES `subscription_product`(`subscription_product_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_plan` ADD CONSTRAINT `delivery_plan_address_id_fkey` FOREIGN KEY (`address_id`) REFERENCES `address`(`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_wallet` ADD CONSTRAINT `user_wallet_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transaction` ADD CONSTRAINT `wallet_transaction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupon` ADD CONSTRAINT `user_coupon_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupon` ADD CONSTRAINT `user_coupon_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupon`(`coupon_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_relation` ADD CONSTRAINT `user_relation_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_relation` ADD CONSTRAINT `user_relation_friend_user_id_fkey` FOREIGN KEY (`friend_user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
