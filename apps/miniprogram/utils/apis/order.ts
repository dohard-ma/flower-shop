import { storage, STORAGE_KEYS } from '../storage';
import { request } from './index';
import { Project } from './project';

// 订单状态枚举
export enum OrderStatus {
    PENDING_PAYMENT = 0, // 待支付
    PAID = 1,            // 已支付
    SHIPPED = 2,         // 已发货
    DELIVERED = 3,       // 已送达
    COMPLETED = 4,       // 已完成
    CANCELLED = 5        // 已取消
}

// 支付类型枚举
export enum PayType {
    WECHAT = 1,    // 微信支付
    BALANCE = 2    // 余额支付
}

// 发货计划接口
export interface DeliveryPlan {
    id: number;
    deliveryNo?: string;
    orderItemId: number;
    status: number;
    deliveryStartDate: string;
    deliveryEndDate: string;
    deliveryDate?: string;
    expressNumber?: string;
    expressCompany?: string;
    receiverName?: string;
    receiverPhone?: string;
    receiverProvince?: string;
    receiverCity?: string;
    receiverArea?: string;
    receiverAddress?: string;
    deliverySequence: number;
    remark?: string;
}

// 订单项接口
export interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    price: number;
    receiverId?: number;
    // 订阅相关字段
    isSubscription: boolean;
    totalDeliveries: number;
    deliveredCount: number;
    deliveryType?: string;
    deliveryInterval?: number;
    // 送礼相关字段
    giftStatus: number;
    giftMessage?: string;
    giftReceiverName?: string;
    giftRelationship?: number;
    receivedAt?: string;
    expiredAt?: string;
    // 前端计算字段
    progressPercent?: number;
    // 关联数据
    product: Project;
    receiver?: {
        id: number;
        nickname?: string;
        name?: string;
        phone?: string;
        avatar?: string;
        avatarText?: string; // 前端计算的头像文字
    };
    deliveryPlans?: DeliveryPlan[];
}

// 订单接口
// 订单计算状态接口
export interface ComputedOrderStatus {
    orderStatus: string;
    orderStatusText: string;
    deliveryProgress: {
        totalDeliveries: number;
        deliveredCount: number;
        progressPercent: number;
        hasSubscription: boolean;
    };
    giftStatus?: {
        isShared: boolean;
        isReceived: boolean;
        canReceive: boolean;
        hasExpired: boolean;
    };
}

export interface Order {
    id: number;
    orderNo: string;
    userId: number;
    amount: number;
    payType: PayType;
    status: OrderStatus;
    giftCard: string;
    isGift: boolean;
    giftType?: number;
    giftRelationship?: string;
    addressSnapshot?: any;
    paidAt?: string;
    createdAt: string;
    orderItems: OrderItem[];
    cover?: {
        id: number;
        backgroundImage: string;
    };
    // 后端计算的状态
    computedStatus?: ComputedOrderStatus;
}

export interface OrderDetail extends Order {
    orderItems: OrderItem[];
}

export interface GiftDetail extends OrderDetail {
    user: {
        id: number;
        nickname?: string;
        avatar?: string;
    };
    giftCard: string;
    giftType: number;
    canReceive: boolean; // 是否可以领取礼物
    message: string; // 领取礼物提示信息
    // 注意：giftMessage, giftReceiverName, giftRelationship 现在在orderItems中
}

// 创建订单请求参数
export interface CreateOrderRequest {
    products: {
        id: number;
        quantity: number;
    }[];
    giftCard?: string;
    giftType?: number;
}

// 创建订单响应
export interface CreateOrderResponse {
    orderId: number;
    orderNo: string;
    order: Order;
}

/**
 * 创建订单
 */
export async function createOrder(data: CreateOrderRequest) {
    return request<CreateOrderResponse>({
        url: '/orders',
        method: 'POST',
        data
    });
}

/**
 * 获取订单列表
 */
export async function getOrderList(params: {
    userId: number;
    page?: number;
    limit?: number;
}) {
    return request<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
    }>({
        url: '/api/orders',
        method: 'GET',
        data: params
    });
}

/**
 * 获取订单详情
 */
export async function getOrderDetail(orderId: string) {
    return request<OrderDetail>({
        url: `/orders/${orderId}`,
        method: 'GET'
    });
}

/**
 * 取消订单
 */
export async function cancelOrder(orderId: number) {
    return request({
        url: `/api/orders/${orderId}`,
        method: 'DELETE'
    });
}

export async function createPayOrder(data: {
    orderId: number;
    addressInfo?: {
        userName: string;
        telNumber: string;
        provinceName: string;
        cityName: string;
        countyName: string;
        detailInfo: string;
        postalCode?: string;
        nationalCode?: string;
    }
}) {
    return request<{
        paymentParams: any;
    }>({
        url: `/payment/create`,
        method: 'POST',
        data
    });
}

// 获取用户订单列表
export const getUserOrders = async (params?: {
    orderType?: string;  // 订单类型：gift-赠送订单, purchase-购买订单
    status?: string;
    productType?: string;
    timeRange?: string;
    page?: number;
    limit?: number;
}) => {
    const res = await request<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>({
        url: '/orders',
        method: 'GET',
        data: params
    });
    return res;
};

// 确认收货
export const confirmOrderReceipt = async (orderId: number) => {
    const res = await request<{
        orderId: number;
        orderNo: string;
    }>({
        url: `/orders/${orderId}/confirm`,
        method: 'POST'
    });
    return res;
};

// 获取发货计划详情（已废弃，发货计划现在包含在订单详情中）
export const getDeliveryPlans = async (orderItemId: number) => {
    const res = await request<DeliveryPlan[]>({
        url: '/delivery-plans',
        method: 'GET',
        data: { orderItemId }
    });
    return res;
};

export const updateOrderInfo = async (orderId: string, giftRelationship: string, giftReceiverName: string, giftMessage: string, orderItemId?: number) => {
    const data: any = { giftRelationship, giftReceiverName, giftMessage };

    // 如果指定了orderItemId，则只更新该订单项
    if (orderItemId) {
        data.orderItemId = orderItemId;
    }

    const res = await request({
        url: `/orders/${orderId}`,
        method: 'PUT',
        data
    });
    return res;
};

export const getGiftDetail = async (orderId: string) => {
    const res = await request<GiftDetail>({
        url: `/orders/gift/${orderId}`,
        method: 'GET'
    });
    return res;
};

// 确认领取礼物
export const confirmGiftReceive = async (data: {
    orderId: string;
    orderItemId?: number; // 新增：指定要领取的商品ID
    address: {
        userName: string;
        telNumber: string;
        provinceName: string;
        cityName: string;
        countyName: string;
        detailInfo: string;
        postalCode?: string;
        nationalCode?: string;
    };
    userInfo?: {
        selectedRelationship: number;
        nickname?: string;
        avatar?: string;
    };
}) => {
    const requestData: any = {
        address: data.address,
        userInfo: data.userInfo
    };

    // 如果指定了orderItemId，传递给后端
    if (data.orderItemId) {
        requestData.orderItemId = data.orderItemId;
    }

    const res = await request<{
        orderId: number;
        orderNo: string;
        message: string;
    }>({
        url: `/orders/${data.orderId}/receive`,
        method: 'POST',
        data: requestData
    });
    return res;
};