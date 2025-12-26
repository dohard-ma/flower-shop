'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Pagination,
  Card,
  Avatar,
  Stack,
  LoadingOverlay,
  Box,
  ScrollArea,
  rem,
} from '@mantine/core';
import {
  IconSearch,
  IconDots,
  IconEdit,
  IconTrash,
  IconEye,
  IconRefresh,
  IconUser,
  IconWallet,
} from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';

// 用户类型定义
export interface User {
  id: number;
  userNo?: string;
  openid?: string;
  avatar?: string;
  nickname?: string;
  name?: string;
  phone?: string;
  gender?: number;
  birthday?: string;
  city?: string;
  province?: string;
  membership?: {
    vipType: string;
    startTime: string;
    endTime: string;
    status: number;
  };
  wallet?: {
    balance: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activePage, setPage] = useState(1);
  const pageSize = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: activePage.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append('search', search);

      const response = await http.get<ApiResponse>(`/api/admin/users?${params.toString()}`);
      if (response && response.success) {
        setUsers(response.data.data || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: any) {
      notifications.show({
        title: '获取失败',
        message: error.message || '获取用户列表失败',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [activePage, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此用户吗？')) return;
    try {
      await http.delete(`/api/admin/users?id=${id}`);
      notifications.show({ title: '删除成功', message: '用户已删除', color: 'green' });
      fetchUsers();
    } catch (error: any) {
      notifications.show({ title: '删除失败', message: error.message || '删除失败', color: 'red' });
    }
  };

  const rows = users.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar src={user.avatar} radius="xl">
            {user.nickname?.charAt(0) || <IconUser size={20} />}
          </Avatar>
          <div>
            <Text size="sm" fw={500}>{user.nickname || '未设置'}</Text>
            <Text size="xs" c="dimmed">{user.phone || '无电话'}</Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{user.userNo || '-'}</Text>
      </Table.Td>
      <Table.Td>
        {user.membership ? (
          <Badge variant="light" color="blue">
            {user.membership.vipType}
          </Badge>
        ) : (
          <Text size="xs" c="dimmed">普通用户</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          <IconWallet size={14} color="gray" />
          <Text size="sm">¥{user.wallet?.balance || 0}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{new Date(user.createdAt).toLocaleDateString()}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => router.push(`/dashboard/users/${user.id}`)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEye size={14} />}
                onClick={() => router.push(`/dashboard/users/${user.id}`)}
              >
                查看详情
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => handleDelete(user.id)}
              >
                删除用户
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>用户管理</Title>
            <Text c="dimmed" size="sm">管理平台注册用户</Text>
          </div>
        </Group>

        <Card withBorder radius="md">
          <Stack gap="md">
            <Group grow>
              <TextInput
                placeholder="搜索昵称/手机号..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
              <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={fetchUsers}>
                刷新
              </Button>
            </Group>

            <Box pos="relative">
              <LoadingOverlay visible={loading} />
              <ScrollArea>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>用户信息</Table.Th>
                      <Table.Th>用户编号</Table.Th>
                      <Table.Th>会员状态</Table.Th>
                      <Table.Th>钱包余额</Table.Th>
                      <Table.Th>注册时间</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.length > 0 ? rows : (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text ta="center" py="xl" c="dimmed">暂无用户</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Box>

            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">共 {total} 条数据</Text>
              <Pagination total={Math.ceil(total / pageSize)} value={activePage} onChange={setPage} />
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
