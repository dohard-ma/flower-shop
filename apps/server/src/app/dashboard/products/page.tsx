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
  Popover,
  Table,
  NumberInput,
  Select,
} from '@mantine/core';
import { useMediaQuery, useIntersection } from '@mantine/hooks';
import {
  IconSearch,
  IconPlus,
  IconCategory,
  IconArrowsSort,
  IconListCheck,
  IconPhoto,
  IconChevronDown,
  IconInfoCircle,
  IconDownload,
} from '@tabler/icons-react';
import { http } from '@/lib/request';

// --- 类型定义 ---
export interface ProductVariant {
  id: string;
  name: string;
  stock: number;
  price: number;
  costPrice: number;
  storeCode: string | null;
  channelData: any; 
}

export interface ProductChannel {
  channel: {
    id: string;
    code: string;
    name: string;
    icon?: string | null;
  };
  price: number;
  isListed: boolean;
}

export interface StoreCategory {
  id: string;
  name: string;
  sortOrder: number;
  parentId?: string | null;
}

export interface Product {
  id: string;
  displayId: string;
  name: string;
  images: string[];
  priceRef: string;
  status: 'ACTIVE' | 'INACTIVE';
  variants: ProductVariant[];
  channels: ProductChannel[];
  categories?: { category: StoreCategory }[];
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

// --- 子组件：规格悬浮窗内容 ---
const VariantsPopover = ({ variants }: { variants: ProductVariant[] }) => {
  return (
    <Box p="xs">
      <Table variant="unstyled" verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th><Text size="xs" c="dimmed">规格</Text></Table.Th>
            <Table.Th><Text size="xs" c="dimmed">价格</Text></Table.Th>
            <Table.Th><Text size="xs" c="dimmed">库存</Text></Table.Th>
            <Table.Th><Text size="xs" c="dimmed">店内码</Text></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {variants.map((v) => (
            <Table.Tr key={v.id}>
              <Table.Td><Text size="xs" fw={500}>{v.name}</Text></Table.Td>
              <Table.Td><Text size="xs" c="red.7">¥{v.price}</Text></Table.Td>
              <Table.Td><Text size="xs">{v.stock}</Text></Table.Td>
              <Table.Td><Text size="xs" c="dimmed">{v.storeCode || '-'}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
};

// --- 子组件：商品项 (响应式适配) ---
const ProductItem = ({ product, onEdit, isMobile }: { product: Product; onEdit: (id: string) => void; isMobile: boolean }) => {
  const images = Array.isArray(product.images) ? product.images : [];
  const mainImage = images[0];
  const variantsCount = product.variants?.length || 0;
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  
  const prices = product.variants?.map(v => Number(v.price)) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : product.priceRef;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.priceRef;
  const priceDisplay = minPrice === maxPrice ? `¥${minPrice}` : `¥${minPrice}-${maxPrice}`;

  if (isMobile) {
    return (
      <Box py="md" style={{ borderBottom: `${rem(1)} solid #f5f5f5` }}>
        <Flex gap="sm">
          <Box pos="relative" w={80} h={80} style={{ flexShrink: 0 }}>
            {mainImage ? (
              <Image src={mainImage} radius="sm" w={80} h={80} fit="cover" alt={product.name} />
            ) : (
              <Box w={80} h={80} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
                <IconPhoto size={24} color="#ddd" />
              </Box>
            )}
            {product.status === 'INACTIVE' && (
              <Box pos="absolute" bottom={0} left={0} right={0} bg="rgba(0,0,0,0.6)" py={2} style={{ borderBottomLeftRadius: rem(4), borderBottomRightRadius: rem(4) }}>
                <Text size="10px" c="white" ta="center">已下架</Text>
              </Box>
            )}
          </Box>

          <Stack gap={2} style={{ flex: 1, overflow: 'hidden' }}>
            <Text size="sm" fw={700} lineClamp={1} style={{ lineHeight: 1.3 }}>
              {product.name}
            </Text>
            
            <Group gap={4} mt={1}>
              <Text size="xs" c="dimmed">SPU: {product.displayId}</Text>
              {product.channels?.filter(c => c.isListed).map(pc => (
                <Box key={pc.channel.code} style={{ display: 'flex', alignItems: 'center' }}>
                  {pc.channel.icon ? (
                    <Image src={pc.channel.icon} w={14} h={14} radius="xs" alt={pc.channel.name} />
                  ) : (
                    <Badge size="xs" variant="outline" color="gray" px={2} h={14} radius="xs" style={{ border: '1px solid #eee', color: '#999', fontSize: '8px', lineHeight: '12px' }}>
                      {pc.channel.name.slice(0, 1)}
                    </Badge>
                  )}
                </Box>
              ))}
            </Group>

            <Group gap="xs" mt={2}>
              <Text size="xs" c="dimmed">月售 0</Text>
              <Text size="xs" c="dimmed">库存 {totalStock}</Text>
            </Group>
            <Group gap={4} align="baseline" mt={2}>
              <Text size="md" c="red.7" fw={700}>{priceDisplay}</Text>
            </Group>

            <Group justify="flex-end" gap="xs" mt="auto">
              <Button variant="outline" color="gray" size="compact-xs" radius="xl" fw={400} px="sm" style={{ borderColor: '#eee' }}>
                价格/库存
              </Button>
              <Button variant="outline" color="gray" size="compact-xs" radius="xl" fw={400} px="sm" style={{ borderColor: '#eee' }}>
                下架
              </Button>
              <Button
                variant="outline"
                color="gray"
                size="compact-xs"
                radius="xl"
                fw={400}
                px="sm"
                style={{ borderColor: '#eee' }}
                onClick={() => onEdit(product.id)}
              >
                编辑
              </Button>
            </Group>
          </Stack>
        </Flex>
      </Box>
    );
  }

  return (
    <Box py="md" style={{ borderBottom: `${rem(1)} solid #f5f5f5` }}>
      <Flex align="center">
        <Flex gap="sm" style={{ width: '35%', overflow: 'hidden' }}>
          <Box pos="relative" w={80} h={80} style={{ flexShrink: 0 }}>
            {mainImage ? (
              <Image src={mainImage} radius="sm" w={80} h={80} fit="cover" alt={product.name} />
            ) : (
              <Box w={80} h={80} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
                <IconPhoto size={24} color="#ddd" />
              </Box>
            )}
          </Box>
          <Stack gap={4} justify="center" style={{ overflow: 'hidden' }}>
            <Text size="sm" fw={600} lineClamp={1} style={{ cursor: 'pointer' }} onClick={() => onEdit(product.id)}>
              {product.name}
            </Text>
            <Group gap={6} align="center">
              <Text size="xs" c="dimmed">SPU: {product.displayId}</Text>
              <Group gap={4}>
                {product.channels?.filter(c => c.isListed).map(pc => (
                  <Box key={pc.channel.code} style={{ display: 'flex', alignItems: 'center' }}>
                    {pc.channel.icon ? (
                      <Image src={pc.channel.icon} w={16} h={16} radius="xs" alt={pc.channel.name} />
                    ) : (
                      <Badge key={pc.channel.code} size="xs" variant="outline" color="gray" px={4} radius="xs" style={{ border: '1px solid #eee', color: '#999', fontSize: '9px' }}>
                        {pc.channel.name.slice(0, 2)}
                      </Badge>
                    )}
                  </Box>
                ))}
              </Group>
            </Group>
          </Stack>
        </Flex>

        <Box style={{ width: '20%' }} px="xs">
          <Text size="xs" c="dimmed">条形码: -</Text>
          <Text size="xs" c="dimmed">店内码/货号: {product.variants?.[0]?.storeCode || '-'}</Text>
          {variantsCount > 1 && (
            <Popover width={400} position="bottom" withArrow shadow="md" trigger="hover" openDelay={100} closeDelay={200}>
              <Popover.Target>
                <Text size="xs" c="blue.6" style={{ cursor: 'pointer' }}>查看全部 {variantsCount} 个规格</Text>
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <VariantsPopover variants={product.variants} />
              </Popover.Dropdown>
            </Popover>
          )}
        </Box>

        <Box style={{ width: '15%' }} px="xs">
          <Text size="sm" fw={700} c="red.7">{priceDisplay}</Text>
        </Box>

        <Box style={{ width: '10%' }} px="xs" ta="center">
          <Text size="sm">0</Text>
        </Box>

        <Box style={{ width: '10%' }} px="xs" ta="center">
          <Text size="sm">{totalStock}</Text>
        </Box>

        <Stack gap={4} style={{ width: '10%' }} align="flex-end">
          <UnstyledButton onClick={() => onEdit(product.id)}>
            <Text size="xs" c="orange.7">编辑</Text>
          </UnstyledButton>
          <UnstyledButton>
            <Text size="xs" c="orange.7">{product.status === 'ACTIVE' ? '下架' : '上架'}</Text>
          </UnstyledButton>
          <UnstyledButton>
            <Text size="xs" c="orange.7">删除</Text>
          </UnstyledButton>
        </Stack>
      </Flex>
    </Box>
  );
};

export default function ProductDashboardPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 48em)');

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

  const fetchCategories = useCallback(async () => {
    try {
      const res = await http.get<StoreCategory[]>('/api/admin/categories');
      setCategories(res.data || []);
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
  }, [activeTab, search, activeMenuId, categories.length, page, pageSize, selectedChannels]);

  useEffect(() => {
    fetchCategories();
    fetchChannels();
  }, [fetchCategories, fetchChannels]);

  useEffect(() => {
    fetchProducts(true);
  }, [activeTab, search, activeMenuId, selectedChannels, fetchProducts]);

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

  const viewportRef = useRef<HTMLDivElement>(null);
  const { ref, entry } = useIntersection({
    root: viewportRef.current,
    threshold: 0,
    rootMargin: '400px',
  });

  const hasMore = products.length < total;

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !loading && !loadingMore) {
      fetchProducts(false);
    }
  }, [entry?.isIntersecting, hasMore, loading, loadingMore, fetchProducts]);

  const ActionButtons = (
    <Group gap="xs" grow={isMobile}>
      {isMobile ? (
         <Flex direction="row" justify="space-between" w="100%" px="xs" py="xs" bg="white">
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
                size="sm"
                onClick={() => router.push('/dashboard/products/new')}
            >
                商品新建
            </Button>
         </Flex>
      ) : (
        <>
            <Button variant="default" leftSection={<IconDownload size={16} />} size="xs">下载全部商品</Button>
            <Button variant="default" size="xs">重置</Button>
            <Button color="yellow.6" size="xs" onClick={() => fetchProducts(true)}>查询</Button>
        </>
      )}
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
      <Box p="sm" bg="white" style={{ borderBottom: '1px solid #f0f0f0' }}>
        <Stack gap="xs">
          <Flex gap="md" align="center">
            <TextInput
              placeholder="请输入商品名称/品牌/条码查找"
              leftSection={<IconSearch size={18} color="#999" />}
              radius="xl"
              style={{ flex: 1 }}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              styles={{
                  input: {
                      backgroundColor: '#f5f5f5',
                      border: 'none',
                      borderRadius: rem(20),
                  }
              }}
            />
            {!isMobile && ActionButtons}
          </Flex>
          {!isMobile && (
            <Flex gap="md" align="center">
                <Select
                    placeholder="库存状态"
                    size="xs"
                    data={['全部', '售罄', '库存充足']}
                    style={{ width: 150 }}
                />
                <Flex align="center" gap={4}>
                    <Text size="xs">月售</Text>
                    <NumberInput size="xs" placeholder="最小值" style={{ width: 80 }} />
                    <Text size="xs">-</Text>
                    <NumberInput size="xs" placeholder="最大值" style={{ width: 80 }} />
                </Flex>
                <MultiSelect
                    data={channels.map(c => ({ value: c.code, label: c.name }))}
                    placeholder="更多"
                    size="xs"
                    clearable
                    value={selectedChannels}
                    onChange={setSelectedChannels}
                    style={{ width: 120 }}
                />
            </Flex>
          )}
        </Stack>
      </Box>

      <Flex style={{ flex: 1, overflow: 'hidden' }}>
        <Box w={isMobile ? 100 : 160} bg="#f8f8f8" style={{ borderRight: '1px solid #f0f0f0', position: 'relative' }}>
          <Flex direction="column" h="100%">
            <Box bg={activeMenuId === 'all' ? 'white' : 'transparent'}>
              <UnstyledButton
                w="100%"
                p={isMobile ? "md" : "lg"}
                style={{
                  borderLeft: activeMenuId === 'all' ? `${rem(4)} solid #fab005` : 'none',
                  backgroundColor: activeMenuId === 'all' ? '#fff' : 'transparent',
                }}
                onClick={() => setActiveMenuId('all')}
              >
                <Text size="sm" ta="center" fw={activeMenuId === 'all' ? 700 : 400}>全部</Text>
              </UnstyledButton>
            </Box>

            <ScrollArea style={{ flex: 1 }}>
              <Stack gap={0}>
                {getTreeCategories().map((category) => (
                  <UnstyledButton
                    key={category.id}
                    p={isMobile ? "xs" : "sm"}
                    style={{
                      borderLeft: activeMenuId === category.id ? `${rem(4)} solid #fab005` : 'none',
                      backgroundColor: activeMenuId === category.id ? '#fff' : 'transparent',
                      paddingLeft: rem(category.depth * 12 + (isMobile ? 8 : 16)),
                    }}
                    onClick={() => setActiveMenuId(category.id)}
                  >
                    <Text
                      size="sm"
                      fw={activeMenuId === category.id ? 700 : 400}
                      lineClamp={1}
                      c={category.depth > 0 ? 'dimmed' : undefined}
                    >
                      {category.name}
                    </Text>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea>

            <Box bg={activeMenuId === 'uncategorized' ? 'white' : 'transparent'} style={{ borderTop: '1px solid #f0f0f0' }}>
              <UnstyledButton
                w="100%"
                p={isMobile ? "xs" : "sm"}
                style={{
                  borderLeft: activeMenuId === 'uncategorized' ? `${rem(4)} solid #fab005` : 'none',
                  backgroundColor: activeMenuId === 'uncategorized' ? '#fff' : 'transparent',
                }}
                onClick={() => setActiveMenuId('uncategorized')}
              >
                <Group gap={4} justify="center">
                  <Text size="xs">未分类</Text>
                  <IconInfoCircle size={12} color="#999" />
                </Group>
              </UnstyledButton>
            </Box>
          </Flex>
        </Box>

        <Box style={{ flex: 1, overflow: 'hidden' }} pos="relative">
          <LoadingOverlay visible={loading} loaderProps={{ children: <Loader size="sm" color="yellow.6" /> }} overlayProps={{ blur: 1 }} zIndex={10} />

          <Flex direction="column" h="100%">
            <Box bg="white" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <Tabs 
                value={activeTab} 
                onChange={setActiveTab} 
                styles={{
                    tab: {
                        fontWeight: 500,
                        '&[data-active]': {
                            color: '#fab005',
                            borderBottomColor: '#fab005',
                        }
                    }
                }}
              >
                <Tabs.List px="xs">
                  <Tabs.Tab value="ALL">全部 {total || ''}</Tabs.Tab>
                  <Tabs.Tab value="ACTIVE">售卖中</Tabs.Tab>
                  <Tabs.Tab value="SOLD_OUT">已售罄</Tabs.Tab>
                  <Tabs.Tab value="INACTIVE">已下架</Tabs.Tab>
                </Tabs.List>
              </Tabs>
            </Box>

            {!isMobile && (
              <Box px="md" py="xs" bg="#fafafa" style={{ borderBottom: '1px solid #f0f0f0' }}>
                 <Flex align="center">
                    <Box style={{ width: '35%' }}><Text size="xs" fw={700} c="dimmed">商品信息</Text></Box>
                    <Box style={{ width: '20%' }} px="xs"><Text size="xs" fw={700} c="dimmed">条形码/店内码/货号</Text></Box>
                    <Box style={{ width: '15%' }} px="xs"><Text size="xs" fw={700} c="dimmed">价格</Text></Box>
                    <Box style={{ width: '10%' }} px="xs" ta="center"><Text size="xs" fw={700} c="dimmed">月售</Text></Box>
                    <Box style={{ width: '10%' }} px="xs" ta="center"><Text size="xs" fw={700} c="dimmed">库存</Text></Box>
                    <Box style={{ width: '10%' }} px="xs" ta="right"><Text size="xs" fw={700} c="dimmed">操作</Text></Box>
                 </Flex>
              </Box>
            )}

            {isMobile && (
                <Group px="md" py="xs" justify="space-between" bg="white">
                    <Group gap="lg">
                        <UnstyledButton><Group gap={2}><Text size="xs" c="dimmed">创建时间</Text><IconArrowsSort size={12} /></Group></UnstyledButton>
                        <UnstyledButton><Group gap={2}><Text size="xs" c="dimmed">月售</Text><IconArrowsSort size={12} /></Group></UnstyledButton>
                    </Group>
                    <UnstyledButton><Group gap={2}><Text size="xs" c="dimmed" fw={500}>筛选</Text><IconChevronDown size={12} /></Group></UnstyledButton>
                </Group>
            )}

            <ScrollArea style={{ flex: 1 }} px="md" viewportRef={viewportRef}>
              <Stack gap={0}>
                {products.map((p) => (
                  <ProductItem 
                    key={p.id} 
                    product={p} 
                    onEdit={(id) => router.push(`/dashboard/products/${id}`)} 
                    isMobile={!!isMobile}
                  />
                ))}

                <Box ref={ref} py="xl">
                  {hasMore ? (
                    <Flex justify="center"><Loader size="xs" color="yellow.6" /></Flex>
                  ) : products.length > 0 && (
                    <Text size="xs" c="dimmed" ta="center">已经到底啦 ~</Text>
                  )}
                </Box>
              </Stack>
            </ScrollArea>
          </Flex>
        </Box>
      </Flex>

      {isMobile && (
        <Box
          p={0}
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
