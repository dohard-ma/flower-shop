import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NumberGenerator {
    /**
     * 生成用户编号
     * 格式: U + 4位数字 (U0001, U0002...)
     * 使用数据库事务保证高并发下的唯一性
     */
    static async generateUserNumber(): Promise<string> {
        return await prisma.$transaction(async (tx) => {
            // 获取或创建用户编号生成器记录
            let generator = await tx.numberGenerator.findUnique({
                where: { type: 'user_no' }
            });

            if (!generator) {
                generator = await tx.numberGenerator.create({
                    data: {
                        type: 'user_no',
                        prefix: 'U',
                        currentNum: 0
                    }
                });
            }

            // 原子性递增序号
            const updated = await tx.numberGenerator.update({
                where: { type: 'user_no' },
                data: { currentNum: { increment: 1 } }
            });

            // 生成用户编号
            const userNo = `${generator.prefix}${updated.currentNum.toString().padStart(4, '0')}`;
            return userNo;
        });
    }

    /**
     * 生成订单编号 - 日期 + 5位递增流水号
     * 格式: ORD + YYYYMMDD + 5位流水号 (ORD2025042800001)
     * 便于运营管理和数据统计，不对用户展示
     */
    static async generateOrderNumber(date: Date = new Date()): Promise<string> {
        const dateStr = 'ORD' + date.toISOString().slice(0, 10).replace(/-/g, '');

        return await prisma.$transaction(async (tx) => {
            const type = `order_no_${dateStr}`;

            let generator = await tx.numberGenerator.findUnique({
                where: { type }
            });

            if (!generator) {
                generator = await tx.numberGenerator.create({
                    data: {
                        type,
                        prefix: dateStr,
                        currentNum: 0
                    }
                });
            }

            const updated = await tx.numberGenerator.update({
                where: { type },
                data: { currentNum: { increment: 1 } }
            });

            return `${dateStr}${updated.currentNum.toString().padStart(5, '0')}`;
        });
    }

    /**
     * 生成发货计划编号 - 日期 + 5位递增流水号
     * 格式: YYYYMMDD + 5位流水号 (2025042800001)
     * 便于物流数据同步和运营管理
     */
    static async generateDeliveryPlanNumber(date: Date = new Date()): Promise<string> {
        const dateStr = 'DP' + date.toISOString().slice(0, 10).replace(/-/g, '');

        return await prisma.$transaction(async (tx) => {
            const type = `delivery_plan_${dateStr}`;

            let generator = await tx.numberGenerator.findUnique({
                where: { type }
            });

            if (!generator) {
                generator = await tx.numberGenerator.create({
                    data: {
                        type,
                        prefix: dateStr,
                        currentNum: 0
                    }
                });
            }

            const updated = await tx.numberGenerator.update({
                where: { type },
                data: { currentNum: { increment: 1 } }
            });

            return `${dateStr}${updated.currentNum.toString().padStart(5, '0')}`;
        });
    }

    /**
     * 生成用户展示的订单编号 - 随机数方案
     * 格式: 年月日 + 6位随机数 (20250428123456)
     * 用于用户端展示，避免泄露业务信息
     */
    static generateUserOrderNumber(date: Date = new Date()): string {
        const dateStr = 'UORD' + date.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        return `${dateStr}${randomNum}`;
    }

    /**
     * 检查用户编号是否存在
     */
    static async isUserNumberExists(userNo: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { userNo }
        });
        return !!user;
    }

    /**
     * 检查订单编号是否存在
     */
    static async isOrderNumberExists(orderNo: string): Promise<boolean> {
        const order = await prisma.order.findUnique({
            where: { orderNo }
        });
        return !!order;
    }

    /**
     * 生成唯一的用户编号（带重试机制）
     */
    static async generateUniqueUserNumber(maxRetries: number = 5): Promise<string> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const userNo = await this.generateUserNumber();
                const exists = await this.isUserNumberExists(userNo);

                if (!exists) {
                    return userNo;
                }
            } catch (error) {
                console.error(`生成用户编号失败，重试 ${i + 1}/${maxRetries}:`, error);

                if (i === maxRetries - 1) {
                    throw new Error('生成用户编号失败，请稍后重试');
                }
            }
        }

        throw new Error('生成用户编号失败');
    }

    /**
     * 生成唯一的订单编号（带重试机制）
     */
    static async generateUniqueOrderNumber(date: Date = new Date(), maxRetries: number = 5): Promise<string> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const orderNo = await this.generateOrderNumber(date);
                const exists = await this.isOrderNumberExists(orderNo);

                if (!exists) {
                    return orderNo;
                }
            } catch (error) {
                console.error(`生成订单编号失败，重试 ${i + 1}/${maxRetries}:`, error);

                if (i === maxRetries - 1) {
                    throw new Error('生成订单编号失败，请稍后重试');
                }
            }
        }

        throw new Error('生成订单编号失败');
    }

    /**
     * 生成唯一的发货计划编号（带重试机制）
     */
    static async generateUniqueDeliveryPlanNumber(date: Date = new Date(), maxRetries: number = 5): Promise<string> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.generateDeliveryPlanNumber(date);
            } catch (error) {
                console.error(`生成发货计划编号失败，重试 ${i + 1}/${maxRetries}:`, error);
                if (i === maxRetries - 1) {
                    throw new Error(`生成发货计划编号失败，已重试 ${maxRetries} 次`);
                }
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
            }
        }
        throw new Error('生成发货计划编号失败');
    }

    /**
     * 批量生成唯一的发货计划编号（提高性能）
     * @param count 需要生成的编号数量
     * @param date 日期
     * @param maxRetries 最大重试次数
     * @returns 编号数组
     */
    static async generateBatchDeliveryPlanNumbers(count: number, date: Date = new Date(), maxRetries: number = 5): Promise<string[]> {
        if (count <= 0) {
            return [];
        }

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await prisma.$transaction(async (tx) => {
                    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                    const type = `delivery_plan_${dateStr}`;

                    // 获取或创建当日的编号生成器
                    let generator = await tx.numberGenerator.findUnique({
                        where: { type }
                    });

                    if (!generator) {
                        generator = await tx.numberGenerator.create({
                            data: {
                                type,
                                prefix: dateStr,
                                currentNum: 0
                            }
                        });
                    }

                    // 批量更新序号并生成编号
                    const updated = await tx.numberGenerator.update({
                        where: { type },
                        data: { currentNum: { increment: count } }
                    });

                    // 生成编号数组
                    const numbers: string[] = [];
                    const startNum = updated.currentNum - count + 1;

                    for (let j = 0; j < count; j++) {
                        const currentNum = startNum + j;
                        numbers.push(`${dateStr}${currentNum.toString().padStart(5, '0')}`);
                    }

                    return numbers;
                });
            } catch (error) {
                console.error(`批量生成发货计划编号失败，重试 ${i + 1}/${maxRetries}:`, error);
                if (i === maxRetries - 1) {
                    throw new Error(`批量生成发货计划编号失败，已重试 ${maxRetries} 次`);
                }
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
            }
        }
        throw new Error('批量生成发货计划编号失败');
    }

    // /**
    //  * 获取当日编号统计
    //  */
    // static async getDailyNumberStats(date: Date = new Date()) {
    //     const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    //     const orderGenerator = await prisma.numberGenerator.findUnique({
    //         where: { type: `order_no_${dateStr}` }
    //     });

    //     const deliveryGenerator = await prisma.numberGenerator.findUnique({
    //         where: { type: `delivery_plan_${dateStr}` }
    //     });

    //     return {
    //         date: dateStr,
    //         orderCount: orderGenerator?.currentNum || 0,
    //         deliveryPlanCount: deliveryGenerator?.currentNum || 0
    //     };
    // }
}

// // 使用示例
// export const NumberGeneratorExample = {
//     // 生成用户编号
//     async createUserNumber() {
//         const userNo = await NumberGenerator.generateUniqueUserNumber();
//         console.log('用户编号:', userNo); // U0001
//         return userNo;
//     },

//     // 生成订单编号（运营用）
//     async createOrderNumber() {
//         const orderNo = await NumberGenerator.generateUniqueOrderNumber();
//         console.log('订单编号（运营）:', orderNo); // 2025042800001
//         return orderNo;
//     },

//     // 生成发货计划编号
//     async createDeliveryPlanNumber() {
//         const deliveryNo = await NumberGenerator.generateUniqueDeliveryPlanNumber();
//         console.log('发货计划编号:', deliveryNo); // 2025042800001
//         return deliveryNo;
//     },

//     // 生成用户展示编号
//     async createUserDisplayNumber() {
//         const displayNo = NumberGenerator.generateUserOrderNumber();
//         console.log('用户展示编号:', displayNo); // 20250428123456
//         return displayNo;
//     },

//     // 查看当日统计
//     async viewDailyStats() {
//         const stats = await NumberGenerator.getDailyNumberStats();
//         console.log('当日编号统计:', stats);
//         /*
//         {
//           date: '20250428',
//           orderCount: 156,
//           deliveryPlanCount: 89
//         }
//         */
//     }
// };