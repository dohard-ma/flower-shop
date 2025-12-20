interface Category {
  _id: string;
  name: string;
  sort: number;
  isVisible: boolean;
  parentId: string | null; // 父分类ID
  productCount: number;    // 关联商品数量
  level: number;           // 层级 (0=一级, 1=二级)
  expanded?: boolean;      // 是否展开子分类
}

interface FlatCategory extends Category {
  indent: number;          // 缩进级别
  hasChildren: boolean;    // 是否有子分类
  canAddChild: boolean;    // 是否可以添加子分类
  isFirstInGroup: boolean; // 是否是同级分组中的第一个
  isLastInGroup: boolean;  // 是否是同级分组中的最后一个
}

Page({
  data: {
    categories: [] as Category[],
    flatList: [] as FlatCategory[], // 扁平化的展示列表
  },

  onLoad() {
    this.loadCategories();
  },

  // 1. 加载分类数据 (实际开发中请替换为云开发或API调用)
  loadCategories() {
    const mockCategories: Category[] = [
      { _id: '1', name: '玫瑰花束', sort: 1, isVisible: true, parentId: null, productCount: 15, level: 0 },
      { _id: '1-1', name: '红玫瑰', sort: 1, isVisible: true, parentId: '1', productCount: 8, level: 1 },
      { _id: '1-2', name: '粉玫瑰', sort: 2, isVisible: true, parentId: '1', productCount: 7, level: 1 },
      { _id: '2', name: '康乃馨', sort: 2, isVisible: true, parentId: null, productCount: 0, level: 0, expanded: true },
      { _id: '2-1', name: '红康乃馨', sort: 1, isVisible: true, parentId: '2', productCount: 0, level: 1 },
      { _id: '2-2', name: '粉康乃馨', sort: 2, isVisible: false, parentId: '2', productCount: 0, level: 1 },
      { _id: '3', name: '百合花', sort: 3, isVisible: true, parentId: null, productCount: 10, level: 0 },
    ];

    this.setData({ categories: mockCategories }, () => {
      this.buildFlatList();
    });
  },

  // 2. 构建扁平化展示列表 (借力不造：处理展示逻辑与数据逻辑分离)
  buildFlatList() {
    const { categories } = this.data;
    const flatList: FlatCategory[] = [];

    // 获取并排序一级分类
    const rootCategories = categories
      .filter(item => !item.parentId)
      .sort((a, b) => a.sort - b.sort);

    rootCategories.forEach((parent, rootIndex) => {
      const children = categories.filter(item => item.parentId === parent._id);
      const hasChildren = children.length > 0;
      const canAddChild = parent.productCount === 0;

      flatList.push({
        ...parent,
        indent: 0,
        hasChildren,
        canAddChild,
        expanded: parent.expanded !== false,
        isFirstInGroup: rootIndex === 0,
        isLastInGroup: rootIndex === rootCategories.length - 1
      });

      // 如果展开且有子分类，按 sort 顺序插入
      if (parent.expanded !== false && hasChildren) {
        const sortedChildren = children.sort((a, b) => a.sort - b.sort);
        sortedChildren.forEach((child, childIndex) => {
          flatList.push({
            ...child,
            indent: 1,
            hasChildren: false,
            canAddChild: false,
            isFirstInGroup: childIndex === 0,
            isLastInGroup: childIndex === sortedChildren.length - 1
          });
        });
      }
    });

    this.setData({ flatList });
  },

  // 3. 排序移动逻辑 (简单替代拖动方案)
  onMoveOrder(e: any) {
    const { index, direction } = e.currentTarget.dataset;
    const list = this.data.flatList;
    const currentItem = list[index];

    // 边界检查：不能移出同级分组
    if (direction === 'up' && currentItem.isFirstInGroup) return;
    if (direction === 'down' && currentItem.isLastInGroup) return;

    // 在同级分组内查找目标项
    const { categories } = this.data;
    const siblingItems = categories
      .filter(item => item.parentId === currentItem.parentId)
      .sort((a, b) => a.sort - b.sort);

    const currentIndexInGroup = siblingItems.findIndex(item => item._id === currentItem._id);
    const targetIndexInGroup = direction === 'up' ? currentIndexInGroup - 1 : currentIndexInGroup + 1;

    // 同级边界检查
    if (targetIndexInGroup < 0 || targetIndexInGroup >= siblingItems.length) return;

    const targetItem = siblingItems[targetIndexInGroup];

    wx.vibrateShort({ type: 'medium' }); // 增加触感反馈

    // 交换 sort 值
    const newCategories = categories.map(cat => {
      if (cat._id === currentItem._id) return { ...cat, sort: targetItem.sort };
      if (cat._id === targetItem._id) return { ...cat, sort: currentItem.sort };
      return cat;
    });

    this.setData({ categories: newCategories }, () => {
      this.buildFlatList();
      wx.showToast({ title: '顺序已更新', icon: 'success' });
    });
  },

  // 4. 编辑名称 (使用弹窗编辑)
  onStartEdit(e: any) {
    const { id, name } = e.currentTarget.dataset;

    wx.showModal({
      title: '编辑分类名称',
      editable: true,
      placeholderText: '请输入新名称',
      content: name,
      success: (res) => {
        if (res.confirm && res.content) {
          const newName = res.content.trim();
          if (!newName) {
            wx.showToast({ title: '名称不能为空', icon: 'none' });
            return;
          }

          const categories = this.data.categories.map(item =>
            item._id === id ? { ...item, name: newName } : item
          );

          this.setData({ categories }, () => {
            this.buildFlatList();
            wx.showToast({ title: '修改成功', icon: 'success' });
          });
        }
      }
    });
  },

  // 5. 状态切换与层级操作
  onToggleExpand(e: any) {
    const { id } = e.currentTarget.dataset;
    const categories = this.data.categories.map(item =>
      item._id === id ? { ...item, expanded: !item.expanded } : item
    );
    this.setData({ categories }, () => this.buildFlatList());
  },

  onToggleVisible(e: any) {
    const { id } = e.currentTarget.dataset;
    const categories = this.data.categories.map(item =>
      item._id === id ? { ...item, isVisible: !item.isVisible } : item
    );
    this.setData({ categories }, () => this.buildFlatList());
  },

  // 6. 删除分类 (敬畏现实：增加商品和子分类依赖检查)
  onDelete(e: any) {
    const { id, name, hasChildren, productCount } = e.currentTarget.dataset;

    // 检查是否有商品
    if (productCount > 0) {
      wx.showModal({
        title: '无法删除',
        content: `"${name}"下有 ${productCount} 件商品，请先移除或转移商品。`,
        showCancel: false
      });
      return;
    }

    // 检查是否有子分类
    if (hasChildren) {
      wx.showModal({
        title: '无法删除',
        content: `"${name}"下有子分类，请先删除子分类。`,
        showCancel: false
      });
      return;
    }

    // 确认删除
    wx.showModal({
      title: '确认删除',
      content: `确定删除"${name}"吗？`,
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const categories = this.data.categories.filter(item => item._id !== id);
          this.setData({ categories }, () => {
            this.buildFlatList();
            wx.showToast({ title: '删除成功', icon: 'success' });
          });
        }
      }
    });
  },

  // 7. 新增操作
  onAdd() {
    this.showAddModal(null, '新增一级分类');
  },

  onAddChild(e: any) {
    const { id, name } = e.currentTarget.dataset;
    this.showAddModal(id, `为"${name}"添加子类`);
  },

  showAddModal(parentId: string | null, title: string) {
    wx.showModal({
      title,
      editable: true,
      placeholderText: '请输入名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const newCategory: Category = {
            _id: `cat-${Date.now()}`,
            name: res.content,
            sort: 99, // 默认放最后
            isVisible: true,
            parentId: parentId,
            productCount: 0,
            level: parentId ? 1 : 0,
            expanded: true
          };
          this.setData({
            categories: [...this.data.categories, newCategory]
          }, () => this.buildFlatList());
        }
      }
    });
  }
});