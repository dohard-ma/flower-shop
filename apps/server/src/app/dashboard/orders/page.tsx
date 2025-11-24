'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    ShoppingCart,
    Loader2,
    Copy,
    User,
    Package,
    X
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

// 订单类型定义
export interface Order {
    id: number;
    orderNo: string;
    userId: number;
    amount: number;
    payType: number;
    status: number;
    isGift: boolean;
    isSubscription: boolean;
    totalItems: number;
    mainProductName: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        nickname?: string;
        phone?: string;
        avatar?: string;
    };
    orderItems: Array<{
        id: number;
        quantity: number;
        product: {
            id: number;
            productName: string;
            price: number;
        };
        receiver?: {
            id: number;
            nickname?: string;
            phone?: string;
        };
    }>;
    subscriptionOrders: Array<{
        id: number;
        totalDeliveries: number;
        deliveredCount: number;
        status: number;
    }>;
}

// API响应类型
interface ApiResponse {
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function OrderDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();

    // 数据状态
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    // 筛选状态
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [payTypeFilter, setPayTypeFilter] = useState('all');
    const [showGiftOnly, setShowGiftOnly] = useState(false);
    const [showSubscriptionOnly, setShowSubscriptionOnly] = useState(false);

    // 表格状态
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Order | null;
        direction: 'asc' | 'desc';
    }>({
        key: 'updatedAt',
        direction: 'desc'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 获取订单列表
    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {
                page: currentPage,
                limit: pageSize
            };

            // 添加筛选参数
            if (statusFilter !== 'all') {
                params.status = parseInt(statusFilter);
            }
            if (payTypeFilter !== 'all') {
                params.payType = parseInt(payTypeFilter);
            }
            if (showGiftOnly) {
                params.isGift = true;
            }
            if (showSubscriptionOnly) {
                params.isSubscription = true;
            }

            // 添加排序参数
            if (sortConfig.key) {
                params.orderBy = sortConfig.key;
                params.orderType = sortConfig.direction;
            }

            const response = await http.get<ApiResponse>(
                '/api/admin/orders',
                params
            );

            if (response.success) {
                setOrders(response.data.data);
                setTotal(response.data.total);
            }
        } catch (error: any) {
            toast({
                title: '获取订单列表失败',
                description: error.message || '请稍后重试',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // 组件挂载时获取数据
    useEffect(() => {
        fetchOrders();
    }, [
        currentPage,
        pageSize,
        statusFilter,
        payTypeFilter,
        showGiftOnly,
        showSubscriptionOnly,
        sortConfig
    ]);

    // 客户端筛选和排序逻辑
    const filteredAndSortedOrders = useMemo(() => {
        let filtered = [...orders];

        // 客户端搜索筛选
        if (searchTerm) {
            filtered = filtered.filter(
                (order) =>
                    order.orderNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.user.phone?.includes(searchTerm) ||
                    order.mainProductName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [orders, searchTerm]);

    // 处理排序
    const handleSort = (key: keyof Order) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // 处理多选
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRows(filteredAndSortedOrders.map((o) => o.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedRows((prev) => [...prev, id]);
        } else {
            setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
        }
    };

    // 重置筛选
    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setPayTypeFilter('all');
        setShowGiftOnly(false);
        setShowSubscriptionOnly(false);
        setCurrentPage(1);
    };

    // 取消订单
    const handleCancelOrder = async (id: number) => {
        setLoading(true);
        try {
            await http.put(`/api/admin/orders?id=${id}`);
            toast({
                title: '取消成功',
                description: '订单已成功取消'
            });
            await fetchOrders(); // 刷新列表
        } catch (error: any) {
            toast({
                title: '取消失败',
                description: error.message || '请稍后重试',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // 批量取消订单
    const handleBulkCancel = async () => {
        setLoading(true);
        try {
            // 并行取消所有选中的订单
            await Promise.all(
                selectedRows.map((id) => http.put(`/api/admin/orders?id=${id}`))
            );

            toast({
                title: '批量取消成功',
                description: `成功取消 ${selectedRows.length} 个订单`
            });

            setSelectedRows([]);
            await fetchOrders(); // 刷新列表
        } catch (error: any) {
            toast({
                title: '批量取消失败',
                description: error.message || '请稍后重试',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // 导出数据
    const handleExport = () => {
        toast({
            title: '导出功能',
            description: '导出功能待实现'
        });
    };

    // 复制订单号
    const copyOrderNo = (orderNo: string) => {
        navigator.clipboard.writeText(orderNo);
        toast({
            title: '复制成功',
            description: '订单号已复制到剪贴板'
        });
    };

    // 获取订单状态徽章
    const getOrderStatusBadge = (status: number) => {
        const variants = {
            0: { text: '待支付', variant: 'destructive' as const },
            1: { text: '已支付', variant: 'default' as const },
            2: { text: '已赠送', variant: 'default' as const },
            3: { text: '已完成', variant: 'secondary' as const },
            4: { text: '已取消', variant: 'outline' as const }
        };
        const config = variants[status as keyof typeof variants] || variants[0];
        return <Badge variant={config.variant}>{config.text}</Badge>;
    };

    // 获取支付方式徽章
    const getPayTypeBadge = (payType: number) => {
        const variants = {
            1: { text: '微信支付', variant: 'default' as const },
            2: { text: '余额支付', variant: 'secondary' as const }
        };
        const config = variants[payType as keyof typeof variants] || variants[1];
        return <Badge variant={config.variant}>{config.text}</Badge>;
    };

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <ShoppingCart className='h-8 w-8' />
                    <div>
                        <h1 className='text-3xl font-bold tracking-tight'>订单管理</h1>
                        <p className='text-muted-foreground'>
                            管理平台所有订单信息和状态
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
                        onClick={() => router.push('/dashboard/orders/new')}
                        disabled={loading}
                    >
                        <Plus className='mr-2 h-4 w-4' />
                        新建订单
                    </Button>
                </div>
            </div>

            {/* 筛选区域 */}
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <Filter className='h-5 w-5' />
                        筛选条件
                    </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                        {/* 搜索框 */}
                        <div className='space-y-2'>
                            <Label htmlFor='search'>搜索</Label>
                            <div className='relative'>
                                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                                <Input
                                    id='search'
                                    placeholder='搜索订单号、用户、商品...'
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className='pl-8'
                                />
                            </div>
                        </div>

                        {/* 订单状态筛选 */}
                        <div className='space-y-2'>
                            <Label>订单状态</Label>
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='选择订单状态' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>全部状态</SelectItem>
                                    <SelectItem value='0'>待支付</SelectItem>
                                    <SelectItem value='1'>已支付</SelectItem>
                                    <SelectItem value='2'>已赠送</SelectItem>
                                    <SelectItem value='3'>已完成</SelectItem>
                                    <SelectItem value='4'>已取消</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 支付方式筛选 */}
                        <div className='space-y-2'>
                            <Label>支付方式</Label>
                            <Select
                                value={payTypeFilter}
                                onValueChange={setPayTypeFilter}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='选择支付方式' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>全部方式</SelectItem>
                                    <SelectItem value='1'>微信支付</SelectItem>
                                    <SelectItem value='2'>余额支付</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className='flex items-center space-x-4'>
                        <div className='flex items-center space-x-2'>
                            <Switch
                                id='gift-only'
                                checked={showGiftOnly}
                                onCheckedChange={setShowGiftOnly}
                                disabled={loading}
                            />
                            <Label htmlFor='gift-only'>仅显示赠送订单</Label>
                        </div>
                        <div className='flex items-center space-x-2'>
                            <Switch
                                id='subscription-only'
                                checked={showSubscriptionOnly}
                                onCheckedChange={setShowSubscriptionOnly}
                                disabled={loading}
                            />
                            <Label htmlFor='subscription-only'>仅显示订阅订单</Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 表格 */}
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <CardTitle className='flex items-center gap-2'>
                            <ShoppingCart className='h-5 w-5' />
                            订单列表 ({total} 个结果)
                            {loading && <Loader2 className='h-4 w-4 animate-spin' />}
                        </CardTitle>
                        <div className='flex items-center gap-2'>
                            {selectedRows.length > 0 && (
                                <>
                                    <span className='mr-2 text-sm text-muted-foreground'>
                                        已选择 {selectedRows.length} 个订单
                                    </span>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant='destructive' size='sm' disabled={loading}>
                                                <X className='mr-2 h-4 w-4' />
                                                批量取消
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>确认取消订单</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    此操作将取消 {selectedRows.length} 个订单，且无法撤销。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleBulkCancel}>
                                                    确认取消
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className='rounded-md border'>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-12'>
                                        <Checkbox
                                            checked={
                                                selectedRows.length ===
                                                filteredAndSortedOrders.length &&
                                                filteredAndSortedOrders.length > 0
                                            }
                                            onCheckedChange={handleSelectAll}
                                            disabled={loading}
                                        />
                                    </TableHead>
                                    <TableHead
                                        className='cursor-pointer'
                                        onClick={() => handleSort('id')}
                                    >
                                        <div className='flex items-center'>
                                            ID
                                            <ArrowUpDown className='ml-2 h-4 w-4' />
                                        </div>
                                    </TableHead>
                                    <TableHead>订单号</TableHead>
                                    <TableHead>购买用户</TableHead>
                                    <TableHead>商品信息</TableHead>
                                    <TableHead
                                        className='cursor-pointer'
                                        onClick={() => handleSort('amount')}
                                    >
                                        <div className='flex items-center'>
                                            订单金额
                                            <ArrowUpDown className='ml-2 h-4 w-4' />
                                        </div>
                                    </TableHead>
                                    <TableHead>订单状态</TableHead>
                                    <TableHead
                                        className='cursor-pointer'
                                        onClick={() => handleSort('createdAt')}
                                    >
                                        <div className='flex items-center'>
                                            创建时间
                                            <ArrowUpDown className='ml-2 h-4 w-4' />
                                        </div>
                                    </TableHead>
                                    <TableHead>支付时间</TableHead>
                                    <TableHead className='sticky right-0 bg-background'>操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className='py-8 text-center'>
                                            <Loader2 className='mx-auto h-6 w-6 animate-spin' />
                                            <div className='mt-2'>加载中...</div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAndSortedOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className='py-8 text-center'>
                                            暂无数据
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAndSortedOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedRows.includes(order.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectRow(order.id, checked as boolean)
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className='font-mono text-sm'>
                                                {order.id}
                                            </TableCell>
                                            <TableCell>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-mono text-sm cursor-pointer underline' onClick={() => router.push(`/dashboard/orders/${order.id}`)}>{order.orderNo}</span>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => copyOrderNo(order.orderNo)}
                                                    >
                                                        <Copy className='h-3 w-3' />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className='flex items-center gap-2'>
                                                    <Avatar className='h-8 w-8'>
                                                        <AvatarImage src={order.user.avatar} />
                                                        <AvatarFallback>
                                                            <User className='h-4 w-4' />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className='font-medium text-sm'>
                                                            {order.user.nickname || '未设置昵称'}
                                                        </div>
                                                        <div className='text-xs text-muted-foreground'>
                                                            {order.user.phone || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className='space-y-1'>
                                                    <div className='font-medium text-sm'>
                                                        {order.mainProductName}
                                                    </div>
                                                    <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                                                        <span>{order.totalItems} 件商品</span>
                                                        {order.isSubscription && (
                                                            <Badge variant='outline' className='text-xs'>订阅</Badge>
                                                        )}
                                                        {order.isGift && (
                                                            <Badge variant='outline' className='text-xs'>赠送</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className='font-medium'>
                                                ¥{order.amount}
                                            </TableCell>
                                            <TableCell>
                                                {getOrderStatusBadge(order.status)}
                                            </TableCell>
                                            <TableCell className='text-sm'>
                                                {new Date(order.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className='text-sm'>
                                                {order.paidAt ? new Date(order.paidAt).toLocaleString() : '-'}
                                            </TableCell>
                                            <TableCell className='sticky right-0 bg-background'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant='ghost'
                                                            className='h-8 w-8 p-0'
                                                            disabled={loading}
                                                        >
                                                            <MoreHorizontal className='h-4 w-4' />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align='end'>
                                                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.push(`/dashboard/orders/${order.id}`)
                                                            }
                                                        >
                                                            <Eye className='mr-2 h-4 w-4' />
                                                            查看详情
                                                        </DropdownMenuItem>
                                                        {order.status === 0 && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem
                                                                            onSelect={(e) => e.preventDefault()}
                                                                            className='text-destructive focus:text-destructive'
                                                                        >
                                                                            <X className='mr-2 h-4 w-4' />
                                                                            取消订单
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>确认取消订单</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                确定要取消订单 "{order.orderNo}" 吗？此操作无法撤销。
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => handleCancelOrder(order.id)}
                                                                                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                                                            >
                                                                                确认取消
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* 分页 */}
                    <div className='flex items-center justify-between space-x-2 py-4'>
                        <div className='text-sm text-muted-foreground'>
                            共 {total} 条记录，第 {currentPage} 页，共 {totalPages} 页
                        </div>
                        <div className='flex items-center space-x-2'>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1 || loading}
                            >
                                <ChevronLeft className='h-4 w-4' />
                                上一页
                            </Button>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || loading}
                            >
                                下一页
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
