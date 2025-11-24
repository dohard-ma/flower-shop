
// 商品接口定义
interface Product {
  id: string;
  name: string;
  category: string;
  images: string[];
  videos?: string[];
  priceRef: string;
  materials: Array<{
    name: string;
    quantity?: number;
    color?: string;
    description?: string;
  }>;
  status: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 分类接口定义
interface Category {
  value: string;
  label: string;
}

Page({
  data: {
    // 基础数据
    searchValue: '',
    currentCategory: 'all',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,

    // 分类数据
    categories: [
      { value: 'all', label: '全部' },
      { value: 'BOUQUET', label: '花束' },
      { value: 'BASKET', label: '花篮' },
      { value: 'POTTED', label: '盆栽' },
      { value: 'WREATH', label: '花环' }
    ] as Category[],

    // 商品数据
    products: [] as Product[],
    filteredProducts: [] as Product[]
  },

  onLoad() {
    this.loadProducts();
  },

  onShow() {
    // 可以在这里刷新数据
  },

  onPullDownRefresh() {
    this.refreshProducts();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 加载商品数据
  async loadProducts() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 这里应该调用实际的API
      // const response = await wx.request({...});

      // 模拟API调用
      const mockProducts = this.generateMockProducts(this.data.page);

      if (this.data.page === 1) {
        this.setData({
          products: mockProducts,
          hasMore: mockProducts.length === this.data.pageSize
        });
      } else {
        this.setData({
          products: [...this.data.products, ...mockProducts],
          hasMore: mockProducts.length === this.data.pageSize
        });
      }

      this.filterProducts();

    } catch (error) {
      console.error('加载商品失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 生成模拟数据
  generateMockProducts(page: number): Product[] {
    const categories = ['BOUQUET', 'BASKET', 'POTTED', 'WREATH'];
    const materials = [
      { name: '玫瑰', color: '红色' },
      { name: '康乃馨', color: '粉色' },
      { name: '百合', color: '白色' },
      { name: '满天星', color: '白色' },
      { name: '桔梗', color: '紫色' }
    ];

    const products: Product[] = [];
    const startIndex = (page - 1) * this.data.pageSize;

    for (let i = 0; i < this.data.pageSize; i++) {
      const index = startIndex + i;
      const category = categories[index % categories.length];
      const categoryName = this.getCategoryLabel(category);

      products.push({
        id: `product_${index + 1}`,
        name: `${categoryName}${Math.floor(index / 4) + 1}号`,
        category,
        images: [
          `https://static.laohuoji.link/huajianli/products/images/d33af659-89b2-4931-a51c-d9b747b4d88e.webp`
        ],
        priceRef: index % 3 === 0 ? '¥120-180' : `¥${120 + (index % 5) * 20}`,
        materials: materials.slice(0, (index % 3) + 2),
        status: index % 8 === 0 ? 'INACTIVE' : 'ACTIVE',
        description: `精美的${categoryName}，采用新鲜花材制作，适合各种场合`,
        sortOrder: index + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return products;
  },

  // 刷新商品列表
  refreshProducts() {
    this.setData({
      page: 1,
      products: [],
      hasMore: true
    });
    this.loadProducts();
  },

  // 加载更多
  loadMore() {
    this.setData({
      page: this.data.page + 1
    });
    this.loadProducts();
  },

  // 搜索输入
  onSearchInput(e: any) {
    this.setData({
      searchValue: e.detail.value
    });
    this.debounceFilter();
  },

  // 搜索确认
  onSearchConfirm() {
    this.filterProducts();
  },

  // 防抖过滤
  debounceFilter() {
    // 简单的防抖实现
    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
    }
    this.filterTimer = setTimeout(() => {
      this.filterProducts();
    }, 300);
  },

  // 分类切换
  onCategoryChange(e: any) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category
    });
    this.filterProducts();
  },

  // 过滤商品
  filterProducts() {
    let filtered = [...this.data.products];

    // 分类过滤
    if (this.data.currentCategory !== 'all') {
      filtered = filtered.filter(product =>
        product.category === this.data.currentCategory
      );
    }

    // 搜索过滤
    if (this.data.searchValue.trim()) {
      const searchTerm = this.data.searchValue.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.materials.some(material =>
          material.name.toLowerCase().includes(searchTerm)
        )
      );
    }

    this.setData({
      filteredProducts: filtered
    });
  },

  // 商品点击
  onProductTap(e: any) {
    const product = e.currentTarget.dataset.product;

    // 跳转到商品详情页
    wx.navigateTo({
      url: `/pages/product/detail/index?id=${product.id}`,
      fail: () => {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取分类标签
  getCategoryLabel(category: string): string {
    const categoryMap: Record<string, string> = {
      'BOUQUET': '花束',
      'BASKET': '花篮',
      'POTTED': '盆栽',
      'WREATH': '花环'
    };
    return categoryMap[category] || '未知';
  },

  // 获取花材文本
  getMaterialsText(materials: any[]): string {
    if (!materials || !Array.isArray(materials)) return '暂无花材信息';
    return materials.map(m => m.name || '未知花材').join('、');
  },

  // 格式化时间
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`;
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`;
    } else {
      return date.toLocaleDateString();
    }
  },

  // 防抖计时器
  filterTimer: null as any
})