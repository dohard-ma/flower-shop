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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
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
    Users,
    Loader2,
    Wallet,
    User
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

// 用户类型定义
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

// 钱包交易记录类型
interface WalletTransaction {
    id: number;
    type: number;
    amount: number;
    description?: string;
    createdAt: string;
}

// API响应类型
interface ApiResponse {
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function UserDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();

    // 数据状态
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    // 筛选状态
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState('all');
    const [membershipFilter, setMembershipFilter] = useState('all');
    const [showMembersOnly, setShowMembersOnly] = useState(false);

    // 表格状态
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof User | null;
        direction: 'asc' | 'desc';
    }>({
        key: 'updatedAt',
        direction: 'desc'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 钱包交易记录状态
    const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // 获取用户列表
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {
                page: currentPage,
                limit: pageSize
            };

            // 添加筛选参数
            if (genderFilter !== 'all') {
                params.gender = parseInt(genderFilter);
            }
            if (membershipFilter === 'member') {
                params.hasMembership = true;
            } else if (membershipFilter === 'non-member') {
                params.hasMembership = false;
            }

            const response = await http.get<ApiResponse>(
                '/api/admin/users',
                params
            );

            if (response.success) {
                setUsers(response.data.data);
                setTotal(response.data.total);
            }
        } catch (error: any) {
            toast({
                title: '获取用户列表失败',
                description: error.message || '请稍后重试',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // 组件挂载时获取数据
    useEffect(() => {
        fetchUsers();
    }, [
        currentPage,
        pageSize,
        genderFilter,
        membershipFilter
    ]);

    // 客户端筛选和排序逻辑
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = [...users];

        // 客户端搜索筛选
        if (searchTerm) {
            filtered = filtered.filter(
                (user) =>
                    user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.phone?.includes(searchTerm) ||
                    user.userNo?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 仅显示会员
        if (showMembersOnly) {
            filtered = filtered.filter((user) => user.membership && user.membership.status === 1);
        }

        // 排序
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue: any = a[sortConfig.key!];
                let bValue: any = b[sortConfig.key!];

                if (sortConfig.key === 'id') {
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
    }, [users, searchTerm, showMembersOnly, sortConfig]);

    // 处理排序
    const handleSort = (key: keyof User) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // 处理多选
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRows(filteredAndSortedUsers.map((u) => u.id));
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
        setGenderFilter('all');
        setMembershipFilter('all');
        setShowMembersOnly(false);
        setCurrentPage(1);
    };

    // 批量删除
    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            // 并行删除所有选中的用户
            await Promise.all(
                selectedRows.map((id) => http.delete(`/api/admin/users?id=${id}`))
            );

            toast({
                title: '批量删除成功',
                description: `成功删除 ${selectedRows.length} 个用户`
            });

            setSelectedRows([]);
            await fetchUsers(); // 刷新列表
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
        toast({
            title: '导出功能',
            description: '导出功能待实现'
        });
    };

    // 删除单个用户
    const handleDelete = async (id: number) => {
        setLoading(true);
        try {
            await http.delete(`/api/admin/users?id=${id}`);

            toast({
                title: '删除成功',
                description: '用户已成功删除'
            });

            await fetchUsers(); // 刷新列表
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

    // 查看钱包交易记录
    const handleShowTransactions = async (userId: number) => {
        try {
            const response = await http.get(`/api/admin/users/${userId}/transactions`);
            if (response.success) {
                setTransactions(response.data.data || []);
                setSelectedUserId(userId);
                setTransactionDialogOpen(true);
            }
        } catch (error: any) {
            toast({
                title: '获取交易记录失败',
                description: error.message || '请稍后重试',
                variant: 'destructive'
            });
        }
    };

    // 获取性别徽章
    const getGenderBadge = (gender?: number) => {
        const variants = {
            1: { text: '男', variant: 'default' as const },
            2: { text: '女', variant: 'secondary' as const },
            0: { text: '未知', variant: 'outline' as const }
        };
        const config = variants[gender as keyof typeof variants] || variants[0];
        return <Badge variant={config.variant}>{config.text}</Badge>;
    };

    // 获取会员状态徽章
    const getMembershipBadge = (membership?: User['membership']) => {
        if (!membership) {
            return <Badge variant="outline">非会员</Badge>;
        }

        const statusVariants = {
            0: { text: '未开通', variant: 'outline' as const },
            1: { text: '开通中', variant: 'default' as const },
            2: { text: '已过期', variant: 'destructive' as const }
        };

        const config = statusVariants[membership.status as keyof typeof statusVariants];
        return (
            <Badge variant={config.variant}>
                {membership.vipType}-{config.text}
            </Badge>
        );
    };

    // 获取交易类型徽章
    const getTransactionTypeBadge = (type: number) => {
        const variants = {
            1: { text: '充值', variant: 'default' as const },
            2: { text: '消费', variant: 'destructive' as const },
            3: { text: '赠送', variant: 'secondary' as const },
            4: { text: '其他', variant: 'outline' as const }
        };
        const config = variants[type as keyof typeof variants] || variants[4];
        return <Badge variant={config.variant}>{config.text}</Badge>;
    };

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <Users className='h-8 w-8' />
                    <div>
                        <h1 className='text-3xl font-bold tracking-tight'>用户管理</h1>
                        <p className='text-muted-foreground'>
                            管理平台用户信息和会员状态
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
                    {/* <Button
                        onClick={() => router.push('/dashboard/users/new')}
                        disabled={loading}
                    >
                        <Plus className='mr-2 h-4 w-4' />
                        新建用户
                    </Button> */}
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
                                    placeholder='搜索用户昵称、姓名、手机号...'
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className='pl-8'
                                />
                            </div>
                        </div>

                        {/* 性别筛选 */}
                        <div className='space-y-2'>
                            <Label>性别</Label>
                            <Select
                                value={genderFilter}
                                onValueChange={setGenderFilter}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='选择性别' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>全部性别</SelectItem>
                                    <SelectItem value='1'>男</SelectItem>
                                    <SelectItem value='2'>女</SelectItem>
                                    <SelectItem value='0'>未知</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 会员状态筛选 */}
                        <div className='space-y-2'>
                            <Label>会员状态</Label>
                            <Select
                                value={membershipFilter}
                                onValueChange={setMembershipFilter}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='选择会员状态' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>全部状态</SelectItem>
                                    <SelectItem value='member'>会员</SelectItem>
                                    <SelectItem value='non-member'>非会员</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className='flex items-center space-x-4'>
                        <div className='flex items-center space-x-2'>
                            <Switch
                                id='members-only'
                                checked={showMembersOnly}
                                onCheckedChange={setShowMembersOnly}
                                disabled={loading}
                            />
                            <Label htmlFor='members-only'>仅显示有效会员</Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 表格 */}
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <CardTitle className='flex items-center gap-2'>
                            <Users className='h-5 w-5' />
                            用户列表 ({total} 个结果)
                            {loading && <Loader2 className='h-4 w-4 animate-spin' />}
                        </CardTitle>
                        <div className='flex items-center gap-2'>
                            {selectedRows.length > 0 && (
                                <>
                                    <span className='mr-2 text-sm text-muted-foreground'>
                                        已选择 {selectedRows.length} 个用户
                                    </span>
                                    <Button variant='outline' size='sm' disabled={loading}>
                                        <Edit className='mr-2 h-4 w-4' />
                                        批量编辑
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant='destructive' size='sm' disabled={loading}>
                                                <Trash2 className='mr-2 h-4 w-4' />
                                                批量删除
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    此操作无法撤销。将永久删除 {selectedRows.length}{' '}
                                                    个用户。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleBulkDelete}>
                                                    删除
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
                                                filteredAndSortedUsers.length &&
                                                filteredAndSortedUsers.length > 0
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
                                    <TableHead>用户编号</TableHead>
                                    <TableHead
                                        className='cursor-pointer'
                                        onClick={() => handleSort('nickname')}
                                    >
                                        <div className='flex items-center'>
                                            昵称
                                            <ArrowUpDown className='ml-2 h-4 w-4' />
                                        </div>
                                    </TableHead>
                                    <TableHead>姓名</TableHead>
                                    <TableHead>手机号</TableHead>
                                    <TableHead>性别</TableHead>
                                    <TableHead>会员状态</TableHead>
                                    <TableHead>钱包余额</TableHead>
                                    <TableHead>生日</TableHead>
                                    <TableHead
                                        className='cursor-pointer'
                                        onClick={() => handleSort('updatedAt')}
                                    >
                                        <div className='flex items-center'>
                                            更新时间
                                            <ArrowUpDown className='ml-2 h-4 w-4' />
                                        </div>
                                    </TableHead>
                                    <TableHead className='sticky right-0 bg-background'>操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className='py-8 text-center'>
                                            <Loader2 className='mx-auto h-6 w-6 animate-spin' />
                                            <div className='mt-2'>加载中...</div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAndSortedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className='py-8 text-center'>
                                            暂无数据
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAndSortedUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedRows.includes(user.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectRow(user.id, checked as boolean)
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className='font-mono text-sm'>
                                                {user.id}
                                            </TableCell>
                                            <TableCell className='font-mono text-sm'>
                                                <a href={`/dashboard/users/${user.id}`} className='cursor-pointer underline '>
                                                    {user.userNo || '-'}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <div className='flex items-center gap-2'>
                                                    {user.avatar && (
                                                        <img
                                                            src={user.avatar}
                                                            alt={user.nickname}
                                                            className='h-8 w-8 rounded-full'
                                                        />
                                                    )}
                                                    <div>
                                                        <div className='font-medium'>
                                                            {user.nickname || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.name || '-'}</TableCell>
                                            <TableCell>{user.phone || '-'}</TableCell>
                                            <TableCell>
                                                {getGenderBadge(user.gender)}
                                            </TableCell>
                                            <TableCell>
                                                {getMembershipBadge(user.membership)}
                                            </TableCell>
                                            <TableCell className='font-medium'>
                                                ¥{(user.wallet?.balance || 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                {user.birthday ? new Date(user.birthday).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(user.updatedAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className='sticky right-0 bg-background'>
                                                <span
                                                    className='cursor-pointer'
                                                    onClick={() => handleShowTransactions(user.id)}
                                                >
                                                    <Wallet className='mr-2 h-4 w-4' />
                                                    交易记录
                                                </span>
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

            {/* 钱包交易记录对话框 */}
            <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            用户 {selectedUserId} 的交易记录
                        </DialogTitle>
                        <DialogDescription>
                            查看用户的钱包交易历史记录
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>交易类型</TableHead>
                                    <TableHead>金额</TableHead>
                                    <TableHead>说明</TableHead>
                                    <TableHead>时间</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center">
                                            暂无交易记录
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((transaction) => (
                                        <TableRow key={transaction.id}>
                                            <TableCell>
                                                {getTransactionTypeBadge(transaction.type)}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}
                                                >
                                                    {transaction.amount >= 0 ? '+' : ''}
                                                    ¥{transaction.amount.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell>{transaction.description || '-'}</TableCell>
                                            <TableCell>
                                                {new Date(transaction.createdAt).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}