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
  productId: string;
  name: string;
  stock: number;
  price: number;
  costPrice: number;
  storeCode: string | null;
  channelData?: any;
  isActive: boolean;
  sortOrder: number;
}

/**
 * 核心商品模型定义
 */
export interface Product {
  id: string;
  displayId: string;    // 展示 ID (如 SPU 编码)
  name: string;         // 商品标题
  description?: string | null;
  images: string[];     // 图片数组
  status: 'ACTIVE' | 'INACTIVE'; // 状态：售卖中/下架
  mainFlower?: string | null;
  colorSeries?: string | null;
  materials?: any;
  styleId?: string | null;
  style?: { id: string; name: string } | null;
  variants: ProductVariant[];    // 关联规格
  channels: ProductChannel[];    // 销售渠道数据
  categories?: { category: StoreCategory }[]; // 关联分类
  sortOrder: number;
}

/**
 * 销售渠道基础定义
 */
export interface Channel {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
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
