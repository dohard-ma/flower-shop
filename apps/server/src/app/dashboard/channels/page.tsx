'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Text,
  Group,
  Button,
  TextInput,
  ActionIcon,
  Image,
  Stack,
  LoadingOverlay,
  rem,
  Box,
  Flex,
  Table,
  Modal,
  FileButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUpload,
  IconPhoto,
} from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';

interface Channel {
  id: string;
  code: string;
  name: string;
  icon: string | null;
}

export default function ChannelManagementPage() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Partial<Channel> | null>(null);
  const [uploading, setUploading] = useState(false);

  // 获取渠道列表
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<Channel[]>('/api/admin/channels');
      setChannels(res.data || []);
    } catch (e) {
      notifications.show({ title: '错误', message: '获取渠道列表失败', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // 打开新建/编辑弹窗
  const openModal = (channel: Partial<Channel> | null = null) => {
    setEditingChannel(channel || { name: '', code: '', icon: '' });
    setModalOpen(true);
  };

  // 处理上传
  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // 注意：这里使用了现有的 /api/admin/upload 接口
      const res = await http.post<{ url: string }>(`/api/admin/upload?type=channelIcon`, formData);
      setEditingChannel(prev => ({ ...prev, icon: res.data.url }));
      notifications.show({ title: '成功', message: '图标上传成功', color: 'green' });
    } catch (e) {
      notifications.show({ title: '错误', message: '上传失败', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  // 保存数据
  const handleSave = async () => {
    if (!editingChannel?.name || !editingChannel?.code) {
      notifications.show({ title: '提示', message: '名称和代码不能为空', color: 'yellow' });
      return;
    }

    try {
      if (editingChannel.id) {
        await http.put(`/api/admin/channels/${editingChannel.id}`, editingChannel);
        notifications.show({ title: '成功', message: '渠道更新成功', color: 'green' });
      } else {
        await http.post('/api/admin/channels', editingChannel);
        notifications.show({ title: '成功', message: '渠道创建成功', color: 'green' });
      }
      setModalOpen(false);
      fetchChannels();
    } catch (e) {
      notifications.show({ title: '错误', message: '保存失败', color: 'red' });
    }
  };

  // 删除渠道
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该渠道吗？')) return;
    try {
      await http.delete(`/api/admin/channels/${id}`);
      notifications.show({ title: '成功', message: '渠道删除成功', color: 'green' });
      fetchChannels();
    } catch (e) {
      notifications.show({ title: '错误', message: '删除失败', color: 'red' });
    }
  };

  return (
    <Box
      p="md"
      bg="white"
      style={{
        borderRadius: rem(12),
        minHeight: 'calc(100vh - 110px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <Flex justify="space-between" align="center" mb="xl">
        <Stack gap={2}>
          <Text size="xl" fw={700}>渠道管理</Text>
          <Text size="xs" c="dimmed">管理不同平台的销售渠道及展示图标</Text>
        </Stack>
        <Button
          leftSection={<IconPlus size={18} />}
          color="yellow.6"
          radius="xl"
          onClick={() => openModal()}
        >
          添加渠道
        </Button>
      </Flex>

      <Box pos="relative">
        <LoadingOverlay visible={loading} />
        <Table verticalSpacing="md" horizontalSpacing="md">
          <Table.Thead bg="#f8f8f8">
            <Table.Tr>
              <Table.Th w={80}>图标</Table.Th>
              <Table.Th>渠道名称</Table.Th>
              <Table.Th>渠道代码</Table.Th>
              <Table.Th w={120} ta="right">操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {channels.map((channel) => (
              <Table.Tr key={channel.id}>
                <Table.Td>
                  {channel.icon ? (
                    <Image src={channel.icon} w={40} h={40} radius="sm" fallbackSrc="https://placehold.co/40x40?text=No+Icon" />
                  ) : (
                    <Box w={40} h={40} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
                      <IconPhoto size={20} color="#ccc" />
                    </Box>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{channel.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{channel.code}</Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="subtle" color="blue" onClick={() => openModal(channel)}>
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(channel.id)}>
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {channels.length === 0 && !loading && (
              <Table.Tr>
                <Table.Td colSpan={4} ta="center" py={100}>
                  <Text c="dimmed">暂无渠道数据</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Box>

      {/* 新建/编辑 Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingChannel?.id ? '编辑渠道' : '添加渠道'}
        radius="md"
        size="md"
      >
        <Stack gap="md">
          <Flex gap="md" align="flex-end">
            <Box pos="relative" w={80} h={80}>
              {editingChannel?.icon ? (
                <Image src={editingChannel.icon} w={80} h={80} radius="md" />
              ) : (
                <Box w={80} h={80} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(8) }}>
                  <IconPhoto size={32} color="#ddd" />
                </Box>
              )}
              <LoadingOverlay visible={uploading} radius="md" />
            </Box>
            <FileButton onChange={handleUpload} accept="image/png,image/jpeg">
              {(props) => (
                <Button {...props} variant="light" size="compact-xs" leftSection={<IconUpload size={14} />}>
                  上传图标
                </Button>
              )}
            </FileButton>
          </Flex>

          <TextInput
            label="渠道名称"
            placeholder="例如：美团外卖"
            required
            value={editingChannel?.name || ''}
            onChange={(e) => setEditingChannel(prev => ({ ...prev, name: e.target.value }))}
          />

          <TextInput
            label="渠道代码"
            placeholder="例如：meituan"
            required
            description="用于系统中唯一标识渠道，通常为小写字母"
            value={editingChannel?.code || ''}
            onChange={(e) => setEditingChannel(prev => ({ ...prev, code: e.target.value }))}
            disabled={!!editingChannel?.id}
          />

          <Group justify="flex-end" mt="xl">
            <Button variant="outline" color="gray" onClick={() => setModalOpen(false)}>取消</Button>
            <Button color="yellow.6" onClick={handleSave}>保存</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
