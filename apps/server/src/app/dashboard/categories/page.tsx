'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Text,
  Group,
  Button,
  TextInput,
  ActionIcon,
  Stack,
  LoadingOverlay,
  rem,
  Box,
  Flex,
  ScrollArea,
  Modal,
  NumberInput,
  Switch,
  Select,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPlus,
  IconArrowNarrowUp,
  IconArrowNarrowDown,
  IconEdit,
  IconTrash,
  IconChevronLeft,
} from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';
import { StoreCategory } from '../products/page';

export default function CategoryManagementPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 48em)');

  // 状态管理
  const [categories, setCategories] = useState<(StoreCategory & { parentId?: string | null; isVisible: boolean })[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formSort, setFormSort] = useState<number | string>(0);
  const [formVisible, setFormVisible] = useState(true);
  const [formParentId, setFormParentId] = useState<string | null>(null);

  // 数据获取
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<(StoreCategory & { parentId?: string | null; isVisible: boolean })[]>('/api/admin/categories');
      setCategories(res.data || []);
    } catch (e) {
      notifications.show({
        title: '错误',
        message: '获取分类失败',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 将扁平数组转换为树形结构以便显示
  const getTreeData = () => {
    const rootNodes = categories.filter(c => !c.parentId);
    const sortedNodes: any[] = [];

    const addChildren = (parent: any, depth: number) => {
      sortedNodes.push({ ...parent, depth });
      const children = categories.filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      children.forEach(child => addChildren(child, depth + 1));
    };

    rootNodes.sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(root => addChildren(root, 0));

    return sortedNodes;
  };

  // 处理新增/编辑
  const handleOpenModal = (category?: any) => {
    if (category) {
      setEditingCategory(category);
      setFormName(category.name);
      setFormSort(category.sortOrder);
      setFormVisible(category.isVisible ?? true);
      setFormParentId(category.parentId || null);
    } else {
      setEditingCategory(null);
      setFormName('');
      setFormSort(categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) + 10 : 0);
      setFormVisible(true);
      setFormParentId(null);
    }
    setModalOpened(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      notifications.show({ message: '分类名称不能为空', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formName,
        sortOrder: Number(formSort),
        isVisible: formVisible,
        parentId: formParentId || null,
      };

      if (editingCategory) {
        await http.patch(`/api/admin/categories/${editingCategory.id}`, payload);
        notifications.show({ message: '分类更新成功', color: 'green' });
      } else {
        await http.post('/api/admin/categories', payload);
        notifications.show({ message: '分类创建成功', color: 'green' });
      }
      setModalOpened(false);
      fetchCategories();
    } catch (e: any) {
      notifications.show({
        title: '错误',
        message: e.response?.data?.message || '操作失败',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？如果存在子分类，也将被级联删除。')) return;

    setLoading(true);
    try {
      await http.delete(`/api/admin/categories/${id}`);
      notifications.show({ message: '删除成功', color: 'green' });
      fetchCategories();
    } catch (e: any) {
      notifications.show({
        title: '错误',
        message: e.response?.data?.message || '删除失败',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 排序操作 (仅在同级内排序)
  const handleSort = async (id: string, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const siblings = categories
      .filter(c => c.parentId === category.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const index = siblings.findIndex(c => c.id === id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const target = siblings[targetIndex];

    setLoading(true);
    try {
      // 更加稳健的排序逻辑：确保权重不完全一致，或者直接交换
      const updates = [
        { id: category.id, sortOrder: target.sortOrder },
        { id: target.id, sortOrder: category.sortOrder },
      ];

      // 如果两个权重本来就一样，手动拉开差距
      if (category.sortOrder === target.sortOrder) {
        if (direction === 'up') {
          updates[0].sortOrder = target.sortOrder - 1;
        } else {
          updates[0].sortOrder = target.sortOrder + 1;
        }
      }

      await http.patch('/api/admin/categories', updates);
      fetchCategories();
    } catch (e) {
      notifications.show({ message: '排序失败', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box h="100%" pos="relative">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

      <Flex direction="column" h="100%" bg="white" style={{ borderRadius: isMobile ? 0 : rem(12), overflow: 'hidden' }}>
        {/* 顶部导航 */}
        <Box p="md" bg="white" style={{ borderBottom: '1px solid #f0f0f0' }}>
          <Flex justify="space-between" align="center">
            <Group gap="xs">
              <ActionIcon variant="subtle" color="gray" onClick={() => router.back()}>
                <IconChevronLeft size={24} />
              </ActionIcon>
              <Text fw={700} size="lg">分类管理</Text>
            </Group>
            <Button
              leftSection={<IconPlus size={18} />}
              radius="xl"
              color="yellow.6"
              onClick={() => handleOpenModal()}
            >
              新增分类
            </Button>
          </Flex>
        </Box>

        {/* 列表区域 */}
        <ScrollArea style={{ flex: 1 }} p="md">
          <Stack gap="xs">
            {categories.length > 0 ? (
              getTreeData().map((category, index, array) => {
                const siblings = array.filter(c => c.parentId === category.parentId);
                const siblingIndex = siblings.findIndex(c => c.id === category.id);

                return (
                  <Flex
                    key={category.id}
                    p="md"
                    align="center"
                    justify="space-between"
                    style={{
                      border: '1px solid #eee',
                      borderRadius: rem(8),
                      backgroundColor: '#fff',
                      marginLeft: rem(category.depth * 32),
                      borderLeft: category.depth > 0 ? `${rem(4)} solid #eee` : undefined,
                    }}
                  >
                    <Box>
                      <Group gap="xs">
                        {category.depth > 0 && <Text c="dimmed">L{category.depth}</Text>}
                        <Text fw={600}>{category.name}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">排序权重: {category.sortOrder}</Text>
                    </Box>

                    <Group gap="xs">
                      <Group gap={0}>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          disabled={siblingIndex === 0}
                          onClick={() => handleSort(category.id, 'up')}
                        >
                          <IconArrowNarrowUp size={20} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          disabled={siblingIndex === siblings.length - 1}
                          onClick={() => handleSort(category.id, 'down')}
                        >
                          <IconArrowNarrowDown size={20} />
                        </ActionIcon>
                      </Group>

                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleOpenModal(category)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>

                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(category.id)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Flex>
                );
              })
            ) : !loading && (
              <Stack align="center" py={100} gap="xs">
                <Text c="dimmed">暂无分类数据</Text>
              </Stack>
            )}
          </Stack>
        </ScrollArea>
      </Flex>

      {/* 新增/编辑弹窗 */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingCategory ? '编辑分类' : '新增分类'}
        centered
        radius="md"
      >
        <Stack>
          <TextInput
            label="分类名称"
            placeholder="如：七夕限定"
            required
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
          />
          <Select
            label="上级分类"
            placeholder="请选择上级分类（可选）"
            data={[
              { value: '', label: '无（作为一级分类）' },
              ...getTreeData()
                .filter(c => {
                  // 1. 不能选自己
                  if (c.id === editingCategory?.id) return false;
                  // 2. 简单的环路保护：目前仅支持最多二级
                  if (c.depth >= 1) return false;
                  return true;
                })
                .map(c => ({
                  value: c.id,
                  label: `${'  '.repeat(c.depth)}${c.name}`
                }))
            ]}
            value={formParentId || ''}
            onChange={(val) => setFormParentId(val || null)}
            clearable
          />
          <NumberInput
            label="排序权重"
            description="数值越小越靠前"
            value={formSort}
            onChange={setFormSort}
          />
          <Switch
            label="在前台显示"
            checked={formVisible}
            onChange={(e) => setFormVisible(e.currentTarget.checked)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setModalOpened(false)}>取消</Button>
            <Button color="yellow.6" onClick={handleSubmit} loading={loading}>提交</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

