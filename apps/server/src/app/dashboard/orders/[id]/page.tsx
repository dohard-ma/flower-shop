'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    ArrowLeft,
    Save,
    Loader2,
    Package,
    User,
    MapPin,
    Truck,
    Calendar,
    Phone,
    Copy,
    CheckCircle,
    ShoppingCart,
    CreditCard,
    Gift,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { http } from '@/lib/request';
import { useToast } from '@/hooks/use-toast';

// 订单表单数据类型
interface OrderFormData {
    userId: number;
    amount: number;
    payType: number;
    status: number;
    isGift: boolean;
    giftType?: number;
    giftCard?: string;
}

// 完整订单数据类型
interface OrderDetail extends OrderFormData {
    id: number;
    orderNo: string;
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
        price: number;
        receiverId?: number;
        isSubscription: boolean;
        totalDeliveries: number;
        deliveredCount: number;
        deliveryType?: string;
        deliveryInterval?: number;
        giftStatus: number;
        receivedAt?: string;
        expiredAt?: string;
        product: {
            id: number;
            productName: string;
            productType: number;
            price: number;
            coverImages?: string[];
            isSubscription: boolean;
            maxDeliveries?: number;
            deliveryType?: string;
            deliveryInterval?: number;
        };
        receiver?: {
            id: number;
            nickname?: string;
            phone?: string;
            avatar?: string;
        };
        deliveryPlans: Array<{
            id: number;
            deliveryNo?: string;
            deliveryStartDate: string;
            deliveryEndDate: string;
            deliveryDate?: string;
            expressCompany?: string;
            expressNumber?: string;
            status: number;
            deliverySequence: number;
            receiverName?: string;
            receiverPhone?: string;
            receiverAddress?: string;
            receiverProvince?: string;
            receiverCity?: string;
            receiverArea?: string;
            remark?: string;
        }>;
    }>;
    userCoupon?: {
        id: number;
        coupon: {
            id: number;
            name: string;
            discount: number;
            minSpend: number;
        };
    };
}

const initialFormData: OrderFormData = {
    userId: 0,
    amount: 0,
    payType: 1,
    status: 0,
    isGift: false,
    giftType: undefined,
    giftCard: ''
};

export default function OrderEditPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    // 状态判断
    const isNew = params.id === "new";

    // 状态管理
    const [formData, setFormData] = useState<OrderFormData>(initialFormData);
    const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!isNew);

    // 数据获取
    const fetchOrderDetail = async (id: string) => {
        setInitialLoading(true);
        try {
            const response = await http.get(`/api/admin/orders/${id}`);
            if (response.success) {
                const orderData = response.data;
                setOrderDetail(orderData);
                setFormData({
                    userId: orderData.userId || 0,
                    amount: orderData.amount || 0,
                    payType: orderData.payType || 1,
                    status: orderData.status || 0,
                    isGift: orderData.isGift || false,
                    giftType: orderData.giftType,
                    giftCard: orderData.giftCard || ''
                });
            }
        } catch (error: any) {
            toast({
                title: '获取订单信息失败',
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
            fetchOrderDetail(params.id as string);
        }
    }, [isNew, params.id]);

    // 事件处理
    const handleInputChange = (field: keyof OrderFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        // 基础字段验证
        if (!formData.userId) {
            toast({
                title: '验证失败',
                description: '请选择用户',
                variant: 'destructive'
            });
            return;
        }

        if (formData.amount <= 0) {
            toast({
                title: '验证失败',
                description: '订单金额必须大于0',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            if (isNew) {
                // 创建新订单
                await http.post('/api/admin/orders', formData);
                toast({
                    title: '创建成功',
                    description: '订单已成功创建'
                });
            } else {
                // 更新订单
                await http.put(`/api/admin/orders/${params.id}`, formData);
                toast({
                    title: '更新成功',
                    description: '订单信息已成功更新'
                });
            }

            router.push('/dashboard/order');
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

    // 复制到剪贴板
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: '复制成功',
            description: `${label}已复制到剪贴板`
        });
    };

    // 获取状态配置
    const getOrderStatusConfig = (status: number) => {
        const configs = {
            0: { text: '待支付', variant: 'destructive' as const, color: 'orange' },
            1: { text: '已支付', variant: 'default' as const, color: 'blue' },
            2: { text: '已赠送', variant: 'default' as const, color: 'green' },
            3: { text: '已完成', variant: 'secondary' as const, color: 'green' },
            4: { text: '已取消', variant: 'outline' as const, color: 'gray' }
        };
        return configs[status as keyof typeof configs] || configs[0];
    };

    const getPayTypeConfig = (payType: number) => {
        const configs = {
            1: { text: '微信支付', icon: '💳' },
            2: { text: '余额支付', icon: '💰' }
        };
        return configs[payType as keyof typeof configs] || configs[1];
    };

    const getDeliveryStatusConfig = (status: number) => {
        const configs = {
            0: { text: '待确认', variant: 'destructive' as const, color: 'orange' },
            1: { text: '已确认', variant: 'default' as const, color: 'blue' },
            2: { text: '已发货', variant: 'default' as const, color: 'green' },
            3: { text: '已完成', variant: 'secondary' as const, color: 'green' },
            4: { text: '已取消', variant: 'outline' as const, color: 'gray' }
        };
        return configs[status as keyof typeof configs] || configs[0];
    };

    const getProductTypeConfig = (type: number) => {
        const configs = {
            1: { text: '年卡', color: 'purple' },
            2: { text: '礼盒', color: 'pink' },
            3: { text: '周边', color: 'blue' }
        };
        return configs[type as keyof typeof configs] || configs[1];
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
                        <ShoppingCart className="h-6 w-6" />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {isNew ? "新建订单" : "订单详情"}
                            </h1>
                            {!isNew && orderDetail && (
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-muted-foreground">订单号: {orderDetail.orderNo}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(orderDetail.orderNo, '订单号')}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                    <Badge variant={getOrderStatusConfig(orderDetail.status).variant}>
                                        {getOrderStatusConfig(orderDetail.status).text}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        取消
                    </Button>
                    {(isNew || (orderDetail && orderDetail.status === 0)) && (
                        <Button onClick={handleSave} disabled={loading}>
                            <Save className="mr-2 h-4 w-4" />
                            {loading ? "保存中..." : "保存"}
                        </Button>
                    )}
                </div>
            </div>

            {isNew ? (
                // 新建订单表单
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>订单信息</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    创建新的订单
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="userId">用户ID *</Label>
                                    <Input
                                        id="userId"
                                        type="number"
                                        value={formData.userId}
                                        onChange={(e) => handleInputChange("userId", parseInt(e.target.value) || 0)}
                                        placeholder="请输入用户ID"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="amount">订单金额 *</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
                                        placeholder="请输入订单金额"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>支付方式</Label>
                                    <Select
                                        value={formData.payType.toString()}
                                        onValueChange={(value) => handleInputChange("payType", parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择支付方式" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">微信支付</SelectItem>
                                            <SelectItem value="2">余额支付</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>订单状态</Label>
                                    <Select
                                        value={formData.status.toString()}
                                        onValueChange={(value) => handleInputChange("status", parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择订单状态" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">待支付</SelectItem>
                                            <SelectItem value="1">已支付</SelectItem>
                                            <SelectItem value="2">已赠送</SelectItem>
                                            <SelectItem value="3">已完成</SelectItem>
                                            <SelectItem value="4">已取消</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>操作提示</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    <ul className="space-y-2 list-disc list-inside">
                                        <li>用户ID和订单金额为必填项</li>
                                        <li>订单金额必须大于0</li>
                                        <li>创建后可以通过详情页面查看订单信息</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : orderDetail ? (
                // 订单详情展示
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左侧主要内容 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 订单基本信息 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    订单信息
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">订单ID</Label>
                                        <div className="font-mono text-sm">{orderDetail.id}</div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">订单金额</Label>
                                        <div className="text-lg font-semibold">¥{orderDetail.amount}</div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">支付方式</Label>
                                        <div className="flex items-center gap-1">
                                            <span>{getPayTypeConfig(orderDetail.payType).icon}</span>
                                            <span>{getPayTypeConfig(orderDetail.payType).text}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">创建时间</Label>
                                        <div className="text-sm">{new Date(orderDetail.createdAt).toLocaleString()}</div>
                                    </div>
                                    {orderDetail.paidAt && (
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">支付时间</Label>
                                            <div className="text-sm">{new Date(orderDetail.paidAt).toLocaleString()}</div>
                                        </div>
                                    )}
                                </div>

                                {orderDetail.isGift && (
                                    <Alert>
                                        <Gift className="h-4 w-4" />
                                        <AlertDescription>
                                            这是一个赠送订单
                                            {orderDetail.giftCard && ` - 礼品卡: ${orderDetail.giftCard}`}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* 购买用户信息 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    购买用户
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={orderDetail.user.avatar} />
                                        <AvatarFallback>
                                            <User className="h-6 w-6" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">
                                            {orderDetail.user.nickname || '未设置昵称'}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            ID: {orderDetail.user.id}
                                        </div>
                                        {orderDetail.user.phone && (
                                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {orderDetail.user.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 订单商品 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    订单商品
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="items" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="items">商品列表</TabsTrigger>
                                        <TabsTrigger value="delivery">配送计划</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="items" className="space-y-4">
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>商品信息</TableHead>
                                                        <TableHead>类型</TableHead>
                                                        <TableHead>数量</TableHead>
                                                        <TableHead>单价</TableHead>
                                                        <TableHead>接收人</TableHead>
                                                        <TableHead>状态</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {orderDetail.orderItems.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    {item.product.coverImages?.[0] && (
                                                                        <img
                                                                            src={item.product.coverImages[0]}
                                                                            alt={item.product.productName}
                                                                            className="w-12 h-12 rounded object-cover"
                                                                        />
                                                                    )}
                                                                    <div>
                                                                        <div className="font-medium">{item.product.productName}</div>
                                                                        <div className="text-sm text-muted-foreground">
                                                                            ID: {item.product.id}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <Badge variant="outline">
                                                                        {getProductTypeConfig(item.product.productType).text}
                                                                    </Badge>
                                                                    {item.isSubscription && (
                                                                        <Badge variant="outline" className="ml-1">订阅</Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{item.quantity}</TableCell>
                                                            <TableCell>¥{item.price}</TableCell>
                                                            <TableCell>
                                                                {item.receiver ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar className="h-6 w-6">
                                                                            <AvatarImage src={item.receiver.avatar} />
                                                                            <AvatarFallback>
                                                                                <User className="h-3 w-3" />
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div>
                                                                            <div className="text-sm">{item.receiver.nickname}</div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {item.receiver.phone}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {item.giftStatus === 1 ? '已接收' : '待接收'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="delivery" className="space-y-4">
                                        {orderDetail.orderItems.map((item) =>
                                            item.deliveryPlans.length > 0 && (
                                                <div key={item.id} className="space-y-2">
                                                    <h4 className="font-medium">{item.product.productName}</h4>
                                                    <div className="rounded-md border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>配送批次</TableHead>
                                                                    <TableHead>配送日期</TableHead>
                                                                    <TableHead>快递信息</TableHead>
                                                                    <TableHead>收货地址</TableHead>
                                                                    <TableHead>状态</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {item.deliveryPlans.map((plan) => (
                                                                    <TableRow key={plan.id}>
                                                                        <TableCell>
                                                                            第 {plan.deliverySequence} 次配送
                                                                            {plan.deliveryNo && (
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {plan.deliveryNo}
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <div className="space-y-1">
                                                                                <div className="text-sm">
                                                                                    {new Date(plan.deliveryStartDate).toLocaleDateString()} -
                                                                                    {new Date(plan.deliveryEndDate).toLocaleDateString()}
                                                                                </div>
                                                                                {plan.deliveryDate && (
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        实际: {new Date(plan.deliveryDate).toLocaleDateString()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {plan.expressCompany && plan.expressNumber ? (
                                                                                <div className="space-y-1">
                                                                                    <div className="text-sm">{plan.expressCompany}</div>
                                                                                    <div className="text-xs text-muted-foreground font-mono">
                                                                                        {plan.expressNumber}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-muted-foreground">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {plan.receiverName && plan.receiverAddress ? (
                                                                                <div className="space-y-1">
                                                                                    <div className="text-sm">
                                                                                        {plan.receiverName} {plan.receiverPhone}
                                                                                    </div>
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {plan.receiverProvince} {plan.receiverCity} {plan.receiverArea}
                                                                                    </div>
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {plan.receiverAddress}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-muted-foreground">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant={getDeliveryStatusConfig(plan.status).variant}>
                                                                                {getDeliveryStatusConfig(plan.status).text}
                                                                            </Badge>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 右侧状态信息 */}
                    <div className="space-y-6">
                        {/* 订单状态 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    订单状态
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center">
                                    <Badge
                                        variant={getOrderStatusConfig(orderDetail.status).variant}
                                        className="text-base px-4 py-2"
                                    >
                                        {getOrderStatusConfig(orderDetail.status).text}
                                    </Badge>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>订单创建</span>
                                        <span className="text-muted-foreground ml-auto">
                                            {new Date(orderDetail.createdAt).toLocaleString()}
                                        </span>
                                    </div>

                                    {orderDetail.paidAt && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>订单支付</span>
                                            <span className="text-muted-foreground ml-auto">
                                                {new Date(orderDetail.paidAt).toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    {orderDetail.status >= 3 && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>订单完成</span>
                                            <span className="text-muted-foreground ml-auto">
                                                {new Date(orderDetail.updatedAt).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 优惠券信息 */}
                        {orderDetail.userCoupon && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        使用优惠券
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="font-medium">
                                            {orderDetail.userCoupon.coupon.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            折扣: {orderDetail.userCoupon.coupon.discount}%
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            最低消费: ¥{orderDetail.userCoupon.coupon.minSpend}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* 订阅统计 */}
                        {orderDetail.orderItems.some(item => item.isSubscription) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Truck className="h-5 w-5" />
                                        订阅配送统计
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {orderDetail.orderItems
                                            .filter(item => item.isSubscription)
                                            .map((item) => (
                                                <div key={item.id} className="space-y-2">
                                                    <div className="text-sm font-medium">
                                                        {item.product.productName}
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">配送进度</span>
                                                        <span>
                                                            {item.deliveredCount} / {item.totalDeliveries}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full"
                                                            style={{
                                                                width: `${(item.deliveredCount / item.totalDeliveries) * 100}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* 操作提示 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    操作说明
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    <ul className="space-y-2 list-disc list-inside">
                                        <li>订单创建后无法删除，只能取消</li>
                                        <li>已支付的订单无法修改金额</li>
                                        <li>订阅商品会自动生成配送计划</li>
                                        <li>配送信息需要在配送管理中更新</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg text-muted-foreground">订单不存在</div>
                </div>
            )}
        </div>
    );
}