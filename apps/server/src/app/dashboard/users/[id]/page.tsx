'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { ArrowLeft, Save, Loader2, User, Wallet, Crown, CalendarDays } from 'lucide-react';
import { http } from '@/lib/request';
import { useToast } from '@/hooks/use-toast';

// 用户表单数据类型
interface UserFormData {
    nickname: string;
    name: string;
    phone: string;
    gender: number;
    birthday: string;
    city: string;
    province: string;
    avatar: string;
}

// 完整用户数据类型
interface User extends UserFormData {
    id: number;
    userNo?: string;
    openid?: string;
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

const initialFormData: UserFormData = {
    nickname: '',
    name: '',
    phone: '',
    gender: 0,
    birthday: '',
    city: '',
    province: '',
    avatar: ''
};

export default function UserEditPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    // 状态判断
    const isNew = params.id === "new";

    // 状态管理
    const [formData, setFormData] = useState<UserFormData>(initialFormData);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!isNew);
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    // 数据获取
    const fetchUser = async (id: string) => {
        setInitialLoading(true);
        try {
            const response = await http.get(`/api/admin/users/${id}`);
            if (response.success) {
                const userData = response.data;
                console.log(userData)
                setUser(userData);
                setFormData({
                    nickname: userData.nickname || '',
                    name: userData.name || '',
                    phone: userData.phone || '',
                    gender: userData.gender || 0,
                    birthday: userData.birthday || '',
                    city: userData.city || '',
                    province: userData.province || '',
                    avatar: userData.avatar || ''
                });
            }
        } catch (error: any) {
            toast({
                title: '获取用户信息失败',
                description: error.message || '请稍后重试',
                variant: 'destructive'
            });
            router.back();
        } finally {
            setInitialLoading(false);
        }
    };

    // 副作用
    useEffect(() => {
        if (!isNew && params.id) {
            fetchUser(params.id as string);
        }
    }, [isNew, params.id]);

    // 事件处理
    const handleInputChange = (field: keyof UserFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        // 基础字段验证
        if (!formData.nickname.trim()) {
            toast({
                title: '验证失败',
                description: '昵称不能为空',
                variant: 'destructive'
            });
            return;
        }

        if (!formData.name.trim()) {
            toast({
                title: '验证失败',
                description: '姓名不能为空',
                variant: 'destructive'
            });
            return;
        }

        if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
            toast({
                title: '验证失败',
                description: '请输入正确的手机号格式',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            if (isNew) {
                // 创建新用户
                await http.post('/api/admin/users', formData);
                toast({
                    title: '创建成功',
                    description: '用户已成功创建'
                });
            } else {
                // 更新用户
                await http.put(`/api/admin/users/${params.id}`, formData);
                toast({
                    title: '更新成功',
                    description: '用户信息已成功更新'
                });
            }

            router.push('/dashboard/users');
        } catch (error: any) {
            toast({
                title: isNew ? '创建失败' : '更新失败',
                description: error.message || '请稍后重试',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // 获取性别选项
    const genderOptions = [
        { value: 0, label: '未知' },
        { value: 1, label: '男' },
        { value: 2, label: '女' }
    ];

    // 获取生日日期对象
    const birthdayDate = formData.birthday ? new Date(formData.birthday) : undefined;

    // 处理生日选择
    const handleBirthdaySelect = (date: Date | undefined) => {
        if (date) {
            setFormData((prev) => ({ ...prev, birthday: format(date, 'yyyy-MM-dd') }));
        } else {
            setFormData((prev) => ({ ...prev, birthday: '' }));
        }
        setDatePickerOpen(false);
    };

    // 加载状态
    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">加载中...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 页面头部 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <User className="h-6 w-6" />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {isNew ? "新建用户" : "编辑用户"}
                            </h1>
                            {!isNew && user && (
                                <p className="text-muted-foreground">用户ID: {params.id}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "保存中..." : "保存"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧主要内容 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 基本信息 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>基本信息</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                用户的基本个人信息
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* 昵称 */}
                            <div className="space-y-2">
                                <Label htmlFor="nickname">昵称 *</Label>
                                <Input
                                    id="nickname"
                                    value={formData.nickname}
                                    onChange={(e) => handleInputChange("nickname", e.target.value)}
                                    placeholder="请输入用户昵称"
                                />
                                <p className="text-sm text-muted-foreground">
                                    用户在平台上显示的名称
                                </p>
                            </div>

                            {/* 真实姓名 */}
                            <div className="space-y-2">
                                <Label htmlFor="name">真实姓名 *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    placeholder="请输入真实姓名"
                                />
                            </div>

                            {/* 手机号 */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">手机号</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange("phone", e.target.value)}
                                    placeholder="请输入手机号"
                                />
                            </div>

                            {/* 性别 */}
                            <div className="space-y-2">
                                <Label>性别</Label>
                                <Select
                                    value={formData.gender.toString()}
                                    onValueChange={(value) => handleInputChange("gender", parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择性别" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {genderOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value.toString()}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 生日 */}
                            <div className="space-y-2">
                                <Label>生日</Label>
                                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !birthdayDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {birthdayDate ? format(birthdayDate, "yyyy-MM-dd") : "选择生日"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={birthdayDate}
                                            onSelect={handleBirthdaySelect}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* 城市和省份 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="province">省份</Label>
                                    <Input
                                        id="province"
                                        value={formData.province}
                                        onChange={(e) => handleInputChange("province", e.target.value)}
                                        placeholder="请输入省份"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">城市</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange("city", e.target.value)}
                                        placeholder="请输入城市"
                                    />
                                </div>
                            </div>

                            {/* 头像URL */}
                            <div className="space-y-2">
                                <Label htmlFor="avatar">头像URL</Label>
                                <Input
                                    id="avatar"
                                    value={formData.avatar}
                                    onChange={(e) => handleInputChange("avatar", e.target.value)}
                                    placeholder="请输入头像URL"
                                />
                                {formData.avatar && (
                                    <div className="mt-2">
                                        <img
                                            src={formData.avatar}
                                            alt="头像预览"
                                            className="w-20 h-20 rounded-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 右侧状态信息 */}
                <div className="space-y-6">
                    {!isNew && user && (
                        <>
                            {/* 用户状态 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        用户状态
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>用户编号</Label>
                                        <div className="p-2 bg-muted rounded font-mono text-sm">
                                            {user.userNo || '未分配'}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>OpenID</Label>
                                        <div className="p-2 bg-muted rounded font-mono text-sm break-all">
                                            {user.openid || '未绑定'}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>更新时间</Label>
                                        <div className="p-2 bg-muted rounded text-sm">
                                            {new Date(user.updatedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 会员信息 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Crown className="h-5 w-5" />
                                        会员信息
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {user.membership ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>会员类型</Label>
                                                <Badge variant={
                                                    user.membership.status === 1 ? "default" :
                                                        user.membership.status === 2 ? "destructive" : "outline"
                                                }>
                                                    {user.membership.vipType}
                                                </Badge>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>开始时间</Label>
                                                <div className="p-2 bg-muted rounded text-sm">
                                                    {new Date(user.membership.startTime).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>结束时间</Label>
                                                <div className="p-2 bg-muted rounded text-sm">
                                                    {new Date(user.membership.endTime).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>状态</Label>
                                                <Badge variant={
                                                    user.membership.status === 1 ? "default" :
                                                        user.membership.status === 2 ? "destructive" : "outline"
                                                }>
                                                    {user.membership.status === 1 ? "开通中" :
                                                        user.membership.status === 2 ? "已过期" : "未开通"}
                                                </Badge>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            用户暂未开通会员
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 钱包信息 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Wallet className="h-5 w-5" />
                                        钱包信息
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>当前余额</Label>
                                        <div className="p-4 bg-muted rounded text-center">
                                            <div className="text-2xl font-bold">
                                                ¥{(user.wallet?.balance || 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* 操作提示 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5" />
                                操作提示
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                <ul className="space-y-2 list-disc list-inside">
                                    <li>昵称和真实姓名为必填项</li>
                                    <li>手机号需要符合中国大陆格式</li>
                                    <li>头像URL应为有效的图片地址</li>
                                    {!isNew && (
                                        <li>会员和钱包信息仅可查看，不可编辑</li>
                                    )}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}