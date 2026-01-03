'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Text,
  Stack,
  LoadingOverlay,
  rem,
  Box,
  Flex,
  ScrollArea,
  Loader,
  TextInput,
  Button,
  Title,
  Group,
  Checkbox,
  Alert,
  Menu,
  ActionIcon,
  Collapse
} from '@mantine/core';
import { useMediaQuery, useDisclosure } from '@mantine/hooks';
import { IconSearch, IconPlus, IconDownload, IconSettings, IconChevronDown, IconTrash, IconArrowUp, IconArrowDown, IconTag, IconAlertCircle, IconCurrencyDollar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import InfiniteScroll from 'react-infinite-scroll-component';

import { http } from '@/lib/request';
import { ProductItem } from './components/ProductItem';
import { CategorySidebar } from './components/CategorySidebar';
import { StatusTabs } from './components/StatusTabs';
import { ProductFilterBar } from './components/ProductFilterBar';
import { BatchChannelPriceModal } from './components/BatchChannelPriceModal';
import {
  Product,
  StoreCategory,
  Channel,
  ApiResponse,
  SummaryCounts,
  ProductStatus
} from './types';

/**
 * 商品管理主页面组件
 * 负责商品列表的筛选、分页加载、分类切换以及基础统计展示
 */

export default function ProductDashboardPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 从 URL 初始化状态
  const initialActiveTab =
    (searchParams.get('status') as ProductStatus) || 'ALL';
  const initialSearch = searchParams.get('search') || '';
  const initialMenuId = searchParams.get('menuId') || 'all';
  const initialChannels =
    searchParams.get('channels')?.split(',').filter(Boolean) || [];
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string>(initialMenuId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<ProductStatus>(initialActiveTab);
  const [search, setSearch] = useState(initialSearch);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] =
    useState<string[]>(initialChannels);
  const [page, setPage] = useState(initialPage);
  const pageSize = 20;

  const [summaryCounts, setSummaryCounts] = useState<SummaryCounts>({
    all: 0,
    uncategorized: 0
  });

  // --- 批量选择相关状态 ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllSelectedAcrossPages, setIsAllSelectedAcrossPages] = useState(false);
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [channelPriceModalOpen, setChannelPriceModalOpen] = useState(false);

  // 当筛选条件改变时，清除选中状态
  useEffect(() => {
    setSelectedIds([]);
    setIsAllSelectedAcrossPages(false);
  }, [activeTab, search, activeMenuId, selectedChannels]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map(p => p.id));
      setIsAllSelectedAcrossPages(true);
    } else {
      setSelectedIds([]);
      setIsAllSelectedAcrossPages(false);
    }
  };

  const handleBatchAction = (action: 'status' | 'category', value: any) => {
    const count = isAllSelectedAcrossPages ? total : selectedIds.length;
    let actionLabel = '';
    
    if (action === 'status') {
      actionLabel = value === 'ACTIVE' ? '批量上架' : '批量下架';
    } else {
      const cat = categories.find(c => c.id === value[0]);
      actionLabel = `设置为分类: ${cat?.name || '未知'}`;
    }

    modals.openConfirmModal({
      title: '批量操作确认',
      centered: true,
      children: (
        <Text size="sm">
          您确定要对所选的 <Text span fw={700} c="yellow.7">{count}</Text> 个商品执行 <Text span fw={700}>{actionLabel}</Text> 吗？
        </Text>
      ),
      labels: { confirm: '确认执行', cancel: '取消' },
      confirmProps: { color: 'yellow.6' },
      onConfirm: async () => {
        setIsBatchApplying(true);
        try {
          await http.post('/api/admin/products/batch', {
            ids: selectedIds, // 这里暂时传 ID，如果后端支持全选结果，则可以改造
            action,
            value
          });

          notifications.show({
            title: '操作成功',
            message: `已完成 ${count} 个商品的批量处理`,
            color: 'green'
          });
          
          fetchProducts(true);
          setSelectedIds([]);
          setIsAllSelectedAcrossPages(false);
        } catch (e) {
          notifications.show({
            title: '操作失败',
            message: '系统繁忙，请稍后重试',
            color: 'red'
          });
        } finally {
          setIsBatchApplying(false);
        }
      },
    });
  };

  // 同步状态到 URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (activeTab && activeTab !== 'ALL') params.set('status', activeTab);
    else params.delete('status');

    if (search) params.set('search', search);
    else params.delete('search');

    if (activeMenuId && activeMenuId !== 'all')
      params.set('menuId', activeMenuId);
    else params.delete('menuId');

    if (selectedChannels.length > 0)
      params.set('channels', selectedChannels.join(','));
    else params.delete('channels');

    if (page > 1) params.set('page', page.toString());
    else params.delete('page');

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    // 使用 replace 避免产生过多的历史记录
    router.replace(url);
  }, [
    activeTab,
    search,
    activeMenuId,
    selectedChannels,
    page,
    pathname,
    router,
    searchParams
  ]);

  /**
   * 获取概览统计数据（全部商品数、未分类商品数）
   */
  const fetchSummaryCounts = useCallback(async () => {
    const params = new URLSearchParams({
      status: activeTab === 'ALL' ? '' : activeTab || '',
      search,
      channels: selectedChannels.join(','),
      limit: '1'
    });

    try {
      const [allRes, uncategorizedRes] = await Promise.all([
        http.get<ApiResponse<Product>>(
          `/api/admin/products?${params.toString()}`
        ),
        http.get<ApiResponse<Product>>(
          `/api/admin/products?${params.toString()}&uncategorized=true`
        )
      ]);
      setSummaryCounts({
        all: allRes.data.total || 0,
        uncategorized: uncategorizedRes.data.total || 0
      });
    } catch (e) {
      console.error('Failed to fetch summary counts');
    }
  }, [activeTab, search, selectedChannels]);

  /**
   * 获取所有可用的分类树
   */
  const fetchCategories = useCallback(async () => {
    const params = new URLSearchParams({
      status: activeTab === 'ALL' ? '' : activeTab || '',
      search,
      channels: selectedChannels.join(',')
    });
    try {
      const res = await http.get<StoreCategory[]>(
        `/api/admin/categories?${params.toString()}`
      );
      setCategories(res.data || []);
    } catch (e) {
      console.error('Failed to fetch categories');
    }
  }, [activeTab, search, selectedChannels]);

  /**
   * 获取系统配置的所有渠道
   */
  const fetchChannels = useCallback(async () => {
    try {
      const res = await http.get<Channel[]>('/api/admin/channels');
      setChannels(res.data || []);
    } catch (e) {
      console.error('Failed to fetch channels');
    }
  }, []);

  // 分页控制锁与状态
  const pageRef = useRef(page);
  const fetchingRef = useRef(false);

  /**
   * 核心数据拉取函数：拉取商品列表
   * @param reset - 是否重置列表（用于切换分类或筛选条件时）
   */
  const fetchProducts = useCallback(
    async (reset = true) => {
      if (fetchingRef.current && !reset) return;

      fetchingRef.current = true;
      if (reset) {
        setLoading(true);
        setProducts([]);
        pageRef.current = 1;
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      try {
        const targetPage = reset ? 1 : pageRef.current + 1;

        const params = new URLSearchParams({
          status: activeTab === 'ALL' ? '' : activeTab || '',
          search,
          channels: selectedChannels.join(','),
          menuId:
            activeMenuId === 'all' || activeMenuId === 'uncategorized'
              ? ''
              : activeMenuId,
          uncategorized: activeMenuId === 'uncategorized' ? 'true' : '',
          page: targetPage.toString(),
          limit: pageSize.toString()
        });

        const res = await http.get<ApiResponse<Product>>(
          `/api/admin/products?${params.toString()}`
        );
        const newProducts = res.data.data || [];

        if (reset) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const uniqueNew = newProducts.filter((p) => !existingIds.has(p.id));
            return [...prev, ...uniqueNew];
          });
          pageRef.current = targetPage;
          setPage(targetPage);
        }
        setTotal(res.data.total || 0);
      } catch (e) {
        console.error('Failed to fetch products', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        fetchingRef.current = false;
      }
    },
    [activeTab, search, activeMenuId, pageSize, selectedChannels]
  );

  // --- 副作用处理 ---

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  /**
   * 监听筛选条件的变化
   * 合并了统计、分类和列表的刷新，并增加 150ms 防抖，防止频繁点击触发大量请求
   */
  useEffect(() => {
    fetchCategories();
    fetchSummaryCounts();

    const timer = setTimeout(() => {
      fetchProducts(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [
    activeTab,
    search,
    activeMenuId,
    selectedChannels,
    fetchCategories,
    fetchSummaryCounts,
    fetchProducts
  ]);

  // 用于滚动加载容器的唯一 ID，react-infinite-scroll-component 需要通过此 ID 找到滚动监听目标
  const scrollViewportId = 'products-scroll-viewport';

  // 计算是否还有下一页：已加载数量小于服务器返回的总数
  const hasMore = products.length < total;

  return (
    <Flex 
      direction='column' 
      bg='#f8f9fa' 
      h={isMobile ? '100vh' : 'calc(100vh - 60px - 32px)'} 
      p={isMobile ? 0 : 'md'} 
      style={{ overflow: 'hidden' }}
    >
      {/* 顶部标题栏 */}
      {!isMobile && (
        <Flex justify='space-between' align='center' mb='md'>
          <Title order={2} size='h3'>
            商品管理
          </Title>
          <Group gap='sm'>
            <Button
              variant='white'
              leftSection={<IconDownload size={16} />}
              style={{ border: '1px solid #dee2e6' }}
              c='black'
              onClick={() => {}}
              size='sm'
            >
              导出全部
            </Button>
            <Button
              color='yellow.6'
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push('/dashboard/products/new')}
              size='sm'
            >
              新建商品
            </Button>
          </Group>
        </Flex>
      )}

      <Flex
        direction='column'
        bg='white'
        style={{
          flex: 1,
          borderRadius: isMobile ? 0 : rem(12),
          overflow: 'hidden',
          boxShadow: isMobile
            ? 'none'
            : '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
          border: isMobile ? 'none' : '1px solid #eee'
        }}
      >
        {/* 顶部筛选栏 - 桌面端显示在顶部 */}
        {!isMobile && (
          <ProductFilterBar
            search={search}
            onSearchChange={setSearch}
            selectedChannels={selectedChannels}
            onChannelsChange={setSelectedChannels}
            channels={channels}
            isMobile={false}
            onQuery={() => fetchProducts(true)}
            onReset={() => {
              setSearch('');
              setSelectedChannels([]);
            }}
            onDownload={() => {}}
            onNew={() => router.push('/dashboard/products/new')}
            onManageCategories={() => router.push('/dashboard/categories')}
          />
        )}

        <Flex style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* 左侧分类导航 */}
          <CategorySidebar
            categories={categories}
            activeMenuId={activeMenuId}
            summaryCounts={summaryCounts}
            onCategoryClick={setActiveMenuId}
            isMobile={!!isMobile}
          />

          <Box style={{ flex: 1, overflow: 'hidden' }} pos='relative'>
            <LoadingOverlay
              visible={loading}
              loaderProps={{ children: <Loader size='sm' color='yellow.6' /> }}
              overlayProps={{ blur: 1 }}
              zIndex={10}
            />

            <Flex direction='column' h='100%'>
              {/* 商品状态切换 Tabs */}
              <StatusTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                total={total}
              />

              {/* 批量操作工具栏 */}
              <Collapse in={selectedIds.length > 0}>
                <Box px="md" py="sm" bg="gray.0" style={{ borderBottom: '1px solid #eee' }}>
                  <Flex justify="space-between" align="center">
                    <Group gap="md">
                      <Flex align="center" gap={4}>
                        <IconAlertCircle size={18} color="var(--mantine-color-blue-6)" />
                        <Text size="sm" fw={600}>
                          已选择 {isAllSelectedAcrossPages ? total : selectedIds.length} 个商品
                        </Text>
                      </Flex>
                      {!isAllSelectedAcrossPages && selectedIds.length < total && (
                         <Button 
                            variant="subtle" 
                            size="xs" 
                            onClick={() => setIsAllSelectedAcrossPages(true)}
                            c="blue.7"
                          >
                            改为选择全部检索结果({total})
                          </Button>
                      )}
                      <Button variant="subtle" size="xs" color="gray" onClick={() => handleSelectAll(false)}>
                        取消选择
                      </Button>
                    </Group>
                    
                    <Group gap="sm">
                      <Button 
                        size="sm" 
                        variant="filled" 
                        color="green.7"
                        leftSection={<IconArrowUp size={16} />}
                        onClick={() => handleBatchAction('status', 'ACTIVE')}
                        loading={isBatchApplying}
                        style={{ boxShadow: '0 2px 4px rgba(47, 158, 68, 0.2)' }}
                      >
                        批量上架
                      </Button>
                      <Button 
                        size="sm" 
                        variant="filled" 
                        color="gray.7"
                        leftSection={<IconArrowDown size={16} />}
                        onClick={() => handleBatchAction('status', 'INACTIVE')}
                        loading={isBatchApplying}
                        style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                      >
                        批量下架
                      </Button>
                      <Box style={{ width: 1, height: 24, background: '#eee', margin: '0 4px' }} />
                      <Menu position="bottom-end" shadow="md" width={200}>
                        <Menu.Target>
                          <Button 
                            size="sm" 
                            variant="filled" 
                            color="yellow.6"
                            leftSection={<IconTag size={16} />}
                            rightSection={<IconChevronDown size={16} />}
                            loading={isBatchApplying}
                            style={{ boxShadow: '0 2px 4px rgba(250, 176, 5, 0.2)' }}
                          >
                            设置分类
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>应用所选分类到商品</Menu.Label>
                          <ScrollArea.Autosize mah={300}>
                            {categories.map(cat => (
                              <Menu.Item 
                                key={cat.id} 
                                onClick={() => handleBatchAction('category', [cat.id])}
                                leftSection={<IconTag size={14} />}
                              >
                                {cat.name}
                              </Menu.Item>
                            ))}
                          </ScrollArea.Autosize>
                        </Menu.Dropdown>
                      </Menu>
                      <Button 
                        size="sm" 
                        variant="filled" 
                        color="orange.6"
                        leftSection={<IconCurrencyDollar size={16} />}
                        onClick={() => setChannelPriceModalOpen(true)}
                        style={{ boxShadow: '0 2px 4px rgba(255, 140, 0, 0.2)' }}
                      >
                        渠道定价
                      </Button>
                    </Group>
                  </Flex>
                </Box>
              </Collapse>

              {/* 表头 - 仅桌面端 */}
              {!isMobile && (
                <Box
                  px='md'
                  py='xs'
                  bg='#fafafa'
                  style={{ borderBottom: '1px solid #f0f0f0' }}
                >
                  <Flex align='center'>
                    <Box style={{ width: 40 }}>
                      <Checkbox 
                        size='xs' 
                        checked={selectedIds.length > 0 && selectedIds.length === products.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < products.length}
                        onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                      />
                    </Box>
                    <Box style={{ width: '35%' }}>
                      <Text size='xs' fw={700} c='dimmed'>
                        商品信息
                      </Text>
                    </Box>
                    <Box style={{ width: '15%' }} px='xs'>
                      <Text size='xs' fw={700} c='dimmed' ta='center'>
                        价格 (¥)
                      </Text>
                    </Box>
                    <Box style={{ width: '10%' }} px='xs' ta='center'>
                      <Text size='xs' fw={700} c='dimmed'>
                        库存
                      </Text>
                    </Box>
                    <Box style={{ width: '10%' }} px='xs' ta='center'>
                      <Text size='xs' fw={700} c='dimmed'>
                        销量
                      </Text>
                    </Box>
                    <Box style={{ width: '10%' }} px='xs' ta='center'>
                      <Text size='xs' fw={700} c='dimmed'>
                        状态
                      </Text>
                    </Box>
                    <Box style={{ width: '10%' }} px='xs' ta='right'>
                      <Text size='xs' fw={700} c='dimmed'>
                        操作
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              )}

              {/* 列表头部排序 - 仅移动端 */}
              {isMobile && (
                <Box p='xs' style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <TextInput
                    placeholder='搜索商品...'
                    leftSection={<IconSearch size={16} />}
                    radius='xl'
                    size='xs'
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                  />
                </Box>
              )}

              {/* 商品滚动列表 */}
              <ScrollArea
                style={{ flex: 1 }}
                px='md'
                viewportProps={{ id: scrollViewportId }}
              >
                <InfiniteScroll
                  dataLength={products.length}
                  next={() => fetchProducts(false)}
                  hasMore={hasMore}
                  loader={
                    <Flex justify='center' py='xl'>
                      <Loader size='xs' color='yellow.6' />
                    </Flex>
                  }
                  endMessage={
                    products.length > 0 && (
                      <Text size='xs' c='dimmed' ta='center' py='xl'>
                        已经到底啦 ~
                      </Text>
                    )
                  }
                  scrollableTarget={scrollViewportId}
                >
                  <Stack gap={0}>
                    {products.map((p) => (
                      <ProductItem
                        key={p.id}
                        product={p}
                        onEdit={(id) =>
                          router.push(`/dashboard/products/${id}`)
                        }
                        isMobile={!!isMobile}
                        selected={isAllSelectedAcrossPages || selectedIds.includes(p.id)}
                        onSelect={(checked) => {
                          if (checked) {
                            setSelectedIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== p.id));
                            setIsAllSelectedAcrossPages(false);
                          }
                        }}
                        onUpdate={(updatedProduct) => {
                          setProducts(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item));
                        }}
                      />
                    ))}
                  </Stack>
                </InfiniteScroll>
              </ScrollArea>
            </Flex>
          </Box>
        </Flex>

        {/* 底部按钮栏 - 仅移动端 */}
        {isMobile && (
          <ProductFilterBar
            search={search}
            onSearchChange={setSearch}
            selectedChannels={selectedChannels}
            onChannelsChange={setSelectedChannels}
            channels={channels}
            isMobile={true}
            onQuery={() => {}}
            onReset={() => {}}
            onDownload={() => {}}
            onNew={() => router.push('/dashboard/products/new')}
            onManageCategories={() => router.push('/dashboard/categories')}
          />
        )}
      </Flex>

      {/* 批量渠道价格弹窗 */}
      <BatchChannelPriceModal
        opened={channelPriceModalOpen}
        onClose={() => setChannelPriceModalOpen(false)}
        products={products.filter(p => selectedIds.includes(p.id))}
        channels={channels}
        onSuccess={() => {
          fetchProducts(true);
          setSelectedIds([]);
          setIsAllSelectedAcrossPages(false);
        }}
      />
    </Flex>
  );
}

