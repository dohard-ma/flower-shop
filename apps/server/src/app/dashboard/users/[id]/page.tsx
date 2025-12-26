'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Textarea,
  Stack,
  Card,
  Select,
  Switch,
  Badge,
  rem,
  Divider,
  ActionIcon,
  Breadcrumbs,
  Anchor,
  LoadingOverlay,
  Box,
  Avatar,
  SimpleGrid,
} from '@mantine/core';
import { IconArrowLeft, IconSave, IconUser, IconMail, IconPhone, IconCalendar } from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';

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

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchUser = async (userId: string) => {
    setInitialLoading(true);
    try {
      const response = await http.get<{ user: User }>(`/api/admin/users/${userId}`);
      if (response && response.success) {
        setUser(response.data.user);
      }
    } catch (error: any) {
      notifications.show({
        title: '获取失败',
        message: error.message || '获取用户详情失败',
        color: 'red',
      });
      router.push('/dashboard/users');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUser(id as string);
    }
  }, [id]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await http.put(`/api/admin/users?id=${user.id}`, user);
      if (response.success) {
        notifications.show({ title: '保存成功', message: '用户信息已更新', color: 'green' });
        router.push('/dashboard/users');
      }
    } catch (error: any) {
      notifications.show({ title: '保存失败', message: error.message || '保存失败', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return (
    <Container size="lg" pt="xl">
      <LoadingOverlay visible />
    </Container>
  );

  if (!user) return <Text ta="center" mt="xl">用户不存在</Text>;

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor href="/dashboard">首页</Anchor>
          <Anchor href="/dashboard/users">用户管理</Anchor>
          <Text>用户详情</Text>
        </Breadcrumbs>

        <Group justify="space-between">
          <Group>
            <ActionIcon variant="subtle" onClick={() => router.back()}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={2}>用户详情</Title>
          </Group>
          <Button leftSection={<IconSave size={18} />} onClick={handleSave} loading={loading}>
            保存
          </Button>
        </Group>

        <Box pos="relative">
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            {/* 左侧基本信息卡片 */}
            <Card withBorder radius="md" p="xl" style={{ gridColumn: 'span 1' }}>
              <Stack align="center" gap="md">
                <Avatar src={user.avatar} size={120} radius={120}>
                  <IconUser size={60} />
                </Avatar>
                <div style={{ textAlign: 'center' }}>
                  <Title order={3}>{user.nickname || '未设置'}</Title>
                  <Text c="dimmed" size="sm">{user.userNo || 'NO-USER-ID'}</Text>
                </div>
                <Divider w="100%" />
                <Stack w="100%" gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">余额</Text>
                    <Text size="sm" fw={700} color="blue">¥{user.wallet?.balance || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">会员</Text>
                    <Badge variant="light">{user.membership?.vipType || '普通'}</Badge>
                  </Group>
                </Stack>
              </Stack>
            </Card>

            {/* 右侧详细资料卡片 */}
            <Card withBorder radius="md" p="xl" style={{ gridColumn: 'span 2' }}>
              <Stack gap="xl">
                <section>
                  <Title order={4} mb="md">账户信息</Title>
                  <Divider mb="lg" />
                  <SimpleGrid cols={2} spacing="md">
                    <TextInput
                      label="真实姓名"
                      value={user.name || ''}
                      onChange={(e) => setUser({ ...user, name: e.currentTarget.value })}
                    />
                    <TextInput
                      label="手机号码"
                      value={user.phone || ''}
                      onChange={(e) => setUser({ ...user, phone: e.currentTarget.value })}
                    />
                    <Select
                      label="性别"
                      data={[
                        { value: '1', label: '男' },
                        { value: '2', label: '女' },
                        { value: '0', label: '未知' },
                      ]}
                      value={user.gender?.toString() || '0'}
                      onChange={(val) => setUser({ ...user, gender: parseInt(val || '0') })}
                    />
                    <TextInput
                      label="生日"
                      placeholder="YYYY-MM-DD"
                      value={user.birthday || ''}
                      onChange={(e) => setUser({ ...user, birthday: e.currentTarget.value })}
                    />
                  </SimpleGrid>
                </section>

                <section>
                  <Title order={4} mb="md">地域信息</Title>
                  <Divider mb="lg" />
                  <Group grow>
                    <TextInput
                      label="省份"
                      value={user.province || ''}
                      onChange={(e) => setUser({ ...user, province: e.currentTarget.value })}
                    />
                    <TextInput
                      label="城市"
                      value={user.city || ''}
                      onChange={(e) => setUser({ ...user, city: e.currentTarget.value })}
                    />
                  </Group>
                </section>

                <section>
                  <Title order={4} mb="md">系统信息</Title>
                  <Divider mb="lg" />
                  <SimpleGrid cols={2} spacing="xs">
                    <Text size="sm">注册时间: {new Date(user.createdAt).toLocaleString()}</Text>
                    <Text size="sm">最后更新: {new Date(user.updatedAt).toLocaleString()}</Text>
                    <Text size="sm">微信OpenID: {user.openid || '未绑定'}</Text>
                  </SimpleGrid>
                </section>
              </Stack>
            </Card>
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
}
