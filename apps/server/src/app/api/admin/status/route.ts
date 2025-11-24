import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// 获取真实的MySQL状态信息
async function getMySQLStatus() {
    try {
        // 获取当前连接数和相关状态
        const statusQueries = await prisma.$queryRaw`SHOW STATUS WHERE Variable_name IN (
            'Threads_connected',
            'Threads_running',
            'Max_used_connections',
            'Aborted_connects',
            'Connection_errors_internal',
            'Uptime'
        )` as Array<{ Variable_name: string; Value: string }>;

        // 获取最大连接数配置
        const variableQueries = await prisma.$queryRaw`SHOW VARIABLES WHERE Variable_name IN (
            'max_connections',
            'wait_timeout',
            'interactive_timeout'
        )` as Array<{ Variable_name: string; Value: string }>;

        // 获取当前进程列表信息
        const processListQuery = await prisma.$queryRaw`
            SELECT
                COUNT(*) as total_connections,
                SUM(CASE WHEN COMMAND != 'Sleep' THEN 1 ELSE 0 END) as active_connections,
                SUM(CASE WHEN COMMAND = 'Sleep' THEN 1 ELSE 0 END) as idle_connections
            FROM INFORMATION_SCHEMA.PROCESSLIST
        ` as Array<{ total_connections: bigint; active_connections: bigint; idle_connections: bigint }>;

        // 转换查询结果为键值对
        const statusMap = statusQueries.reduce((acc, item) => {
            acc[item.Variable_name] = item.Value;
            return acc;
        }, {} as Record<string, string>);

        const variableMap = variableQueries.reduce((acc, item) => {
            acc[item.Variable_name] = item.Value;
            return acc;
        }, {} as Record<string, string>);

        const processInfo = processListQuery[0];

        return {
            connections: {
                current: parseInt(statusMap.Threads_connected || '0'),
                running: parseInt(statusMap.Threads_running || '0'),
                maxUsed: parseInt(statusMap.Max_used_connections || '0'),
                maxAllowed: parseInt(variableMap.max_connections || '0'),
                active: Number(processInfo.active_connections || 0),
                idle: Number(processInfo.idle_connections || 0),
                aborted: parseInt(statusMap.Aborted_connects || '0'),
                errors: parseInt(statusMap.Connection_errors_internal || '0')
            },
            configuration: {
                maxConnections: parseInt(variableMap.max_connections || '0'),
                waitTimeout: parseInt(variableMap.wait_timeout || '0'),
                interactiveTimeout: parseInt(variableMap.interactive_timeout || '0')
            },
            uptime: parseInt(statusMap.Uptime || '0')
        };
    } catch (error) {
        console.error('获取MySQL状态失败:', error);
        return null;
    }
}

// 获取真实的Prisma连接池指标
async function getPrismaMetrics() {
    try {
        // 类型断言来避免TypeScript错误，因为$metrics是预览功能
        const metrics = await (prisma as any).$metrics.json();

        // 解析连接池相关指标
        const poolMetrics = {
            open: 0,
            busy: 0,
            idle: 0,
            openedTotal: 0,
            closedTotal: 0
        };

        // 从counters中获取指标
        metrics.counters?.forEach((counter: any) => {
            switch (counter.key) {
                case 'prisma_pool_connections_open':
                    poolMetrics.open = counter.value;
                    break;
                case 'prisma_pool_connections_opened_total':
                    poolMetrics.openedTotal = counter.value;
                    break;
                case 'prisma_pool_connections_closed_total':
                    poolMetrics.closedTotal = counter.value;
                    break;
            }
        });

        // 从gauges中获取指标
        metrics.gauges?.forEach((gauge: any) => {
            switch (gauge.key) {
                case 'prisma_pool_connections_busy':
                    poolMetrics.busy = gauge.value;
                    break;
                case 'prisma_pool_connections_idle':
                    poolMetrics.idle = gauge.value;
                    break;
            }
        });

        return poolMetrics;
    } catch (error) {
        console.error('获取Prisma指标失败:', error);
        return null;
    }
}

// 获取系统和数据库状态
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const startTime = Date.now();

        // 获取一些基础统计信息来测试连接
        const [userCount, productCount, orderCount, deliveryPlanCount] = await prisma.$transaction([
            prisma.user.count(),
            prisma.product.count(),
            prisma.order.count(),
            prisma.deliveryPlan.count()
        ]);

        // 获取真实的MySQL状态
        const mysqlStatus = await getMySQLStatus();

        // 获取真实的Prisma连接池指标
        const prismaMetrics = await getPrismaMetrics();

        // 测试数据库连接响应时间
        const dbResponseTime = Date.now() - startTime;

        // 计算内存使用情况
        const memoryUsage = process.memoryUsage();

        // 获取系统运行时间
        const uptime = process.uptime();

        const status = {
            // 数据库状态
            database: {
                connected: true,
                responseTime: dbResponseTime,
                tablesStats: {
                    users: userCount,
                    products: productCount,
                    orders: orderCount,
                    deliveryPlans: deliveryPlanCount
                },
                mysql: mysqlStatus
            },
            // 系统状态
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: Math.floor(uptime),
                memory: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                    external: Math.round(memoryUsage.external / 1024 / 1024) // MB
                }
            },
            // 连接池健康状态评估
            connectionPool: {
                // Prisma连接池指标
                prisma: prismaMetrics ? {
                    open: prismaMetrics.open,
                    busy: prismaMetrics.busy,
                    idle: prismaMetrics.idle,
                    openedTotal: prismaMetrics.openedTotal,
                    closedTotal: prismaMetrics.closedTotal
                } : null,
                // MySQL连接状态
                mysql: mysqlStatus ? {
                    current: mysqlStatus.connections.current,
                    running: mysqlStatus.connections.running,
                    maxUsed: mysqlStatus.connections.maxUsed,
                    active: mysqlStatus.connections.active,
                    idle: mysqlStatus.connections.idle,
                    maxAllowed: mysqlStatus.connections.maxAllowed,
                    errors: mysqlStatus.connections.errors,
                    aborted: mysqlStatus.connections.aborted
                } : null,
                // 综合健康评估
                healthStatus: (() => {
                    if (!mysqlStatus) return 'unknown';
                    const utilization = (mysqlStatus.connections.current / mysqlStatus.connections.maxAllowed) * 100;
                    if (utilization < 50) return 'healthy';
                    if (utilization < 80) return 'warning';
                    return 'critical';
                })(),
                utilization: mysqlStatus ? Math.round((mysqlStatus.connections.current / mysqlStatus.connections.maxAllowed) * 100) : 0
            },
            // 时间戳
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime
        };

        return ApiResponseBuilder.success(traceId, status);
    } catch (error: any) {
        console.error('获取系统状态失败:', error);

        // 即使数据库连接失败，也返回部分状态信息
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        const errorStatus = {
            database: {
                connected: false,
                error: error.message,
                responseTime: null,
                mysql: null
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: Math.floor(uptime),
                memory: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024),
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                }
            },
            connectionPool: {
                prisma: null,
                mysql: null,
                healthStatus: 'critical',
                utilization: 0
            },
            timestamp: new Date().toISOString(),
            responseTime: null
        };

        return ApiResponseBuilder.success(traceId, errorStatus);
    }
}
