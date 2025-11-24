import { Address, FormattedAddress, WeChatAddressInfo } from '@/types/address';

/**
 * 格式化地址为完整字符串
 */
export function formatFullAddress(address: Address | WeChatAddressInfo): string {
    const parts = [
        address.provinceName,
        address.cityName,
        address.countyName,
        'streetName' in address ? address.streetName : '',
        'detailInfoNew' in address ? address.detailInfoNew : address.detailInfo
    ].filter(Boolean);

    return parts.join('');
}

/**
 * 将地址转换为格式化显示对象
 */
export function formatAddressForDisplay(address: Address): FormattedAddress {
    return {
        id: address.id,
        userName: address.userName,
        telNumber: address.telNumber,
        fullAddress: formatFullAddress(address),
        isDefault: address.isDefault
    };
}

/**
 * 验证手机号格式
 */
export function validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
}

/**
 * 验证邮政编码格式
 */
export function validatePostalCode(postalCode: string): boolean {
    const postalCodeRegex = /^\d{6}$/;
    return postalCodeRegex.test(postalCode);
}

/**
 * 验证收货人姓名
 */
export function validateUserName(userName: string): boolean {
    return userName.trim().length >= 2 && userName.trim().length <= 20;
}

/**
 * 将微信地址信息转换为创建地址请求格式
 */
export function convertWeChatAddressToRequest(wechatAddress: WeChatAddressInfo): {
    nationalCode: string;
    userName: string;
    nationalCodeFull: string;
    telNumber: string;
    postalCode: string;
    provinceName: string;
    cityName: string;
    countyName: string;
    streetName: string;
    detailInfoNew: string;
    detailInfo: string;
} {
    return {
        nationalCode: wechatAddress.nationalCode || 'CN',
        userName: wechatAddress.userName,
        nationalCodeFull: '+86', // 默认中国区号
        telNumber: wechatAddress.telNumber,
        postalCode: wechatAddress.postalCode,
        provinceName: wechatAddress.provinceName,
        cityName: wechatAddress.cityName,
        countyName: wechatAddress.countyName,
        streetName: '', // 微信地址没有街道信息
        detailInfoNew: wechatAddress.detailInfo,
        detailInfo: wechatAddress.detailInfo
    };
}

/**
 * 生成地址摘要（用于订单快照等场景）
 */
export function generateAddressSummary(address: Address): string {
    return `${address.userName} ${address.telNumber} ${formatFullAddress(address)}`;
}

/**
 * 检查地址是否完整
 */
export function isAddressComplete(address: Partial<Address>): boolean {
    const requiredFields: (keyof Address)[] = [
        'userName',
        'telNumber',
        'provinceName',
        'cityName',
        'countyName',
        'detailInfoNew'
    ];

    return requiredFields.every(field => {
        const value = address[field];
        return value && typeof value === 'string' && value.trim().length > 0;
    });
}