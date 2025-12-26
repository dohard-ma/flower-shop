'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Image,
  Stack,
  Modal,
  Select,
  Switch,
  LoadingOverlay,
  rem,
  ScrollArea,
  MultiSelect,
  NumberInput,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconFilter,
  IconRefresh,
  IconPhoto,
} from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';
import flowerMaterialsData from '@/data/flower-materials.json';

// 产品类型定义
export interface Product {
  id: string;
  name: string;
  category: string;
  style?: string;
  images: string[];
  videos?: string[];
  priceRef: string;
  materials: string[];
  targetAudience?: string[];
  size?: 'XS' | 'S' | 'M' | 'L';
  branchCount?: number;
  status: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ProductDashboardPage() {
  const router = useRouter();

  // 数据状态
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');

  // 分页状态
  const [activePage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 加载数据
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: activePage.toString(),
        limit: pageSize.toString(),
      });

      if (search) params.append('search', search);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await http.get<ApiResponse>(`/api/admin/products?${params.toString()}`);
      if (response && response.data) {
        setProducts(response.data.data || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      notifications.show({
        title: '获取失败',
        message: '获取产品列表失败，请稍后重试',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [activePage, pageSize, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此商品吗？')) return;

    try {
      await http.delete(`/api/admin/products?id=${id}`);
      notifications.show({
        title: '删除成功',
        message: '商品已成功删除',
        color: 'green',
      });
      fetchProducts();
    } catch (error) {
      notifications.show({
        title: '删除失败',
        message: '删除商品失败，请稍后重试',
        color: 'red',
      });
    }
  };

  const rows = products.map((product) => (
    <Table.Tr key={product.id}>
      <Table.Td>
        <Group gap="sm">
          {product.images?.[0] ? (
            <Image src={product.images[0]} w={40} h={40} radius="sm" />
          ) : (
            <Box w={40} h={40} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <IconPhoto size={20} color="gray" />
            </Box>
          )}
          <Text size="sm" fw={500}>{product.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge variant="light">{product.category}</Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">¥{product.priceRef}</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={product.status === 'ACTIVE' ? 'green' : 'gray'}>
          {product.status === 'ACTIVE' ? '上架' : '下架'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {new Date(product.updatedAt).toLocaleString()}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => router.push(`/dashboard/products/${product.id}`)}
          >
            <IconEdit size={16} stroke={1.5} />
          </ActionIcon>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => handleDelete(product.id)}
              >
                删除商品
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
            <Title order={2}>商品管理</Title>
            <Text c="dimmed" size="sm">管理您的店铺商品</Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => router.push('/dashboard/products/new')}
          >
            新增商品
          </Button>
        </Group>

        <Card withBorder radius="md">
          <Stack gap="md">
            <Group grow>
              <TextInput
                placeholder="搜索商品名称..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
              />
              <Select
                placeholder="选择分类"
                data={[
                  { value: 'all', label: '所有分类' },
                  { value: 'BOUQUET', label: '花束' },
                  { value: 'BASKET', label: '花篮' },
                  { value: 'BOX', label: '花盒' },
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
              <Select
                placeholder="状态"
                data={[
                  { value: 'all', label: '所有状态' },
                  { value: 'ACTIVE', label: '已上架' },
                  { value: 'INACTIVE', label: '已下架' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={fetchProducts}>
                刷新
              </Button>
            </Group>

            <Box pos="relative">
              <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
              <ScrollArea>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>商品名称</Table.Th>
                      <Table.Th>分类</Table.Th>
                      <Table.Th>价格</Table.Th>
                      <Table.Th>状态</Table.Th>
                      <Table.Th>更新时间</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.length > 0 ? rows : (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text ta="center" py="xl" c="dimmed">暂无商品</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Box>

            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">
                共 {total} 条数据
              </Text>
              <Pagination total={Math.ceil(total / pageSize)} value={activePage} onChange={setPage} />
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
