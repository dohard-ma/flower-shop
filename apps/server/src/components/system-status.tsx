'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  Cpu,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { http } from '@/lib/request';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  database: {
    connected: boolean;
    responseTime: number | null;
    error?: string;
    tablesStats?: {
      users: number;
      products: number;
      orders: number;
      deliveryPlans: number;
    };
    mysql?: {
      connections: {
        current: number;
        running: number;
        maxUsed: number;
        maxAllowed: number;
        active: number;
        idle: number;
        aborted: number;
        errors: number;
      };
      configuration: {
        maxConnections: number;
        waitTimeout: number;
        interactiveTimeout: number;
      };
      uptime: number;
    } | null;
  };
  system: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
  connectionPool: {
    prisma?: {
      open: number;
      busy: number;
      idle: number;
      openedTotal: number;
      closedTotal: number;
    } | null;
    mysql?: {
      current: number;
      running: number;
      maxUsed: number;
      active: number;
      idle: number;
      maxAllowed: number;
      errors: number;
      aborted: number;
    } | null;
    healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
    utilization: number;
  };
  timestamp: string;
  responseTime: number | null;
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/admin/status');
      if (response.success) {
        setStatus(response.data);
      }
    } catch (error: any) {
      toast({
        title: '获取系统状态失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStatus, 5000); // 每5秒刷新
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getHealthIcon = (connected: boolean) => {
    if (!connected) return <XCircle className='h-4 w-4 text-destructive' />;
    return <CheckCircle className='h-4 w-4 text-green-500' />;
  };

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5' />
            系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex h-24 items-center justify-center'>
            <RefreshCw className='h-6 w-6 animate-spin' />
            <span className='ml-2'>加载中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='flex items-center gap-2 text-2xl font-bold'>
          <Activity className='h-6 w-6' />
          系统监控
        </h2>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap
              className={`mr-2 h-4 w-4 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`}
            />
            自动刷新
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* 数据库状态 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Database className='h-5 w-5' />
              数据库状态
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>连接状态</span>
              <div className='flex items-center gap-2'>
                {getHealthIcon(status.database.connected)}
                <span className='text-sm font-medium'>
                  {status.database.connected ? '已连接' : '断开连接'}
                </span>
              </div>
            </div>

            {status.database.responseTime && (
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>响应时间</span>
                <Badge
                  variant={
                    status.database.responseTime < 100 ? 'default' : 'secondary'
                  }
                >
                  {status.database.responseTime}ms
                </Badge>
              </div>
            )}

            {status.database.error && (
              <div className='rounded bg-destructive/10 p-2 text-sm text-destructive'>
                {status.database.error}
              </div>
            )}

            {status.database.tablesStats && (
              <div className='space-y-2 border-t pt-2'>
                <div className='text-sm font-medium'>数据统计</div>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div>用户: {status.database.tablesStats.users}</div>
                  <div>商品: {status.database.tablesStats.products}</div>
                  <div>订单: {status.database.tablesStats.orders}</div>
                  <div>
                    发货计划: {status.database.tablesStats.deliveryPlans}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 连接池状态 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Server className='h-5 w-5' />
              连接池状态
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>健康状态</span>
              <Badge
                variant={getHealthBadgeVariant(
                  status.connectionPool.healthStatus
                )}
              >
                {status.connectionPool.healthStatus === 'healthy'
                  ? '健康'
                  : status.connectionPool.healthStatus === 'warning'
                    ? '警告'
                    : status.connectionPool.healthStatus === 'critical'
                      ? '严重'
                      : '未知'}
              </Badge>
            </div>

            {/* Prisma 连接池指标 */}
            {status.connectionPool.prisma && (
              <div className='space-y-2'>
                <div className='text-sm font-medium text-blue-600'>
                  Prisma 连接池
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div className='flex justify-between'>
                    <span>打开连接:</span>
                    <span className='font-medium'>
                      {status.connectionPool.prisma.open}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>繁忙连接:</span>
                    <span className='font-medium'>
                      {status.connectionPool.prisma.busy}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>空闲连接:</span>
                    <span className='font-medium'>
                      {status.connectionPool.prisma.idle}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>累计打开:</span>
                    <span className='font-medium'>
                      {status.connectionPool.prisma.openedTotal}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MySQL 连接状态 */}
            {status.connectionPool.mysql && (
              <div className='space-y-2 border-t pt-2'>
                <div className='text-sm font-medium text-orange-600'>
                  MySQL 连接
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div className='flex justify-between'>
                    <span>当前连接:</span>
                    <span className='font-medium'>
                      {status.connectionPool.mysql.current}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>运行中:</span>
                    <span className='font-medium'>
                      {status.connectionPool.mysql.running}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>活跃连接:</span>
                    <span className='font-medium'>
                      {status.connectionPool.mysql.active}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>空闲连接:</span>
                    <span className='font-medium'>
                      {status.connectionPool.mysql.idle}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>最大连接:</span>
                    <span className='font-medium'>
                      {status.connectionPool.mysql.maxAllowed}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>历史最大:</span>
                    <span className='font-medium'>
                      {status.connectionPool.mysql.maxUsed}
                    </span>
                  </div>
                </div>
                {(status.connectionPool.mysql.errors > 0 ||
                  status.connectionPool.mysql.aborted > 0) && (
                  <div className='mt-2 text-xs text-red-600'>
                    错误: {status.connectionPool.mysql.errors} | 中断:{' '}
                    {status.connectionPool.mysql.aborted}
                  </div>
                )}
              </div>
            )}

            <div className='border-t pt-2'>
              <div className='mb-1 flex items-center justify-between'>
                <span className='text-xs text-muted-foreground'>
                  连接利用率
                </span>
                <span className='text-xs font-medium'>
                  {status.connectionPool.utilization}%
                </span>
              </div>
              <div className='h-2 w-full rounded-full bg-gray-200'>
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    status.connectionPool.utilization < 50
                      ? 'bg-green-500'
                      : status.connectionPool.utilization < 80
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(status.connectionPool.utilization, 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MySQL详细状态 */}
        {status.database.mysql && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <HardDrive className='h-5 w-5' />
                MySQL详情
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='space-y-2'>
                <div className='text-sm font-medium'>连接详情</div>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div>当前: {status.database.mysql.connections.current}</div>
                  <div>运行中: {status.database.mysql.connections.running}</div>
                  <div>
                    最大使用: {status.database.mysql.connections.maxUsed}
                  </div>
                  <div>中断: {status.database.mysql.connections.aborted}</div>
                </div>
              </div>

              <div className='space-y-2 border-t pt-2'>
                <div className='text-sm font-medium'>配置信息</div>
                <div className='space-y-1 text-xs'>
                  <div className='flex justify-between'>
                    <span>最大连接:</span>
                    <span>
                      {status.database.mysql.configuration.maxConnections}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>等待超时:</span>
                    <span>
                      {status.database.mysql.configuration.waitTimeout}s
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>交互超时:</span>
                    <span>
                      {status.database.mysql.configuration.interactiveTimeout}s
                    </span>
                  </div>
                </div>
              </div>

              <div className='border-t pt-2'>
                <div className='text-xs text-muted-foreground'>
                  数据库运行时间: {formatUptime(status.database.mysql.uptime)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 系统资源 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Cpu className='h-5 w-5' />
              系统资源
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>运行时间</span>
              <div className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                <span className='text-sm font-medium'>
                  {formatUptime(status.system.uptime)}
                </span>
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>内存使用</span>
                <span className='text-sm font-medium'>
                  {status.system.memory.heapUsed}MB
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>内存总量</span>
                <span className='text-sm font-medium'>
                  {status.system.memory.heapTotal}MB
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>RSS</span>
                <span className='text-sm font-medium'>
                  {status.system.memory.rss}MB
                </span>
              </div>
            </div>

            <div className='border-t pt-2'>
              <div className='text-xs text-muted-foreground'>
                Node.js {status.system.nodeVersion} ({status.system.platform})
              </div>
              <div className='text-xs text-muted-foreground'>
                更新于: {new Date(status.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
