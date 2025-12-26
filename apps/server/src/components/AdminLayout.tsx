'use client';

import { AppShell, Burger, Group, NavLink, Title, Text, Button, Stack, rem, Avatar, Menu, ScrollArea } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconDashboard,
  IconBox,
  IconSettings,
  IconLogout,
  IconChartBar,
  IconFolder,
  IconUsers,
  IconChevronRight,
  IconUser
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { http } from '@/lib/request';
import { useSettings } from '@/contexts/settings-context';

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: IconDashboard },
  { name: 'Analytics', href: '/dashboard/analytics', icon: IconChartBar },
  {
    name: '订单管理',
    icon: IconFolder,
    children: [
      { name: '订单列表', href: '/dashboard/orders' },
      { name: '发货计划', href: '/dashboard/delivery-plans' }
    ]
  },
  {
    name: '商品管理',
    icon: IconBox,
    children: [
      { name: '店铺商品管理', href: '/dashboard/products' },
      { name: '订阅商品管理', href: '/dashboard/subscription-product' }
    ]
  },
  {
    name: '用户管理',
    icon: IconUsers,
    children: [
      { name: '用户列表', href: '/dashboard/users' },
      { name: '通知记录', href: '/dashboard/notification-records' }
    ]
  },
  {
    name: '系统设置',
    icon: IconSettings,
    children: [
      { name: '优惠券管理', href: '/dashboard/coupons' },
      { name: '节气管理', href: '/dashboard/seasons' },
      { name: '封面管理', href: '/dashboard/covers' },
      { name: '通知模板管理', href: '/dashboard/notification-templates' },
      { name: '通知场景管理', href: '/dashboard/notification-scenes' }
    ]
  },
  {
    name: '模板',
    icon: IconFolder,
    children: [
      { name: '表格', href: '/dashboard/templates/tables' },
      { name: '表单', href: '/dashboard/templates/forms' }
    ]
  }
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();

  const handleLogout = async () => {
    try {
      const response = await http.post('/api/admin/auth/logout');
      if (response.success) {
        router.push('/auth/login');
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      router.push('/auth/login');
    }
  };

  const renderNavItems = (items: any[]) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = item.href ? (pathname === item.href) : item.children?.some((child: any) => pathname === child.href);

      return (
        <NavLink
          key={item.name}
          label={item.name}
          component={item.href ? Link : 'div'}
          href={item.href}
          leftSection={item.icon && <item.icon size="1.2rem" stroke={1.5} />}
          active={isActive}
          childrenOffset={28}
          defaultOpened={isActive}
        >
          {hasChildren && renderNavItems(item.children)}
        </NavLink>
      );
    });
  };

  return (
    <AppShell
      header={{ height: 60, collapsed: isMobile }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 0, sm: 'md' }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4} fw={900}>花涧里后台管理</Title>
          </Group>

          <Group>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Group gap="xs" style={{ cursor: 'pointer' }}>
                  <Avatar src={settings.avatar} radius="xl" size="sm">
                    {settings.fullName?.charAt(0)}
                  </Avatar>
                  <Text size="sm" fw={500} visibleFrom="sm">{settings.fullName}</Text>
                </Group>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>账户</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />} component={Link} href="/settings">
                  个人资料
                </Menu.Item>
                <Menu.Item leftSection={<IconSettings size={14} />} component={Link} href="/settings">
                  设置
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  退出登录
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4}>
            {renderNavItems(navigation)}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Text size="xs" c="dimmed" ta="center" py="md" borderTop="1px solid var(--mantine-color-gray-2)">
            v1.0.0
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main bg="var(--mantine-color-gray-0)">
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

