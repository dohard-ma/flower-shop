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
}

Page({
  data: {
    categories: [] as Category[],
    flatList: [] as FlatCategory[], // 扁平化的展示列表
    dialogVisible: false,
    dialogTitle: '',
    dialogInputValue: '',
    currentCategory: null as Category | null,
    editingId: '', // 正在编辑的分类ID
    dragStartIndex: -1, // 拖拽开始位置
    dragOverIndex: -1,  // 拖拽悬停位置
  },

  onLoad() {
    this.loadCategories();
  },

  // 加载分类数据 (模拟层级数据)
  loadCategories() {
    const mockCategories: Category[] = [
      { _id: '1', name: '玫瑰花束', sort: 1, isVisible: true, parentId: null, productCount: 15, level: 0 },
      { _id: '1-1', name: '红玫瑰', sort: 1, isVisible: true, parentId: '1', productCount: 8, level: 1 },
      { _id: '1-2', name: '粉玫瑰', sort: 2, isVisible: true, parentId: '1', productCount: 7, level: 1 },

      { _id: '2', name: '康乃馨', sort: 2, isVisible: true, parentId: null, productCount: 0, level: 0, expanded: true },
      { _id: '2-1', name: '红康乃馨', sort: 1, isVisible: true, parentId: '2', productCount: 0, level: 1 },
      { _id: '2-2', name: '粉康乃馨', sort: 2, isVisible: false, parentId: '2', productCount: 0, level: 1 },

      { _id: '3', name: '百合花', sort: 3, isVisible: true, parentId: null, productCount: 10, level: 0 },
      { _id: '4', name: '向日葵', sort: 4, isVisible: false, parentId: null, productCount: 5, level: 0 },
      { _id: '5', name: '郁金香', sort: 5, isVisible: true, parentId: null, productCount: 0, level: 0 },
    ];

    this.setData({ categories: mockCategories }, () => {
      this.buildFlatList();
    });
  },

  // 构建扁平化展示列表 (处理展开/收起逻辑)
  buildFlatList() {
    const { categories } = this.data;
    const flatList: FlatCategory[] = [];

    // 获取一级分类
    const rootCategories = categories
      .filter(item => !item.parentId)
      .sort((a, b) => a.sort - b.sort);

    rootCategories.forEach(parent => {
      const children = categories.filter(item => item.parentId === parent._id);
      const hasChildren = children.length > 0;
      const canAddChild = parent.productCount === 0; // 无商品才能添加子分类

      flatList.push({
        ...parent,
        indent: 0,
        hasChildren,
        canAddChild,
        expanded: parent.expanded !== false // 默认展开
      });

      // 如果展开且有子分类,添加子分类
      if (parent.expanded !== false && hasChildren) {
        children.sort((a, b) => a.sort - b.sort).forEach(child => {
          flatList.push({
            ...child,
            indent: 1,
            hasChildren: false,
            canAddChild: false // 二级分类不能再添加子分类
          });
        });
      }
    });

    this.setData({ flatList });
  },

  // 切换展开/收起
  onToggleExpand(e: any) {
    const { id } = e.currentTarget.dataset;
    const categories = this.data.categories.map(item => {
      if (item._id === id) {
        return { ...item, expanded: !item.expanded };
      }
      return item;
    });

    this.setData({ categories }, () => {
      this.buildFlatList();
    });
  },

  // 切换显示状态
  onToggleVisible(e: any) {
    const { id } = e.currentTarget.dataset;
    const categories = this.data.categories.map(item => {
      if (item._id === id) {
        return { ...item, isVisible: !item.isVisible };
      }
      return item;
    });

    this.setData({ categories }, () => {
      this.buildFlatList();
    });

    wx.showToast({
      title: '状态已更新',
      icon: 'success',
      duration: 1500
    });
  },

  // 开始编辑分类名称 (内联编辑)
  onStartEdit(e: any) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      editingId: id,
      dialogInputValue: name
    });
  },

  // 输入框变化
  onInputChange(e: any) {
    this.setData({
      dialogInputValue: e.detail.value
    });
  },

  // 保存编辑
  onSaveEdit(e: any) {
    const { id } = e.currentTarget.dataset;
    const newName = this.data.dialogInputValue.trim();

    if (!newName) {
      wx.showToast({
        title: '分类名称不能为空',
        icon: 'none'
      });
      return;
    }

    const categories = this.data.categories.map(item => {
      if (item._id === id) {
        return { ...item, name: newName };
      }
      return item;
    });

    this.setData({
      categories,
      editingId: ''
    }, () => {
      this.buildFlatList();
    });

    wx.showToast({
      title: '修改成功',
      icon: 'success'
    });
  },

  // 取消编辑
  onCancelEdit() {
    this.setData({
      editingId: '',
      dialogInputValue: ''
    });
  },

  // 删除分类
  onDelete(e: any) {
    const { id, name, hasChildren, productCount } = e.currentTarget.dataset;

    let content = `确定要删除"${name}"分类吗?`;
    if (hasChildren) {
      content = `"${name}"下有子分类，删除后子分类也会被删除，确定继续吗?`;
    } else if (productCount > 0) {
      content = `"${name}"下有${productCount}个商品，删除后这些商品将变为未分类状态，确定继续吗?`;
    }

    wx.showModal({
      title: '确认删除',
      content,
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 删除该分类及其所有子分类
          const categories = this.data.categories.filter(item =>
            item._id !== id && item.parentId !== id
          );

          this.setData({ categories }, () => {
            this.buildFlatList();
          });

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 添加子分类
  onAddChild(e: any) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '新增子分类',
      content: `为"${name}"添加子分类`,
      editable: true,
      placeholderText: '请输入子分类名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const newId = `${id}-${Date.now()}`;
          const parentCategory = this.data.categories.find(item => item._id === id);
          const newCategory: Category = {
            _id: newId,
            name: res.content,
            sort: this.data.categories.filter(item => item.parentId === id).length + 1,
            isVisible: true,
            parentId: id,
            productCount: 0,
            level: 1
          };

          const categories = [...this.data.categories, newCategory];

          // 确保父分类展开
          const updatedCategories = categories.map(item => {
            if (item._id === id) {
              return { ...item, expanded: true };
            }
            return item;
          });

          this.setData({ categories: updatedCategories }, () => {
            this.buildFlatList();
          });

          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 新增一级分类
  onAdd() {
    wx.showModal({
      title: '新增分类',
      editable: true,
      placeholderText: '请输入分类名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const rootCategories = this.data.categories.filter(item => !item.parentId);
          const newCategory: Category = {
            _id: `cat-${Date.now()}`,
            name: res.content,
            sort: rootCategories.length + 1,
            isVisible: true,
            parentId: null,
            productCount: 0,
            level: 0
          };

          const categories = [...this.data.categories, newCategory];
          this.setData({ categories }, () => {
            this.buildFlatList();
          });

          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 拖拽开始
  onDragStart(e: any) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      dragStartIndex: index
    });
  },

  // 拖拽移动中
  onDragOver(e: any) {
    const { index } = e.currentTarget.dataset;
    if (this.data.dragOverIndex !== index) {
      this.setData({
        dragOverIndex: index
      });
    }
  },

  // 拖拽结束
  onDrop(e: any) {
    const { index: dropIndex } = e.currentTarget.dataset;
    const { dragStartIndex, flatList } = this.data;

    if (dragStartIndex === -1 || dragStartIndex === dropIndex) {
      this.setData({
        dragStartIndex: -1,
        dragOverIndex: -1
      });
      return;
    }

    const dragItem = flatList[dragStartIndex];
    const dropItem = flatList[dropIndex];

    // 不允许一级分类拖到二级分类位置
    if (dragItem.indent === 0 && dropItem.indent === 1) {
      wx.showToast({
        title: '不能将一级分类移到二级分类下',
        icon: 'none'
      });
      this.setData({
        dragStartIndex: -1,
        dragOverIndex: -1
      });
      return;
    }

    // 重新排序
    const newFlatList = [...flatList];
    const [removed] = newFlatList.splice(dragStartIndex, 1);
    newFlatList.splice(dropIndex, 0, removed);

    // 更新 sort 和 parentId
    const updatedCategories = this.data.categories.map(cat => ({ ...cat }));

    newFlatList.forEach((item, idx) => {
      const category = updatedCategories.find(c => c._id === item._id);
      if (category) {
        category.sort = idx + 1;

        // 根据拖拽位置更新层级和父ID
        if (dropIndex > 0 && newFlatList[dropIndex - 1].indent === 0 && item.indent === 1) {
          category.parentId = newFlatList[dropIndex - 1]._id;
        }
      }
    });

    this.setData({
      categories: updatedCategories,
      dragStartIndex: -1,
      dragOverIndex: -1
    }, () => {
      this.buildFlatList();
    });

    wx.showToast({
      title: '排序已更新',
      icon: 'success'
    });
  },

  // 拖拽取消
  onDragEnd() {
    this.setData({
      dragStartIndex: -1,
      dragOverIndex: -1
    });
  }
})