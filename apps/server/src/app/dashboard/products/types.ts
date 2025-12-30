/**
 * 店铺分类接口定义
 */
export interface StoreCategory {
  id: string;
  name: string;
  sortOrder: number;
  parentId?: string | null;
  depth?: number; // 树形结构深度
  _count?: {
    products: number;
  };
}

/**
 * 商品对应的渠道销售信息
 */
export interface ProductChannel {
  channel: {
    id: string;
    code: string;
    name: string;
    icon?: string | null;
  };
  price: number;
  isListed: boolean;
}

/**
 * 商品规格定义
 */
export interface ProductVariant {
  id: string;
  name: string;
  stock: number;
  price: number;
  costPrice: number;
  storeCode: string | null;
  channelData: any;
}

/**
 * 核心商品模型定义
 */
export interface Product {
  id: string;
  displayId: string;    // 展示 ID (如 SPU 编码)
  name: string;         // 商品标题
  images: string[];     // 图片数组
  priceRef: string;     // 参考价格
  status: 'ACTIVE' | 'INACTIVE'; // 状态：售卖中/下架
  variants: ProductVariant[];    // 关联规格
  channels: ProductChannel[];    // 销售渠道数据
  categories?: { category: StoreCategory }[]; // 关联分类
}

/**
 * 销售渠道基础定义
 */
export interface Channel {
  id: string;
  code: string;
  name: string;
}

/**
 * 分页 API 响应通用结构
 */
export interface ApiResponse<T> {
  data: T[];
  total: number;
}

/**
 * 商品售卖状态筛选类型
 */
export type ProductStatus = 'ALL' | 'ACTIVE' | 'SOLD_OUT' | 'INACTIVE';

/**
 * 侧边栏统计计数
 */
export interface SummaryCounts {
  all: number;
  uncategorized: number;
}
