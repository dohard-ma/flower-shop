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
  Checkbox
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconSearch, IconPlus, IconDownload } from '@tabler/icons-react';
import InfiniteScroll from 'react-infinite-scroll-component';

import { http } from '@/lib/request';
import { ProductItem } from './components/ProductItem';
import { CategorySidebar } from './components/CategorySidebar';
import { StatusTabs } from './components/StatusTabs';
import { ProductFilterBar } from './components/ProductFilterBar';
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

  // 侧边栏及顶部 Tab 统计数据
  const [summaryCounts, setSummaryCounts] = useState<SummaryCounts>({
    all: 0,
    uncategorized: 0
  });

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
                      <Checkbox size='xs' />
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
    </Flex>
  );
}
