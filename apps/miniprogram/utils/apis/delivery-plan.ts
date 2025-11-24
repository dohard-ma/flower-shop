import { request } from './index';

// 发货计划详情接口
export interface DeliveryPlanDetail {
    id: number;
    deliveryNo?: string;
    orderItemId: number;
    subscriptionProductId?: number;
    solarTermId?: number;
    userId: number;
    receiverId?: number;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    receiverProvince?: string;
    receiverCity?: string;
    receiverArea?: string;
    deliveryStartDate: string;
    deliveryEndDate: string;
    deliveryDate?: string;
    expressCompany?: string;
    expressNumber?: string;
    status: number;
    deliverySequence: number;
    remark?: string;
    userRole: 'sender' | 'receiver';
    canModifyAddress: boolean;
    statusText: string;
    deliveryTimeText: string;
    product: {
        id: number;
        productName: string;
        productType: number;
        isSubscription: boolean;
        images?: any;
        detail?: string;
    };
    order: {
        id: number;
        orderNo: string;
        userId: number;
        user: {
            id: number;
            nickname: string;
            phone?: string;
            avatar?: string;
        };
    };
    solarTerm?: {
        id: number;
        name: string;
        startTime: string;
        endTime: string;
    };
}

// 地址修改参数
export interface AddressUpdateParams {
    receiverName: string;
    receiverPhone: string;
    receiverProvince?: string;
    receiverCity?: string;
    receiverArea?: string;
    receiverAddress: string;
}

/**
 * 获取发货计划详情
 */
export const getDeliveryPlanDetail = async (deliveryPlanId: number) => {
    const res = await request<DeliveryPlanDetail>({
        url: `/delivery-plans/${deliveryPlanId}`,
        method: 'GET'
    });
    return res;
};

/**
 * 修改收货地址
 */
export const updateDeliveryAddress = async (deliveryPlanId: number, addressData: AddressUpdateParams) => {
    const res = await request<DeliveryPlanDetail>({
        url: `/delivery-plans/${deliveryPlanId}`,
        method: 'PUT',
        data: addressData
    });
    return res;
};