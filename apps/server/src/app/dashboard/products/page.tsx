'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Text,
  Group,
  Button,
  TextInput,
  ActionIcon,
  Image,
  Stack,
  Tabs,
  LoadingOverlay,
  rem,
  Box,
  Flex,
  UnstyledButton,
  ScrollArea,
  Divider,
  Badge,
  Loader,
  MultiSelect,
} from '@mantine/core';
import { useMediaQuery, useIntersection } from '@mantine/hooks';
import {
  IconSearch,
  IconPlus,
  IconDots,
  IconCategory,
  IconArrowsSort,
  IconListCheck,
  IconPhoto,
  IconChevronDown,
  IconInfoCircle,
} from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';

// --- 类型定义 ---
export interface Product {
  id: string;
  displayId: string;
  name: string;
  images: any;
  priceRef: string;
  status: 'ACTIVE' | 'INACTIVE';
  stock?: number;
  monthlySales?: number;
  categories?: { category: StoreCategory }[];
}

export interface StoreCategory {
  id: string;
  name: string;
  sortOrder: number;
  parentId?: string | null;
}

export interface Channel {
  id: string;
  code: string;
  name: string;
}

interface ApiResponse<T> {
  data: T[];
  total: number;
}

// --- 子组件：商品项 (高度还原美团风格) ---
const ProductItem = ({ product, onEdit }: { product: Product; onEdit: (id: string) => void }) => {
  const images = Array.isArray(product.images) ? product.images : [];
  const mainImage = images[0];

  return (
    <Box py="md" style={{ borderBottom: `${rem(1)} solid #f5f5f5` }}>
      <Flex gap="sm">
        {/* 商品图片 */}
        <Box pos="relative" w={110} h={110}>
          {mainImage ? (
            <Image src={mainImage} radius="sm" w={110} h={110} />
          ) : (
            <Box w={110} h={110} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
              <IconPhoto size={36} color="#ddd" />
            </Box>
          )}
        </Box>

        {/* 商品详情 */}
        <Stack gap={2} style={{ flex: 1 }}>
          <Text size="sm" fw={700} lineClamp={2} style={{ lineHeight: 1.3 }}>
            {product.name}
          </Text>
          <Group gap="xs" mt={2}>
            <Text size="xs" c="dimmed">月售 0</Text>
            <Text size="xs" c="dimmed">库存 999</Text>
          </Group>
          <Group gap={4} align="baseline" mt={4}>
            <Text size="xs" c="red.7" fw={700}>¥</Text>
            <Text size="xl" c="red.7" fw={700} style={{ lineHeight: 1 }}>{product.priceRef}</Text>
          </Group>

          {/* 操作按钮组 */}
          <Group justify="flex-end" gap="xs" mt="auto">
            <Button variant="outline" color="gray" size="compact-sm" radius="xl" fw={400} px="md" style={{ borderColor: '#ddd' }}>
              价格/库存
            </Button>
            <Button variant="outline" color="gray" size="compact-sm" radius="xl" fw={400} px="md" style={{ borderColor: '#ddd' }}>
              下架
            </Button>
            <Button
              variant="outline"
              color="gray"
              size="compact-sm"
              radius="xl"
              fw={400}
              px="md"
              style={{ borderColor: '#ddd' }}
              onClick={() => onEdit(product.id)}
            >
              编辑
            </Button>
          </Group>
        </Stack>
      </Flex>
    </Box>
  );
};

export default function ProductDashboardPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 48em)');

  // 状态管理
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<string | null>('ALL');
  const [search, setSearch] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 数据获取
  const fetchCategories = useCallback(async () => {
    try {
      const res = await http.get<StoreCategory[]>('/api/admin/categories');
      const data = res.data || [];
      setCategories(data);
    } catch (e) {
      console.error('Failed to fetch categories');
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await http.get<Channel[]>('/api/admin/channels');
      setChannels(res.data || []);
    } catch (e) {
      console.error('Failed to fetch channels');
    }
  }, []);

  const fetchProducts = useCallback(async (reset = true) => {
    if (!activeMenuId && categories.length > 0) return;

    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 1 : page + 1;
      const params = new URLSearchParams({
        status: activeTab === 'ALL' ? '' : activeTab || '',
        search,
        channels: selectedChannels.join(','),
        menuId: (activeMenuId === 'all' || activeMenuId === 'uncategorized') ? '' : activeMenuId,
        uncategorized: activeMenuId === 'uncategorized' ? 'true' : '',
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      const res = await http.get<ApiResponse<Product>>(`/api/admin/products?${params.toString()}`);

      if (reset) {
        setProducts(res.data.data || []);
      } else {
        setProducts(prev => [...prev, ...(res.data.data || [])]);
        setPage(currentPage);
      }
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, search, activeMenuId, categories.length, page, pageSize]);

  useEffect(() => {
    fetchCategories();
    fetchChannels();
  }, [fetchCategories, fetchChannels]);

  useEffect(() => {
    fetchProducts(true);
  }, [activeTab, search, activeMenuId, selectedChannels]);

  // 辅助函数：获取树形分类
  const getTreeCategories = () => {
    const rootNodes = categories.filter(c => !c.parentId);
    const sortedNodes: (StoreCategory & { depth: number })[] = [];

    const addChildren = (parent: StoreCategory, depth: number) => {
      sortedNodes.push({ ...parent, depth });
      const children = categories.filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      children.forEach(child => addChildren(child, depth + 1));
    };

    rootNodes.sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(root => addChildren(root, 0));

    return sortedNodes;
  };

  // 滚动加载逻辑
  const viewportRef = useRef<HTMLDivElement>(null);
  const { ref, entry } = useIntersection({
    root: viewportRef.current,
    threshold: 0,
    rootMargin: '400px', // 提前 400px 触发加载，提升滚动流畅度
  });

  const hasMore = products.length < total;

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !loading && !loadingMore) {
      fetchProducts(false);
    }
  }, [entry?.isIntersecting, hasMore, loading, loadingMore, fetchProducts]);

  // 操作栏 (响应式复用)
  const ActionButtons = (
    <Group gap="xs" grow={isMobile}>
      <UnstyledButton onClick={() => router.push('/dashboard/categories')}>
        <Stack gap={2} align="center">
          <IconCategory size={20} stroke={1.5} />
          <Text size="xs" fw={500}>分类管理</Text>
        </Stack>
      </UnstyledButton>
      <UnstyledButton>
        <Stack gap={2} align="center">
          <IconArrowsSort size={20} stroke={1.5} />
          <Text size="xs" fw={500}>商品排序</Text>
        </Stack>
      </UnstyledButton>
      <UnstyledButton>
        <Stack gap={2} align="center">
          <IconListCheck size={20} stroke={1.5} />
          <Text size="xs" fw={500}>批量操作</Text>
        </Stack>
      </UnstyledButton>
      <Button
        leftSection={<IconPlus size={18} />}
        radius="xl"
        color="yellow.6"
        size={isMobile ? 'md' : 'sm'}
        onClick={() => router.push('/dashboard/products/new')}
      >
        商品新建
      </Button>
    </Group>
  );

  return (
    <Flex
      h={isMobile ? "calc(100vh - 60px)" : "calc(100vh - 110px)"}
      direction="column"
      bg="white"
      style={{
        borderRadius: isMobile ? 0 : rem(12),
        overflow: 'hidden',
        boxShadow: isMobile ? 'none' : '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        border: isMobile ? 'none' : '1px solid #eee'
      }}
    >
      {/* 顶部搜索区 & PC 操作栏 */}
      <Box p="sm" bg="white" style={{ borderBottom: '1px solid #f0f0f0' }}>
        <Stack gap="xs">
          <Flex gap="md" align="center">
            <TextInput
              placeholder="请输入商品名称/品牌/条码查找"
              leftSection={<IconSearch size={18} color="#999" />}
              rightSection={<ActionIcon variant="transparent" color="gray"><IconArrowsSort size={18} /></ActionIcon>}
              radius="xl"
              style={{ flex: 1 }}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            {!isMobile && ActionButtons}
          </Flex>
          <MultiSelect
            data={channels.map(c => ({ value: c.code, label: c.name }))}
            placeholder="筛选渠道"
            size="xs"
            radius="xl"
            clearable
            searchable
            value={selectedChannels}
            onChange={setSelectedChannels}
            styles={{
                input: {
                    minHeight: rem(32),
                }
            }}
          />
        </Stack>
      </Box>

      {/* 主体双栏布局 */}
      <Flex style={{ flex: 1, overflow: 'hidden' }}>
        {/* 左侧菜单导航 (带底部悬浮“未分类”) */}
        <Box w={isMobile ? 110 : 160} bg="#f8f8f8" style={{ borderRight: '1px solid #eee', position: 'relative' }}>
          <Flex direction="column" h="100%">
            {/* 顶部固定：全部 */}
            <Box bg={activeMenuId === 'all' ? 'white' : '#f0f0f0'} style={{ borderBottom: '1px solid #eee' }}>
              <UnstyledButton
                w="100%"
                p={isMobile ? "md" : "lg"}
                style={{
                  borderLeft: activeMenuId === 'all' ? `${rem(4)} solid #fab005` : 'none',
                }}
                onClick={() => setActiveMenuId('all')}
              >
                <Text size="sm" fw={activeMenuId === 'all' ? 700 : 400}>全部</Text>
              </UnstyledButton>
            </Box>

            <ScrollArea style={{ flex: 1 }}>
              <Stack gap={0}>
                {/* 动态菜单 */}
                {getTreeCategories().map((category) => (
                  <UnstyledButton
                    key={category.id}
                    p={isMobile ? "xs" : "sm"}
                    bg={activeMenuId === category.id ? 'white' : 'transparent'}
                    style={{
                      borderLeft: activeMenuId === category.id ? `${rem(4)} solid #fab005` : 'none',
                      paddingLeft: rem(category.depth * 16 + (isMobile ? 12 : 16)),
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setActiveMenuId(category.id)}
                  >
                    <Text
                      size="sm"
                      fw={activeMenuId === category.id ? 700 : 400}
                      lineClamp={2}
                      c={category.depth > 0 ? 'dimmed' : undefined}
                    >
                      {category.name}
                    </Text>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea>

            {/* 底部固定：未分类 */}
            <Box bg={activeMenuId === 'uncategorized' ? 'white' : '#f0f0f0'} style={{ borderTop: '1px solid #eee' }}>
              <UnstyledButton
                w="100%"
                p={isMobile ? "md" : "lg"}
                style={{
                  borderLeft: activeMenuId === 'uncategorized' ? `${rem(4)} solid #fab005` : 'none',
                }}
                onClick={() => setActiveMenuId('uncategorized')}
              >
                <Group gap={4}>
                  <Text size="sm" fw={activeMenuId === 'uncategorized' ? 700 : 400}>未分类</Text>
                  <IconInfoCircle size={14} color="#999" />
                </Group>
              </UnstyledButton>
            </Box>
          </Flex>
        </Box>

        {/* 右侧商品列表区域 */}
        <Box style={{ flex: 1, overflow: 'hidden' }} pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} zIndex={10} />

          <Flex direction="column" h="100%">
            {/* 状态过滤 Tabs (美团样式) */}
            <Box px="xs" py={4} bg="white">
              <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
                <Tabs.List>
                  <Tabs.Tab value="ALL">全部 {total || ''}</Tabs.Tab>
                  <Tabs.Tab value="ACTIVE">售卖中</Tabs.Tab>
                  <Tabs.Tab value="SOLD_OUT">已售罄</Tabs.Tab>
                  <Tabs.Tab value="INACTIVE">已下架</Tabs.Tab>
                </Tabs.List>
              </Tabs>
            </Box>

            {/* 列表排序筛选栏 */}
            <Group px="md" py="xs" justify="space-between" bg="#fafafa" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <Group gap="lg">
                <UnstyledButton><Group gap={2}><Text size="xs" c="dimmed">创建时间</Text><IconChevronDown size={12} color="#999" /></Group></UnstyledButton>
                <UnstyledButton><Group gap={2}><Text size="xs" c="dimmed">月售</Text><IconChevronDown size={12} color="#999" /></Group></UnstyledButton>
              </Group>
              <UnstyledButton><Group gap={2}><Text size="xs" c="dimmed" fw={500}>筛选</Text><IconChevronDown size={12} color="#999" /></Group></UnstyledButton>
            </Group>

            {/* 滚动列表 */}
            <ScrollArea style={{ flex: 1 }} px="md" viewportRef={viewportRef}>
              {products.length > 0 ? (
                <>
                  {products.map((p) => (
                    <ProductItem key={p.id} product={p} onEdit={(id) => router.push(`/dashboard/products/${id}`)} />
                  ))}

                  {/* 滚动加载指示器 */}
                  <Box ref={ref} py="xl">
                    {hasMore ? (
                      <Flex justify="center" align="center" gap="xs">
                        <Loader size="xs" color="yellow.6" />
                        <Text size="xs" c="dimmed">正在加载更多商品...</Text>
                      </Flex>
                    ) : products.length > 0 && (
                      <Text size="xs" c="dimmed" ta="center">已经到底啦 ~</Text>
                    )}
                  </Box>
                </>
              ) : !loading && (
                <Stack align="center" py={100} gap="xs">
                  <IconPhoto size={48} color="#eee" />
                  <Text c="dimmed" size="sm">该分类下暂无商品</Text>
                </Stack>
              )}
              {/* 底部留白，防止被移动端悬浮按钮挡住 */}
              {isMobile && <Box h={80} />}
            </ScrollArea>
          </Flex>
        </Box>
      </Flex>

      {/* 移动端底部悬浮操作栏 */}
      {isMobile && (
        <Box
          p="xs"
          bg="white"
          style={{
            borderTop: '1px solid #eee',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
          }}
        >
          {ActionButtons}
        </Box>
      )}
    </Flex>
  );
}
