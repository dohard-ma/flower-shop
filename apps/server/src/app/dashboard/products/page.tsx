'use client';

import { useState, useMemo, useEffect, useCallback, startTransition } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Package,
  Loader2,
  ChevronDown,
  Grid3X3,
  List,
  SlidersHorizontal
} from 'lucide-react';
import { http } from '@/lib/request';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HierarchicalMultiSelect, HierarchicalOption } from '@/components/ui/hierarchical-multi-select';
import flowerMaterialsData from '@/data/flower-materials.json';

// 产品类型定义
export interface Product {
  id: string;
  name: string;
  category: string;
  style?: string; // 产品类型：花束、花篮、花盒、桌花、手捧花、抱抱桶、开业花篮、其他
  images: string[];
  videos?: string[];
  priceRef: string;
  materials: string[]; // 花材名称数组，直接存储花材名称
  targetAudience?: string[]; // 赠送对象数组，直接存储赠送对象名称
  size?: 'XS' | 'S' | 'M' | 'L';
  branchCount?: number;
  status: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// API响应类型
interface ApiResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ProductDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // 数据状态
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // 表格状态
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'updatedAt',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 移动端UI状态
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // 编辑状态
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editMaterials, setEditMaterials] = useState<string[]>([]);
  const [editSize, setEditSize] = useState<'XS' | 'S' | 'M' | 'L' | ''>('');
  const [editBranchCount, setEditBranchCount] = useState<number | ''>('');

  // 快速编辑状态（用于列表内联编辑）
  const [quickEditingProductId, setQuickEditingProductId] = useState<string | null>(null);
  const [quickEditMaterials, setQuickEditMaterials] = useState<Record<string, string[]>>({});
  const [quickEditTargetAudience, setQuickEditTargetAudience] = useState<Record<string, string[]>>({});
  const [quickEditStyle, setQuickEditStyle] = useState<Record<string, string>>({});
  const [quickEditSize, setQuickEditSize] = useState<Record<string, 'XS' | 'S' | 'M' | 'L' | ''>>({});
  const [quickEditBranchCount, setQuickEditBranchCount] = useState<Record<string, number | ''>>({});

  // 编辑弹窗状态
  const [editingDialogProduct, setEditingDialogProduct] = useState<Product | null>(null);
  const [dialogEditMaterials, setDialogEditMaterials] = useState<string[]>([]);
  const [dialogEditTargetAudience, setDialogEditTargetAudience] = useState<string[]>([]);
  const [dialogEditStyle, setDialogEditStyle] = useState<string>('');
  const [dialogEditSize, setDialogEditSize] = useState<'XS' | 'S' | 'M' | 'L' | ''>('');
  const [dialogEditBranchCount, setDialogEditBranchCount] = useState<number | ''>('');

  // 赠送对象选项
  const targetAudienceOptions: HierarchicalOption[] = [
    { label: '男友/老公' },
    { label: '女友/老婆' },
    { label: '新生儿' },
    { label: '学生' },
    { label: '父母' },
    { label: '闺蜜' },
    { label: '长辈' },
    { label: '朋友/同事' },
    { label: '老师' },
    { label: '客户' },
    { label: '病人' },
    { label: '儿童' },
  ];

  // 产品类型选项
  const styleOptions = [
    '花束',
    '花篮',
    '花盒',
    '桌花',
    '手捧花',
    '抱抱桶',
    '开业花篮',
    '其他'
  ];

  // 花材层级选项（从 JSON 文件加载）
  const mainFlowerOptions: HierarchicalOption[] = flowerMaterialsData as HierarchicalOption[];

  // 尺寸对应的默认枝数
  const sizeBranchCountMap: Record<'XS' | 'S' | 'M' | 'L', number> = {
    XS: 11,
    S: 18,
    M: 26,
    L: 38,
  };

  // 处理尺寸变化
  const handleSizeChange = (size: 'XS' | 'S' | 'M' | 'L' | '') => {
    setEditSize(size);
    if (size && sizeBranchCountMap[size]) {
      setEditBranchCount(sizeBranchCountMap[size]);
    } else {
      setEditBranchCount('');
    }
  };

  // 处理列表内联编辑的尺寸变化
  const handleQuickSizeChange = (productId: string, size: 'XS' | 'S' | 'M' | 'L' | '') => {
    setQuickEditSize(prev => ({ ...prev, [productId]: size }));
    if (size && sizeBranchCountMap[size]) {
      setQuickEditBranchCount(prev => ({ ...prev, [productId]: sizeBranchCountMap[size] }));
    } else {
      setQuickEditBranchCount(prev => ({ ...prev, [productId]: '' }));
    }
  };

  // 打开编辑弹窗
  const handleOpenEditDialog = useCallback((product: Product) => {
    setEditingDialogProduct(product);
    setDialogEditMaterials(product.materials || []);
    setDialogEditTargetAudience(product.targetAudience || []);
    setDialogEditStyle(product.style || '');
    setDialogEditSize(product.size || '');
    setDialogEditBranchCount(product.branchCount || '');
  }, []);

  // 保存编辑弹窗的修改
  const handleSaveDialogEdit = async () => {
    if (!editingDialogProduct) return;

    setLoading(true);
    try {
      const updateData: any = {
        materials: dialogEditMaterials,
        targetAudience: dialogEditTargetAudience,
        style: dialogEditStyle || null,
        size: dialogEditSize || null,
        branchCount: dialogEditBranchCount ? Number(dialogEditBranchCount) : null,
      };

      const response = await http.put(`/api/admin/products?id=${editingDialogProduct.id}`, updateData);

      // 只更新单条数据，不刷新整个列表
      if (response.success && response.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingDialogProduct.id ? { ...p, ...response.data } : p))
        );
      }

      toast({
        title: '更新成功',
        description: '商品信息已更新'
      });

      setEditingDialogProduct(null);
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理弹窗中的尺寸变化
  const handleDialogSizeChange = useCallback((size: 'XS' | 'S' | 'M' | 'L' | '') => {
    setDialogEditSize(size);
    if (size && sizeBranchCountMap[size]) {
      setDialogEditBranchCount(sizeBranchCountMap[size]);
    } else {
      setDialogEditBranchCount('');
    }
  }, []);

  // 保存快速编辑
  const handleSaveQuickEdit = async (productId: string) => {
    setLoading(true);
    try {
      const updateData: any = {
        materials: quickEditMaterials[productId] || [],
        targetAudience: quickEditTargetAudience[productId] || [],
        style: quickEditStyle[productId] || null,
        size: quickEditSize[productId] || null,
        branchCount: quickEditBranchCount[productId] ? Number(quickEditBranchCount[productId]) : null,
      };

      const response = await http.put(`/api/admin/products?id=${productId}`, updateData);

      // 只更新单条数据，不刷新整个列表
      if (response.success && response.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, ...response.data } : p))
        );
      }

      toast({
        title: '更新成功',
        description: '商品信息已更新'
      });

      // 清除快速编辑状态
      setQuickEditingProductId(null);
      const newMaterials = { ...quickEditMaterials };
      const newTargetAudience = { ...quickEditTargetAudience };
      const newStyle = { ...quickEditStyle };
      const newSize = { ...quickEditSize };
      const newBranchCount = { ...quickEditBranchCount };
      delete newMaterials[productId];
      delete newTargetAudience[productId];
      delete newStyle[productId];
      delete newSize[productId];
      delete newBranchCount[productId];
      setQuickEditMaterials(newMaterials);
      setQuickEditTargetAudience(newTargetAudience);
      setQuickEditStyle(newStyle);
      setQuickEditSize(newSize);
      setQuickEditBranchCount(newBranchCount);
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 打开编辑对话框
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditMaterials(product.materials || []);
    setEditSize(product.size || '');
    setEditBranchCount(product.branchCount || '');
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    setLoading(true);
    try {
      const updateData: any = {
        materials: editMaterials,
        size: editSize || null,
        branchCount: editBranchCount ? Number(editBranchCount) : null,
      };

      const response = await http.put(`/api/admin/products?id=${editingProduct.id}`, updateData);

      // 只更新单条数据，不刷新整个列表
      if (response.success && response.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? { ...p, ...response.data } : p))
        );
      }

      toast({
        title: '更新成功',
        description: '商品信息已更新'
      });

      setEditingProduct(null);
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取产品列表
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize
      };

      // 添加筛选参数
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await http.get<ApiResponse>(
        '/api/admin/products',
        params
      );

      if (response.success) {
        setProducts(response.data.data);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      toast({
        title: '获取产品列表失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchProducts();
  }, [
    currentPage,
    pageSize,
    categoryFilter,
    statusFilter
  ]);

  // 客户端筛选和排序逻辑（用于搜索和排序）
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // 客户端搜索筛选
    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 仅显示已上架产品
    if (showActiveOnly) {
      filtered = filtered.filter((product) => product.status === 'ACTIVE');
    }

    // 排序
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key!];
        let bValue: any = b[sortConfig.key!];

        if (sortConfig.key === 'sortOrder') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else if (
          sortConfig.key === 'createdAt' ||
          sortConfig.key === 'updatedAt'
        ) {
          aValue = new Date(aValue as string);
          bValue = new Date(bValue as string);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [products, searchTerm, showActiveOnly, sortConfig]);

  // 处理排序
  const handleSort = (key: keyof Product) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 将 selectedRows 转换为 Set 以提高查找性能
  const selectedRowsSet = useMemo(() => new Set(selectedRows), [selectedRows]);

  // 处理多选 - 使用 useCallback 优化
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredAndSortedProducts.map((p) => p.id));
    } else {
      setSelectedRows([]);
    }
  }, [filteredAndSortedProducts]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    // 立即更新状态（同步），确保复选框立即响应
    if (checked) {
      setSelectedRows((prev) => {
        // 如果已经选中，直接返回，避免不必要的更新
        if (prev.includes(id)) return prev;
        // 使用 Set 避免重复添加
        const set = new Set(prev);
        set.add(id);
        return Array.from(set);
      });
    } else {
      setSelectedRows((prev) => {
        // 如果已经取消选中，直接返回，避免不必要的更新
        if (!prev.includes(id)) return prev;
        return prev.filter((rowId) => rowId !== id);
      });
    }
  }, []);

  // 重置筛选
  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setShowActiveOnly(false);
    setCurrentPage(1);
  };

  // 批量删除
  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      // 并行删除所有选中的产品
      await Promise.all(
        selectedRows.map((id) => http.delete(`/api/admin/products?id=${id}`))
      );

      toast({
        title: '批量删除成功',
        description: `成功删除 ${selectedRows.length} 个产品`
      });

      setSelectedRows([]);
      await fetchProducts(); // 刷新列表
    } catch (error: any) {
      toast({
        title: '批量删除失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 导出数据
  const handleExport = () => {
    // 这里可以实现导出逻辑
    toast({
      title: '导出功能',
      description: '导出功能待实现'
    });
  };

  // 删除单个产品
  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await http.delete(`/api/admin/products?id=${id}`);

      toast({
        title: '删除成功',
        description: '产品已成功删除'
      });

      await fetchProducts(); // 刷新列表
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取商品分类标签 - 使用 useCallback 优化
  const getCategoryBadge = useCallback((category: string) => {
    const categoryMap = {
      'BOUQUET': { label: '花束', variant: 'default' as const },
      'BASKET': { label: '花篮', variant: 'secondary' as const },
      'POTTED': { label: '盆栽', variant: 'outline' as const },
      'WREATH': { label: '花环', variant: 'destructive' as const }
    };
    const categoryInfo = categoryMap[category as keyof typeof categoryMap] || {
      label: category,
      variant: 'outline' as const
    };
    return <Badge variant={categoryInfo.variant}>{categoryInfo.label}</Badge>;
  }, []);

  // 获取状态标签 - 使用 useCallback 优化
  const getStatusBadge = useCallback((status: string) => {
    return (
      <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
        {status === 'ACTIVE' ? '已上架' : '已下架'}
      </Badge>
    );
  }, []);

  // 获取产品类型标签 - 使用 useCallback 优化
  const getStyleBadge = useCallback((style?: string) => {
    if (!style) return null;
    return (
      <Badge variant="outline" className="text-xs">
        {style}
      </Badge>
    );
  }, []);

  // 获取花材信息 - 使用 useCallback 优化
  const getMaterialsText = useCallback((materials: string[]) => {
    if (!materials || !Array.isArray(materials)) return '暂无花材信息';
    return materials.join('、');
  }, []);

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Package className='h-8 w-8' />
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>产品管理</h1>
            <p className='text-muted-foreground'>
              管理产品，支持用户直接购买
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={handleExport} disabled={loading}>
            <Download className='mr-2 h-4 w-4' />
            导出
          </Button>
          <Button variant='outline' onClick={resetFilters} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            重置筛选
          </Button>
          <Button
            onClick={() => router.push('/dashboard/products/new')}
            disabled={loading}
          >
            <Plus className='mr-2 h-4 w-4' />
            新建产品
          </Button>
        </div>
      </div>

      {/* 移动端优化的搜索和筛选区域 */}
      <div className='space-y-4'>
        {/* 搜索栏 */}
        <div className='relative'>
          <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='搜索商品名称或描述...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10 pr-16 h-12 text-base'
          />
          <Button
            variant='ghost'
            size='sm'
            className='absolute right-1 top-1 h-10 w-10'
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className='h-4 w-4' />
          </Button>
        </div>

        {/* 快速筛选标签 */}
        <div className='flex items-center gap-2 overflow-x-auto pb-2'>
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCategoryFilter('all')}
            className='whitespace-nowrap'
          >
            全部
          </Button>
          <Button
            variant={categoryFilter === 'BOUQUET' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCategoryFilter('BOUQUET')}
            className='whitespace-nowrap'
          >
            花束
          </Button>
          <Button
            variant={categoryFilter === 'BASKET' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCategoryFilter('BASKET')}
            className='whitespace-nowrap'
          >
            花篮
          </Button>
          <Button
            variant={categoryFilter === 'POTTED' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCategoryFilter('POTTED')}
            className='whitespace-nowrap'
          >
            盆栽
          </Button>
          <Button
            variant={categoryFilter === 'WREATH' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setCategoryFilter('WREATH')}
            className='whitespace-nowrap'
          >
            花环
          </Button>
        </div>

        {/* 折叠式高级筛选 */}
        {showFilters && (
          <Card>
            <CardContent className='pt-6'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label>状态</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择状态' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部状态</SelectItem>
                      <SelectItem value='ACTIVE'>已上架</SelectItem>
                      <SelectItem value='INACTIVE'>已下架</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label>排序</Label>
                  <Select
                    value={sortConfig.key?.toString() || 'updatedAt'}
                    onValueChange={(value) => setSortConfig({ key: value as keyof Product, direction: 'desc' })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='排序方式' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='updatedAt'>更新时间</SelectItem>
                      <SelectItem value='createdAt'>创建时间</SelectItem>
                      <SelectItem value='name'>商品名称</SelectItem>
                      <SelectItem value='sortOrder'>排序权重</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='flex items-center justify-between mt-4'>
                <div className='flex items-center space-x-2'>
                  <Switch
                    id='active-only'
                    checked={showActiveOnly}
                    onCheckedChange={setShowActiveOnly}
                    disabled={loading}
                  />
                  <Label htmlFor='active-only'>仅显示已上架</Label>
                </div>
                <Button variant='outline' onClick={resetFilters} size='sm'>
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 视图切换和操作栏 */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='flex rounded-lg border'>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('grid')}
                className='rounded-r-none'
              >
                <Grid3X3 className='h-4 w-4' />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('list')}
                className='rounded-l-none'
              >
                <List className='h-4 w-4' />
              </Button>
            </div>
            <span className='text-sm text-muted-foreground'>
              {total} 个商品
            </span>
          </div>

          <div className='flex items-center gap-2'>
            {selectedRows.length > 0 && (
              <Badge variant='secondary' className='px-2 py-1'>
                已选择 {selectedRows.length}
              </Badge>
            )}
            {isSelectionMode && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedRows([]);
                }}
              >
                取消选择
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 移动端商品展示区域 */}
      <div className='space-y-4'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin' />
            <span className='ml-2'>加载中...</span>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <Card>
            <CardContent className='py-12 text-center'>
              <Package className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>暂无商品</h3>
              <p className='text-muted-foreground mb-4'>
                没有找到符合条件的商品，试试调整筛选条件
              </p>
              <Button onClick={resetFilters}>重置筛选</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 网格布局 */}
            {viewMode === 'grid' && (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {filteredAndSortedProducts.map((product) => (
                  <Card key={product.id} className='overflow-hidden hover:shadow-lg transition-shadow'>
                    <div className='relative'>
                      {/* 图片区域 */}
                      <div className='aspect-square relative overflow-hidden'>
                        <img
                          src={Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '/placeholder.svg'}
                          alt={product.name}
                          className='w-full h-full object-cover'
                        />

                        {/* 选择状态 */}
                        {isSelectionMode && (
                          <div className='absolute top-2 left-2'>
                            <Checkbox
                              checked={selectedRowsSet.has(product.id)}
                              onCheckedChange={(checked) =>
                                handleSelectRow(product.id, checked as boolean)
                              }
                              className='bg-white border-white'
                            />
                          </div>
                        )}

                        {/* 状态标签 */}
                        <div className='absolute top-2 right-2'>
                          {getStatusBadge(product.status)}
                        </div>

                        {/* 分类标签 */}
                        <div className='absolute bottom-2 left-2 flex gap-1 flex-wrap'>
                          {getCategoryBadge(product.category)}
                          {getStyleBadge(product.style)}
                        </div>
                      </div>

                      {/* 长按选择 */}
                      <div
                        className='absolute inset-0 bg-transparent'
                        onTouchStart={(e) => {
                          const timer = setTimeout(() => {
                            if (!isSelectionMode) {
                              setIsSelectionMode(true);
                              handleSelectRow(product.id, true);
                            }
                          }, 500);
                          e.currentTarget.addEventListener('touchend', () => clearTimeout(timer), { once: true });
                          e.currentTarget.addEventListener('touchmove', () => clearTimeout(timer), { once: true });
                        }}
                        onClick={(e) => {
                          if (isSelectionMode) {
                            e.preventDefault();
                            handleSelectRow(product.id, !selectedRowsSet.has(product.id));
                          } else {
                            router.push(`/dashboard/products/${product.id}`);
                          }
                        }}
                      />
                    </div>

                    <CardContent className='p-4'>
                      <div className='space-y-2'>
                        <h3 className='font-semibold text-lg leading-tight line-clamp-2'>
                          {product.name}
                        </h3>

                        {product.description && (
                          <p className='text-sm text-muted-foreground line-clamp-2'>
                            {product.description}
                          </p>
                        )}

                        <div className='flex items-center justify-between'>
                          <span className='text-lg font-bold text-primary'>
                            {product.priceRef}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            权重: {product.sortOrder}
                          </span>
                        </div>

                        {/* 产品信息展示 */}
                        <div className='space-y-1 text-xs text-muted-foreground'>
                          {product.materials && product.materials.length > 0 && (
                            <div>花材: {getMaterialsText(product.materials)}</div>
                          )}
                          {product.targetAudience && product.targetAudience.length > 0 && (
                            <div>赠送对象: {product.targetAudience.join('、')}</div>
                          )}
                          {product.style && (
                            <div>产品类型: {product.style}</div>
                          )}
                          {(product.size || product.branchCount) && (
                            <div>
                              尺寸: {product.size || '-'} | 枝数: {product.branchCount || '-'}
                            </div>
                          )}
                        </div>

                        {/* 花材编辑 - 延迟渲染，只在需要时显示 */}
                        {(quickEditingProductId === product.id || quickEditMaterials[product.id] !== undefined || quickEditTargetAudience[product.id] !== undefined || quickEditStyle[product.id] !== undefined || quickEditSize[product.id] !== undefined) && (
                          <div className='mt-2 space-y-2'>
                            <div className='flex items-center gap-2'>
                              <Label className='text-xs text-muted-foreground whitespace-nowrap'>花材:</Label>
                              <HierarchicalMultiSelect
                                options={mainFlowerOptions}
                                selected={quickEditMaterials[product.id] ?? product.materials ?? []}
                                onChange={(selected) => {
                                  setQuickEditMaterials(prev => ({ ...prev, [product.id]: selected }));
                                  setQuickEditingProductId(product.id);
                                }}
                                placeholder="选择花材..."
                                className="w-full h-8 text-xs"
                              />
                            </div>

                            {/* 赠送对象编辑 */}
                            <div className='flex items-center gap-2'>
                              <Label className='text-xs text-muted-foreground whitespace-nowrap'>赠送对象:</Label>
                              <HierarchicalMultiSelect
                                options={targetAudienceOptions}
                                selected={quickEditTargetAudience[product.id] ?? product.targetAudience ?? []}
                                onChange={(selected) => {
                                  setQuickEditTargetAudience(prev => ({ ...prev, [product.id]: selected }));
                                  setQuickEditingProductId(product.id);
                                }}
                                placeholder="选择赠送对象..."
                                className="w-full h-8 text-xs"
                              />
                            </div>

                            {/* 产品类型编辑 */}
                            <div className='flex items-center gap-2'>
                              <Label className='text-xs text-muted-foreground whitespace-nowrap'>产品类型:</Label>
                              <Select
                                value={quickEditStyle[product.id] ?? product.style ?? undefined}
                                onValueChange={(value) => {
                                  setQuickEditStyle(prev => ({ ...prev, [product.id]: value === 'NONE' ? '' : value }));
                                  setQuickEditingProductId(product.id);
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="选择产品类型" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">不设置</SelectItem>
                                  {styleOptions.map((style) => (
                                    <SelectItem key={style} value={style}>
                                      {style}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 尺寸和枝数编辑 */}
                            <div className='flex items-center gap-2 flex-wrap'>
                              <Label className='text-xs text-muted-foreground whitespace-nowrap'>尺寸:</Label>
                              <Select
                                value={quickEditSize[product.id] ?? product.size ?? undefined}
                                onValueChange={(value) => {
                                  handleQuickSizeChange(product.id, value === 'NONE' ? '' : value as 'XS' | 'S' | 'M' | 'L' | '');
                                  setQuickEditingProductId(product.id);
                                }}
                              >
                                <SelectTrigger className="w-24 h-8 text-xs">
                                  <SelectValue placeholder="选择尺寸" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">不设置</SelectItem>
                                  <SelectItem value="XS">XS (11枝)</SelectItem>
                                  <SelectItem value="S">S (18枝)</SelectItem>
                                  <SelectItem value="M">M (26枝)</SelectItem>
                                  <SelectItem value="L">L (38枝)</SelectItem>
                                </SelectContent>
                              </Select>

                              <Label className='text-xs text-muted-foreground whitespace-nowrap'>枝数:</Label>
                              <Input
                                type="number"
                                min="0"
                                value={quickEditBranchCount[product.id] ?? product.branchCount ?? ''}
                                onChange={(e) => {
                                  setQuickEditBranchCount(prev => ({
                                    ...prev,
                                    [product.id]: e.target.value ? Number(e.target.value) : ''
                                  }));
                                  setQuickEditingProductId(product.id);
                                }}
                                placeholder="输入枝数"
                                className="w-20 h-8 text-xs"
                              />

                              {quickEditingProductId === product.id && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveQuickEdit(product.id)}
                                  disabled={loading}
                                  className="h-8 text-xs"
                                >
                                  保存
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className='flex items-center justify-between pt-2'>
                          <span className='text-xs text-muted-foreground'>
                            {new Date(product.updatedAt).toLocaleDateString()}
                          </span>

                          {!isSelectionMode && (
                            <div className='flex items-center gap-1'>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 w-7 p-0'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditDialog(product);
                                }}
                                title='快速编辑'
                              >
                                <Edit className='h-3.5 w-3.5' />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                                    <MoreHorizontal className='h-4 w-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                                  >
                                    <Eye className='mr-2 h-4 w-4' />
                                    查看
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                                  >
                                    <Eye className='mr-2 h-4 w-4' />
                                    详细编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit className='mr-2 h-4 w-4' />
                                    快速编辑
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        className='text-red-600'
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className='mr-2 h-4 w-4' />
                                        删除
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          确定要删除商品 "{product.name}" 吗？此操作无法撤销。
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(product.id)}
                                        >
                                          删除
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 列表布局 */}
            {viewMode === 'list' && (
              <div className='space-y-3'>
                {filteredAndSortedProducts.map((product) => (
                  <Card key={product.id} className='overflow-hidden hover:shadow-md transition-shadow'>
                    <CardContent className='p-4'>
                      <div className='flex gap-4'>
                        {/* 图片 */}
                        <div className='relative flex-shrink-0'>
                          <img
                            src={Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '/placeholder.svg'}
                            alt={product.name}
                            className='w-20 h-20 rounded-lg object-cover'
                          />
                          {isSelectionMode && (
                            <div className='absolute -top-2 -left-2'>
                              <Checkbox
                                checked={selectedRowsSet.has(product.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(product.id, checked as boolean)
                                }
                                className='bg-white border-white'
                              />
                            </div>
                          )}
                        </div>

                        {/* 内容 */}
                        <div
                          className='flex-1 min-w-0 cursor-pointer'
                          onClick={(e) => {
                            if (isSelectionMode) {
                              e.preventDefault();
                              handleSelectRow(product.id, !selectedRowsSet.has(product.id));
                            } else {
                              router.push(`/dashboard/products/${product.id}`);
                            }
                          }}
                          onTouchStart={(e) => {
                            const timer = setTimeout(() => {
                              if (!isSelectionMode) {
                                setIsSelectionMode(true);
                                handleSelectRow(product.id, true);
                              }
                            }, 500);
                            e.currentTarget.addEventListener('touchend', () => clearTimeout(timer), { once: true });
                            e.currentTarget.addEventListener('touchmove', () => clearTimeout(timer), { once: true });
                          }}
                        >
                          <div className='flex items-start justify-between'>
                            <div className='min-w-0 flex-1'>
                              <h3 className='font-semibold text-base leading-tight line-clamp-1'>
                                {product.name}
                              </h3>
                              {product.description && (
                                <p className='text-sm text-muted-foreground line-clamp-1 mt-1'>
                                  {product.description}
                                </p>
                              )}
                              <div className='flex items-center gap-2 mt-2 flex-wrap'>
                                {getCategoryBadge(product.category)}
                                {getStyleBadge(product.style)}
                                {getStatusBadge(product.status)}
                              </div>
                            </div>

                            <div className='flex items-center gap-2 ml-4'>
                              <div className='text-right'>
                                <div className='font-bold text-primary'>
                                  {product.priceRef}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  权重: {product.sortOrder}
                                </div>
                              </div>

                              {!isSelectionMode && (
                                <div className='flex items-center gap-1'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-7 w-7 p-0'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditDialog(product);
                                    }}
                                    title='快速编辑'
                                  >
                                    <Edit className='h-3.5 w-3.5' />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                                        <MoreHorizontal className='h-4 w-4' />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                                      >
                                        <Eye className='mr-2 h-4 w-4' />
                                        查看
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                                      >
                                        <Edit className='mr-2 h-4 w-4' />
                                        编辑
                                      </DropdownMenuItem>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                            className='text-red-600'
                                            onSelect={(e) => e.preventDefault()}
                                          >
                                            <Trash2 className='mr-2 h-4 w-4' />
                                            删除
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              确定要删除商品 "{product.name}" 吗？此操作无法撤销。
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDelete(product.id)}
                                            >
                                              删除
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 产品信息展示 */}
                          <div className='space-y-1 text-xs text-muted-foreground mt-2'>
                            {product.materials && product.materials.length > 0 && (
                              <div>花材: {getMaterialsText(product.materials)}</div>
                            )}
                            {product.targetAudience && product.targetAudience.length > 0 && (
                              <div>赠送对象: {product.targetAudience.join('、')}</div>
                            )}
                            {product.style && (
                              <div>产品类型: {product.style}</div>
                            )}
                            {(product.size || product.branchCount) && (
                              <div>
                                尺寸: {product.size || '-'} | 枝数: {product.branchCount || '-'}
                              </div>
                            )}
                          </div>

                          {/* 花材编辑 - 延迟渲染，只在需要时显示 */}
                          {(quickEditingProductId === product.id || quickEditMaterials[product.id] !== undefined || quickEditTargetAudience[product.id] !== undefined || quickEditStyle[product.id] !== undefined || quickEditSize[product.id] !== undefined) && (
                            <div className='mt-2 space-y-2'>
                              <div className='flex items-center gap-2'>
                                <Label className='text-xs text-muted-foreground whitespace-nowrap'>花材:</Label>
                                <HierarchicalMultiSelect
                                  options={mainFlowerOptions}
                                  selected={quickEditMaterials[product.id] ?? product.materials ?? []}
                                  onChange={(selected) => {
                                    setQuickEditMaterials(prev => ({ ...prev, [product.id]: selected }));
                                    setQuickEditingProductId(product.id);
                                  }}
                                  placeholder="选择花材..."
                                  className="w-full h-8 text-xs"
                                />
                              </div>

                              {/* 赠送对象编辑 */}
                              <div className='flex items-center gap-2'>
                                <Label className='text-xs text-muted-foreground whitespace-nowrap'>赠送对象:</Label>
                                <HierarchicalMultiSelect
                                  options={targetAudienceOptions}
                                  selected={quickEditTargetAudience[product.id] ?? product.targetAudience ?? []}
                                  onChange={(selected) => {
                                    setQuickEditTargetAudience(prev => ({ ...prev, [product.id]: selected }));
                                    setQuickEditingProductId(product.id);
                                  }}
                                  placeholder="选择赠送对象..."
                                  className="w-full h-8 text-xs"
                                />
                              </div>

                              {/* 产品类型编辑 */}
                              <div className='flex items-center gap-2'>
                                <Label className='text-xs text-muted-foreground whitespace-nowrap'>产品类型:</Label>
                                <Select
                                  value={quickEditStyle[product.id] ?? product.style ?? undefined}
                                  onValueChange={(value) => {
                                    setQuickEditStyle(prev => ({ ...prev, [product.id]: value === 'NONE' ? '' : value }));
                                    setQuickEditingProductId(product.id);
                                  }}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs">
                                    <SelectValue placeholder="选择产品类型" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NONE">不设置</SelectItem>
                                    {styleOptions.map((style) => (
                                      <SelectItem key={style} value={style}>
                                        {style}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* 尺寸和枝数编辑 */}
                              <div className='flex items-center gap-2'>
                                <Label className='text-xs text-muted-foreground whitespace-nowrap'>尺寸:</Label>
                                <Select
                                  value={quickEditSize[product.id] ?? product.size ?? undefined}
                                  onValueChange={(value) => {
                                    handleQuickSizeChange(product.id, value === 'NONE' ? '' : value as 'XS' | 'S' | 'M' | 'L' | '');
                                    setQuickEditingProductId(product.id);
                                  }}
                                >
                                  <SelectTrigger className="w-20 h-8 text-xs">
                                    <SelectValue placeholder="选择尺寸" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NONE">不设置</SelectItem>
                                    <SelectItem value="XS">XS (11枝)</SelectItem>
                                    <SelectItem value="S">S (18枝)</SelectItem>
                                    <SelectItem value="M">M (26枝)</SelectItem>
                                    <SelectItem value="L">L (38枝)</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Label className='text-xs text-muted-foreground whitespace-nowrap'>枝数:</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={quickEditBranchCount[product.id] ?? product.branchCount ?? ''}
                                  onChange={(e) => {
                                    setQuickEditBranchCount(prev => ({
                                      ...prev,
                                      [product.id]: e.target.value ? Number(e.target.value) : ''
                                    }));
                                    setQuickEditingProductId(product.id);
                                  }}
                                  placeholder="输入枝数"
                                  className="w-20 h-8 text-xs"
                                />

                                {quickEditingProductId === product.id && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveQuickEdit(product.id)}
                                    disabled={loading}
                                    className="h-8 text-xs"
                                  >
                                    保存
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className='text-xs text-muted-foreground mt-1'>
                            {new Date(product.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* 移动端优化的分页 */}
        {!loading && filteredAndSortedProducts.length > 0 && (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className='h-4 w-4' />
                  上一页
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>

            <div className='flex items-center justify-center gap-2'>
              <span className='text-sm text-muted-foreground'>每页显示</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className='w-20 h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 50].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className='text-sm text-muted-foreground'>条</span>
            </div>
          </div>
        )}
      </div>

      {/* 底部浮动操作栏 */}
      {selectedRows.length > 0 && (
        <div className='fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50'>
          <div className='flex items-center justify-between max-w-screen-xl mx-auto'>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary' className='px-3 py-1'>
                已选择 {selectedRows.length} 项
              </Badge>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setSelectedRows([]);
                  setIsSelectionMode(false);
                }}
              >
                取消
              </Button>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='outline' size='sm' disabled={loading}>
                <Edit className='mr-2 h-4 w-4' />
                批量编辑
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant='destructive' size='sm' disabled={loading}>
                    <Trash2 className='mr-2 h-4 w-4' />
                    删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认批量删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作无法撤销。将永久删除 {selectedRows.length} 个商品。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>快速编辑商品</DialogTitle>
            <DialogDescription>
              编辑 {editingProduct?.name} 的花材、尺寸和枝数
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 花材选择 */}
            <div className="space-y-2">
              <Label>花材</Label>
              <HierarchicalMultiSelect
                options={mainFlowerOptions}
                selected={editMaterials}
                onChange={setEditMaterials}
                placeholder="选择花材..."
              />
            </div>

            {/* 尺寸选择 */}
            <div className="space-y-2">
              <Label>尺寸</Label>
              <Select value={editSize || undefined} onValueChange={(value) => handleSizeChange(value === 'NONE' ? '' : value as 'XS' | 'S' | 'M' | 'L' | '')}>
                <SelectTrigger>
                  <SelectValue placeholder="选择尺寸" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">不设置</SelectItem>
                  <SelectItem value="XS">XS (11枝)</SelectItem>
                  <SelectItem value="S">S (18枝)</SelectItem>
                  <SelectItem value="M">M (26枝)</SelectItem>
                  <SelectItem value="L">L (38枝)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 枝数输入 */}
            <div className="space-y-2">
              <Label>枝数</Label>
              <Input
                type="number"
                min="0"
                value={editBranchCount}
                onChange={(e) => setEditBranchCount(e.target.value ? Number(e.target.value) : '')}
                placeholder="输入枝数"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 产品信息编辑弹窗 */}
      <Dialog open={!!editingDialogProduct} onOpenChange={(open) => !open && setEditingDialogProduct(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑商品信息</DialogTitle>
            <DialogDescription>
              编辑 {editingDialogProduct?.name} 的详细信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 花材选择 */}
            <div className="space-y-2">
              <Label>花材</Label>
              <HierarchicalMultiSelect
                options={mainFlowerOptions}
                selected={dialogEditMaterials}
                onChange={setDialogEditMaterials}
                placeholder="选择花材..."
              />
            </div>

            {/* 赠送对象选择 */}
            <div className="space-y-2">
              <Label>赠送对象</Label>
              <HierarchicalMultiSelect
                options={targetAudienceOptions}
                selected={dialogEditTargetAudience}
                onChange={setDialogEditTargetAudience}
                placeholder="选择赠送对象..."
              />
            </div>

            {/* 产品类型选择 */}
            <div className="space-y-2">
              <Label>产品类型</Label>
              <Select
                value={dialogEditStyle || undefined}
                onValueChange={(value) => setDialogEditStyle(value === 'NONE' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择产品类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">不设置</SelectItem>
                  {styleOptions.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 尺寸选择 */}
            <div className="space-y-2">
              <Label>尺寸</Label>
              <Select
                value={dialogEditSize || undefined}
                onValueChange={(value) => handleDialogSizeChange(value === 'NONE' ? '' : value as 'XS' | 'S' | 'M' | 'L' | '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择尺寸" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">不设置</SelectItem>
                  <SelectItem value="XS">XS (11枝)</SelectItem>
                  <SelectItem value="S">S (18枝)</SelectItem>
                  <SelectItem value="M">M (26枝)</SelectItem>
                  <SelectItem value="L">L (38枝)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 枝数输入 */}
            <div className="space-y-2">
              <Label>枝数</Label>
              <Input
                type="number"
                min="0"
                value={dialogEditBranchCount}
                onChange={(e) => setDialogEditBranchCount(e.target.value ? Number(e.target.value) : '')}
                placeholder="输入枝数"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDialogProduct(null)}>
              取消
            </Button>
            <Button onClick={handleSaveDialogEdit} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
