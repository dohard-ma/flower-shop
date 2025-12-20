Component({
  options: {
    styleIsolation: 'shared',
  },
  data: {
    searchValues: '',
    topTabs: [
      { label: '订花', value: 0, subLabel: '支持自提/同城配送' },
      { label: '周边商城', value: 1, subLabel: '支持快递到家' }
    ],
    activeTopTab: 0,

    categoryMap: {
      0: [
        {
          id: 100,
          label: '即拿即走',
          children: [
            { id: 101, label: '全部' },
            { id: 102, label: '单头花束' },
            { id: 103, label: '多头花束' }
          ]
        },
        { id: 200, label: '热门精选' },
        {
          id: 300,
          label: '圣诞节',
          children: [
            { id: 301, label: '圣诞树' },
            { id: 302, label: '圣诞花环' }
          ]
        },
        {
          id: 400,
          label: '送礼场景',
          children: [
            { id: 401, label: '恋人告白' },
            { id: 402, label: '闺蜜好友' },
            { id: 403, label: '生日祝福' }
          ]
        },
        { id: 500, label: '年宵花' }
      ],
      1: []
    },

    sidebarItems: [] as any[],
    activeSidebarValue: 0,
    expandedParentId: null as number | null,

    allProducts: [
      { id: 1, categoryId: 102, name: '水培风信子', desc: '精致单头，浪漫相伴', price: '18.8', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' },
      { id: 1, categoryId: 102, name: '水培风信子', desc: '精致单头，浪漫相伴', price: '18.8', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' },
      { id: 1, categoryId: 102, name: '水培风信子', desc: '精致单头，浪漫相伴', price: '18.8', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' }, { id: 1, categoryId: 102, name: '水培风信子', desc: '精致单头，浪漫相伴', price: '18.8', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' }, { id: 1, categoryId: 102, name: '水培风信子', desc: '精致单头，浪漫相伴', price: '18.8', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' }, { id: 1, categoryId: 102, name: '水培风信子', desc: '精致单头，浪漫相伴', price: '18.8', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' }, { id: 1, categoryId: 102, name: '水培风信子', desc: '精致单头，浪漫相伴', price: '18.8', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' },
      { id: 2, categoryId: 103, name: '白色系混搭', desc: '纯洁如初，适合居家', price: '238', vip: true, image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' },
      { id: 3, categoryId: 200, name: '热门爆款玫瑰', desc: '销量冠军，永恒之爱', price: '299', vip: true, image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' },
      { id: 4, categoryId: 301, name: '迷你桌摆圣诞树', desc: '节日氛围拉满', price: '158', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' },
      { id: 6, categoryId: 401, name: '恋人告白玫瑰', desc: '一束倾心，告白必备', price: '520', vip: true, image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' },
      { id: 8, categoryId: 402, name: '向日葵之歌', desc: '友谊地久天长', price: '168', image: 'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg?imageMogr2/auto-orient/thumbnail/500x500/quality/85' }
    ],

    displayProducts: [] as any[],
    activeSidebarItem: {} as any
  },

  methods: {
    onLoad() {
      this.initBusinessLine(0);
    },

    initBusinessLine(tabValue: number) {
      const categories = (this.data.categoryMap as any)[tabValue] || [];
      const firstParent = categories.find((c: any) => c.children && c.children.length > 0);
      this.expandCategory(categories, firstParent ? firstParent.id : null);
    },

    onCategoryChange(e: any) {
      const id = Number(e.currentTarget.dataset.id);
      const rawCategories = (this.data.categoryMap as any)[this.data.activeTopTab];
      const clickedItem = this.data.sidebarItems.find(i => i.id === id);

      if (!clickedItem) return;

      if (clickedItem.level === 0) {
        if (clickedItem.hasChildren) {
          // 点击的是一级分类且有孩子
          if (this.data.expandedParentId === id) {
            // 如果已经是展开状态，则选中第一个二级分类
            const firstChild = this.data.sidebarItems.find(i => i.parentId === id);
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

    expandCategory(rawCategories: any[], parentId: number | null, skipAutoSelect?: boolean) {
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
          if (firstChild) this.selectCategory(firstChild.id);
        } else if (flattenedItems.length > 0) {
          // 如果没有展开项，默认选中第一个顶级项（此时所有一级分类都是收起状态）
          this.selectCategory(flattenedItems[0].id);
        }
      });
    },

    selectCategory(id: number) {
      const currentItem = this.data.sidebarItems.find(i => i.id === id);
      if (!currentItem) return;

      const filtered = this.data.allProducts.filter(p => {
        if (currentItem.label === '全部' && currentItem.level === 1) {
          const parentCat = (this.data.categoryMap as any)[this.data.activeTopTab].find((c: any) => c.id === currentItem.parentId);
          return parentCat.children.map((sub: any) => sub.id).includes(p.categoryId);
        }
        return p.categoryId === id;
      });

      this.setData({
        activeSidebarValue: id,
        activeSidebarItem: currentItem,
        displayProducts: filtered
      });
    },

    onTopTabChange(e: any) {
      const { value } = e.currentTarget.dataset;
      this.setData({ activeTopTab: value });
      this.initBusinessLine(value);
    },

    onSearch(e: any) {
      const val = e.detail.value.toLowerCase();
      if (!val) {
        this.initBusinessLine(this.data.activeTopTab);
        return;
      }
      const filtered = this.data.allProducts.filter(p =>
        p.name.toLowerCase().includes(val) || p.desc.toLowerCase().includes(val)
      );
      this.setData({
        displayProducts: filtered,
        activeSidebarValue: -1,
        activeSidebarItem: { label: `搜索: ${val}` }
      });
    }
  }
});
