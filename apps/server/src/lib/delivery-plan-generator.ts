// 发货计划生成器工具
// 根据产品的交付类型、发货次数、发货间隔等参数生成发货计划

import { PrismaClient, Prisma } from '@prisma/client';

interface DeliveryPlanConfig {
    deliveryType: string;           // 交付类型: 'once', 'interval', 'solar_term'
    maxDeliveries: number;          // 最大发货次数
    deliveryInterval?: number;      // 固定间隔值（天数）
    quantity: number;               // 购买数量
    baseDate?: Date;                // 基准日期，默认为当前时间
}

interface DeliveryPlanItem {
    deliveryStartDate: Date;
    deliveryEndDate: Date;
    deliverySequence: number;
    solarTermId?: number;
    remark?: string;
}

export class DeliveryPlanGenerator {
    /**
     * 根据配置生成发货计划列表
     */
    static async generateDeliveryPlans(prisma: PrismaClient | Prisma.TransactionClient, config: DeliveryPlanConfig): Promise<DeliveryPlanItem[]> {
        const { deliveryType, maxDeliveries, deliveryInterval, quantity, baseDate = new Date() } = config;

        const plans: DeliveryPlanItem[] = [];

        // 根据购买数量，每个数量都需要生成对应的发货计划
        for (let i = 0; i < quantity; i++) {
            switch (deliveryType) {
                case 'once':
                    // 一次性发货
                    plans.push(...this.generateOncePlans(baseDate, i));
                    break;

                case 'interval':
                    // 固定间隔发货
                    plans.push(...this.generateIntervalPlans(baseDate, maxDeliveries, deliveryInterval || 30, i));
                    break;

                case 'solar_term':
                    // 节气发货
                    plans.push(...await this.generateSolarTermPlans(prisma, baseDate, maxDeliveries, i));
                    break;

                default:
                    // 默认按一次性发货处理
                    plans.push(...this.generateOncePlans(baseDate, i));
                    break;
            }
        }

        return plans;
    }

    /**
     * 生成一次性发货计划
     */
    private static generateOncePlans(baseDate: Date, quantityIndex: number): DeliveryPlanItem[] {
        const now = new Date(baseDate);
        const deliveryStartDate = new Date(now);
        const deliveryEndDate = new Date(now);

        // 检查是否是16:00之后下单，如果是则推迟到下一天
        if (now.getHours() >= 16) {
            deliveryStartDate.setDate(deliveryStartDate.getDate() + 1);
            deliveryEndDate.setDate(deliveryEndDate.getDate() + 3); // 3天内发货
        } else {
            deliveryEndDate.setDate(deliveryEndDate.getDate() + 3); // 3天内发货
        }

        return [{
            deliveryStartDate,
            deliveryEndDate,
            deliverySequence: 1,
            remark: `第${quantityIndex + 1}份商品 - 一次性发货`
        }];
    }

    /**
     * 生成固定间隔发货计划
     */
    private static generateIntervalPlans(
        baseDate: Date,
        maxDeliveries: number,
        intervalDays: number,
        quantityIndex: number
    ): DeliveryPlanItem[] {
        const plans: DeliveryPlanItem[] = [];

        for (let j = 0; j < maxDeliveries; j++) {
            const deliveryStartDate = new Date(baseDate);
            deliveryStartDate.setDate(deliveryStartDate.getDate() + (j * intervalDays));

            const deliveryEndDate = new Date(deliveryStartDate);
            deliveryEndDate.setDate(deliveryEndDate.getDate() + 7); // 一周内发货

            plans.push({
                deliveryStartDate,
                deliveryEndDate,
                deliverySequence: j + 1,
                remark: `第${quantityIndex + 1}份商品 - 第${j + 1}次发货（间隔${intervalDays}天）`
            });
        }

        return plans;
    }

    /**
     * 生成节气发货计划
     */
    private static async generateSolarTermPlans(
        prisma: PrismaClient | Prisma.TransactionClient,
        baseDate: Date,
        maxDeliveries: number,
        quantityIndex: number
    ): Promise<DeliveryPlanItem[]> {

        try {
            const currentYear = baseDate.getFullYear();
            const nextYear = currentYear + 1;

            // 获取当前年份和下一年份的活跃节气
            const solarTerms = await prisma.solarTerm.findMany({
                where: {
                    year: {
                        in: [currentYear, nextYear]
                    },
                    isActive: true,
                    startTime: {
                        gte: baseDate // 只获取当前时间之后的节气
                    }
                },
                orderBy: {
                    startTime: 'asc'
                },
                take: maxDeliveries
            });

            if (solarTerms.length === 0) {
                console.warn('未找到可用的节气数据，回退到固定间隔发货');
                return this.generateIntervalPlans(baseDate, maxDeliveries, 90, quantityIndex); // 90天间隔
            }

            const plans: DeliveryPlanItem[] = [];

            // 根据节气生成发货计划
            for (let i = 0; i < Math.min(maxDeliveries, solarTerms.length); i++) {
                const solarTerm = solarTerms[i];
                const deliveryStartDate = new Date(solarTerm.startTime);
                const deliveryEndDate = new Date(solarTerm.endTime);

                plans.push({
                    deliveryStartDate,
                    deliveryEndDate,
                    deliverySequence: i + 1,
                    solarTermId: solarTerm.id,
                    remark: `第${quantityIndex + 1}份商品 - ${solarTerm.name}节气发货`
                });
            }

            // 如果节气数量不足，用固定间隔补充
            if (plans.length < maxDeliveries) {
                const remainingDeliveries = maxDeliveries - plans.length;
                const lastPlanDate = plans.length > 0 ? plans[plans.length - 1].deliveryEndDate : baseDate;

                const additionalPlans = this.generateIntervalPlans(
                    lastPlanDate,
                    remainingDeliveries,
                    90, // 90天间隔
                    quantityIndex
                );

                // 调整序号
                additionalPlans.forEach((plan, index) => {
                    plan.deliverySequence = plans.length + index + 1;
                    plan.remark = `第${quantityIndex + 1}份商品 - 第${plan.deliverySequence}次发货（节气补充）`;
                });

                plans.push(...additionalPlans);
            }

            return plans;

        } catch (error) {
            console.error('生成节气发货计划失败:', error);
            // 出错时回退到固定间隔发货
            return this.generateIntervalPlans(baseDate, maxDeliveries, 90, quantityIndex);
        } finally {
            if (prisma instanceof PrismaClient) {
                await prisma.$disconnect();
            }
        }
    }

    /**
     * 验证发货计划配置
     */
    static validateConfig(config: DeliveryPlanConfig): { valid: boolean; error?: string } {
        const { deliveryType, maxDeliveries, deliveryInterval, quantity } = config;

        if (!deliveryType || !['once', 'interval', 'solar_term'].includes(deliveryType)) {
            return { valid: false, error: '无效的交付类型' };
        }

        if (!maxDeliveries || maxDeliveries < 1) {
            return { valid: false, error: '发货次数必须大于0' };
        }

        if (deliveryType === 'interval' && (!deliveryInterval || deliveryInterval < 1)) {
            return { valid: false, error: '固定间隔发货必须设置有效的间隔天数' };
        }

        if (!quantity || quantity < 1) {
            return { valid: false, error: '购买数量必须大于0' };
        }

        return { valid: true };
    }

    /**
     * 获取发货计划摘要信息
     */
    static getDeliveryPlanSummary(config: DeliveryPlanConfig): string {
        const { deliveryType, maxDeliveries, deliveryInterval, quantity } = config;

        switch (deliveryType) {
            case 'once':
                return `一次性发货，共${quantity}份商品`;

            case 'interval':
                return `固定间隔发货，每${deliveryInterval}天发货一次，共${maxDeliveries}次，总计${quantity * maxDeliveries}个发货计划`;

            case 'solar_term':
                return `节气发货，按节气时间发货，共${maxDeliveries}次，总计${quantity * maxDeliveries}个发货计划`;

            default:
                return `未知发货类型：${deliveryType}`;
        }
    }
}