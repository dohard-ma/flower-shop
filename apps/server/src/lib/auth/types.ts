export enum UserRole {
  ADMIN = 'admin', // 后台管理员
  USER = 'user', // 普通用户（小程序用户）
  GUEST = 'guest' // 游客（未登录用户）
}

export enum Permission {
  // 商品相关权限
  PRODUCT_READ = 'product:read', // 查看商品
  PRODUCT_CREATE = 'product:create', // 创建商品
  PRODUCT_UPDATE = 'product:update', // 更新商品
  PRODUCT_DELETE = 'product:delete', // 删除商品

  // 订单相关权限
  ORDER_READ = 'order:read', // 查看订单
  ORDER_CREATE = 'order:create', // 创建订单
  ORDER_UPDATE = 'order:update', // 更新订单

  // 用户相关权限
  USER_READ = 'user:read', // 查看用户信息
  USER_UPDATE = 'user:update' // 更新用户信息
}

export interface JWTPayload {
  userId: number;
  role: UserRole;
  permissions: Permission[];
  exp?: number;
  iat?: number;
}

export interface AuthContext {
  userId?: number;
  role: UserRole;
  permissions: Permission[];
}
