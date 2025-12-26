'use client';

import { useState, useEffect } from 'react';
import { Card, Text, Group, Badge, Button, Stack, SimpleGrid, ThemeIcon, LoadingOverlay, Box } from '@mantine/core';
import {
  IconActivity,
  IconDatabase,
  IconServer,
  IconRefresh,
  IconCpu,
  IconHardDrive,
  IconZap,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconClock
} from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';

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

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/admin/status');
      if (response.success) {
        setStatus(response.data);
      }
    } catch (error: any) {
      notifications.show({
        title: '获取系统状态失败',
        message: error.message || '请稍后重试',
        color: 'red',
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
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!status) {
    return (
      <Card withBorder>
        <Group justify="center" h={100}>
          <LoadingOverlay visible />
        </Group>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3} style={{ display: 'flex', alignItems: 'center', gap: rem(8) }}>
          <IconActivity size={24} />
          系统监控
        </Title>
        <Group>
          <Button
            variant="light"
            size="sm"
            color={autoRefresh ? 'green' : 'gray'}
            leftSection={<IconZap size={16} />}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            自动刷新: {autoRefresh ? '开启' : '关闭'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftSection={<IconRefresh size={16} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchStatus}
            disabled={loading}
          >
            刷新
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
        {/* 数据库状态 */}
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group justify="space-between">
              <Text fw={500} style={{ display: 'flex', alignItems: 'center', gap: rem(8) }}>
                <IconDatabase size={18} /> 数据库状态
              </Text>
              <Badge color={status.database.connected ? 'green' : 'red'}>
                {status.database.connected ? '已连接' : '断开'}
              </Badge>
            </Group>
          </Card.Section>
          <Stack gap="xs" mt="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">响应时间</Text>
              <Text size="sm" fw={500}>{status.database.responseTime}ms</Text>
            </Group>
            {status.database.tablesStats && (
              <Box mt="xs">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>数据统计</Text>
                <SimpleGrid cols={2}>
                  <Text size="xs">用户: {status.database.tablesStats.users}</Text>
                  <Text size="xs">商品: {status.database.tablesStats.products}</Text>
                  <Text size="xs">订单: {status.database.tablesStats.orders}</Text>
                  <Text size="xs">计划: {status.database.tablesStats.deliveryPlans}</Text>
                </SimpleGrid>
              </Box>
            )}
          </Stack>
        </Card>

        {/* 连接池状态 */}
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group justify="space-between">
              <Text fw={500} style={{ display: 'flex', alignItems: 'center', gap: rem(8) }}>
                <IconServer size={18} /> 连接池
              </Text>
              <Badge color={status.connectionPool.healthStatus === 'healthy' ? 'green' : 'orange'}>
                {status.connectionPool.healthStatus}
              </Badge>
            </Group>
          </Card.Section>
          <Stack gap="xs" mt="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">利用率</Text>
              <Text size="sm" fw={500}>{status.connectionPool.utilization}%</Text>
            </Group>
            <Box mt="xs">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Prisma 池</Text>
              <SimpleGrid cols={2}>
                <Text size="xs">打开: {status.connectionPool.prisma?.open}</Text>
                <Text size="xs">繁忙: {status.connectionPool.prisma?.busy}</Text>
                <Text size="xs">空闲: {status.connectionPool.prisma?.idle}</Text>
              </SimpleGrid>
            </Box>
          </Stack>
        </Card>

        {/* 系统资源 */}
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} style={{ display: 'flex', alignItems: 'center', gap: rem(8) }}>
              <IconCpu size={18} /> 系统资源
            </Text>
          </Card.Section>
          <Stack gap="xs" mt="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">运行时间</Text>
              <Text size="sm" fw={500}>{formatUptime(status.system.uptime)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">内存使用</Text>
              <Text size="sm" fw={500}>{status.system.memory.heapUsed}MB / {status.system.memory.heapTotal}MB</Text>
            </Group>
            <Text size="xs" c="dimmed" mt="auto">
              Node {status.system.nodeVersion} ({status.system.platform})
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
