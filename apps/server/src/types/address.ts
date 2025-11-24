// 地址相关类型定义

export interface Address {
    id: number;
    userId: number;
    nationalCode: string; // 国家编码，如 "CN"
    userName: string; // 收货人姓名
    nationalCodeFull: string; // 完整国家编码，如 "+86"
    telNumber: string; // 电话号码
    postalCode: string; // 邮政编码
    provinceName: string; // 省份名称
    cityName: string; // 城市名称
    countyName: string; // 区县名称
    streetName: string; // 街道名称
    detailInfoNew: string; // 详细地址（新版本）
    detailInfo: string; // 详细地址（兼容旧版本）
    isDefault: boolean; // 是否为默认地址
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAddressRequest {
    nationalCode?: string;
    userName: string;
    nationalCodeFull?: string;
    telNumber: string;
    postalCode: string;
    provinceName: string;
    cityName: string;
    countyName: string;
    streetName: string;
    detailInfoNew: string;
    detailInfo?: string;
    isDefault?: boolean;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
    id: number;
}

export interface AddressListResponse {
    addresses: Address[];
    defaultAddress?: Address;
}

// 地址完整显示格式
export interface FormattedAddress {
    id: number;
    userName: string;
    telNumber: string;
    fullAddress: string; // 完整地址字符串
    isDefault: boolean;
}

// 微信小程序地址选择返回格式
export interface WeChatAddressInfo {
    userName: string;
    postalCode: string;
    provinceName: string;
    cityName: string;
    countyName: string;
    detailInfo: string;
    nationalCode: string;
    telNumber: string;
}