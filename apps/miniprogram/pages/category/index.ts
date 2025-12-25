import { categoryApi, Category } from '../../utils/apis/category';
import { productApi, Product } from '../../utils/apis/product';

Component({
  options: {
    styleIsolation: 'shared',
  },
  data: {
    searchValues: '',
    categories: [] as any[],

    sidebarItems: [] as any[],
    activeSidebarValue: '' as string | number,
    expandedParentId: null as string | null,

    allProducts: [] as Product[],
    displayProducts: [] as Product[],
    activeSidebarItem: {} as any,
    loading: false,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      loadingMore: false,
      hasMore: true
    }
  },

  methods: {
    async onLoad() {
      await this.fetchCategories();
    },

    async fetchCategories() {
      this.setData({ loading: true });
      try {
        const res = await categoryApi.getPublicList();
        if (res.success) {
          const categories = this.buildCategoryTree(res.data);
          this.setData({
            categories,
          }, () => {
            this.initBusinessLine();
          });
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      } finally {
        this.setData({ loading: false });
      }
    },

    async fetchProducts(isLoadMore = false) {
      const { activeSidebarValue, pagination } = this.data;
      if (!activeSidebarValue || activeSidebarValue === -1) return;

      if (isLoadMore) {
        if (!pagination.hasMore || pagination.loadingMore) return;
        this.setData({ 'pagination.loadingMore': true });
      } else {
        this.setData({
          'pagination.page': 1,
          'pagination.hasMore': true,
          displayProducts: []
        });
      }

      try {
        const res = await productApi.getPublicList({
          page: isLoadMore ? pagination.page + 1 : 1,
          limit: pagination.limit,
          categoryId: activeSidebarValue as string
        });

        if (res.success) {
          const newProducts = res.data.data;
          const { page, total, totalPages } = res.data;

          this.setData({
            displayProducts: isLoadMore ? [...this.data.displayProducts, ...newProducts] : newProducts,
            'pagination.page': page,
            'pagination.total': total,
            'pagination.totalPages': totalPages,
            'pagination.hasMore': page < totalPages,
            'pagination.loadingMore': false
          });
        }
      } catch (error) {
        console.error('加载商品失败:', error);
        this.setData({ 'pagination.loadingMore': false });
      }
    },

    onScrollToLower() {
      this.fetchProducts(true);
    },

    buildCategoryTree(flatCategories: Category[]) {
      const roots = flatCategories.filter(c => c.level === 0 || !c.parentId);
      return roots.map(root => ({
        id: root._id,
        label: root.name,
        children: flatCategories
          .filter(c => c.parentId === root._id)
          .map(sub => ({
            id: sub._id,
            label: sub.name
          }))
      }));
    },

    initBusinessLine() {
      const categories = this.data.categories || [];
      const firstParent = categories.find((c: any) => c.children && c.children.length > 0);
      this.expandCategory(categories, firstParent ? firstParent.id : (categories[0]?.id || null));
    },

    onCategoryChange(e: any) {
      const id = e.currentTarget.dataset.id;
      const rawCategories = this.data.categories;
      const clickedItem = this.data.sidebarItems.find((i: any) => i.id === id);

      if (!clickedItem) return;

      if (clickedItem.level === 0) {
        if (clickedItem.hasChildren) {
          // 点击的是一级分类且有孩子
          if (this.data.expandedParentId === id) {
            // 如果已经是展开状态，则选中第一个二级分类
            const firstChild = this.data.sidebarItems.find((i: any) => i.parentId === id);
            if (firstChild) {
              this.selectCategory(firstChild.id);
            }
          } else {
            // 展开选中的，合拢其它的
            this.expandCategory(rawCategories, id);
          }
        } else {
          // 无子类：收起其它所有展开项，并选中自己（跳过自动选中，手动执行）
          this.expandCategory(rawCategories, null, true);
          this.selectCategory(id);
        }
      } else {
        // 点击的是二级分类：仅切换选中态，不影响父级展开状态
        this.selectCategory(id);
      }
    },

    expandCategory(rawCategories: any[], parentId: string | null, skipAutoSelect?: boolean) {
      const flattenedItems: any[] = [];
      rawCategories.forEach(cat => {
        flattenedItems.push({
          id: cat.id,
          label: cat.label,
          level: 0,
          hasChildren: !!(cat.children && cat.children.length > 0)
        });

        if (cat.id === parentId && cat.children) {
          cat.children.forEach((sub: any) => {
            flattenedItems.push({
              id: sub.id,
              label: sub.label,
              level: 1,
              parentId: cat.id
            });
          });
        }
      });

      this.setData({
        sidebarItems: flattenedItems,
        expandedParentId: parentId
      }, () => {
        // 如果明确要求跳过自动选中，则不执行后续逻辑（用于无子分类的场景）
        if (skipAutoSelect) return;

        if (parentId !== null) {
          const firstChild = flattenedItems.find(i => i.parentId === parentId);
          if (firstChild) {
            this.selectCategory(firstChild.id);
          } else {
            // 如果选中的一级分类没有子分类，则直接选中该一级分类
            this.selectCategory(parentId);
          }
        } else if (flattenedItems.length > 0) {
          // 如果没有展开项，默认选中第一个顶级项（此时所有一级分类都是收起状态）
          this.selectCategory(flattenedItems[0].id);
        }
      });
    },

    selectCategory(id: string | number) {
      const currentItem = this.data.sidebarItems.find((i: any) => i.id === id);
      if (!currentItem) return;

      this.setData({
        activeSidebarValue: id,
        activeSidebarItem: currentItem,
      }, () => {
        this.fetchProducts();
      });
    },

    async onSearch(e: any) {
      const val = e.detail.value.toLowerCase();
      if (!val) {
        this.initBusinessLine();
        return;
      }

      this.setData({
        activeSidebarValue: -1,
        activeSidebarItem: { label: `搜索: ${val}` },
        displayProducts: [],
        'pagination.page': 1,
        'pagination.hasMore': true
      });

      try {
        const res = await productApi.getPublicList({
          page: 1,
          limit: 50,
          search: val
        });

        if (res.success) {
          this.setData({
            displayProducts: res.data.data,
            'pagination.hasMore': false // 搜索结果暂时不支持分页或简单处理
          });
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
    }
  }
});
