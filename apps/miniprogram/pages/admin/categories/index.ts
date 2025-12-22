import { categoryApi, Category } from '../../../utils/apis/category';

interface FlatCategory extends Category {
  indent: number;          // 缩进级别
  hasChildren: boolean;    // 是否有子分类
  canAddChild: boolean;    // 是否可以添加子分类
  isFirstInGroup: boolean; // 是否是同级分组中的第一个
  isLastInGroup: boolean;  // 是否是同级分组中的最后一个
  expanded?: boolean;      // 是否展开子分类
}

Page({
  data: {
    categories: [] as Category[],
    flatList: [] as FlatCategory[], // 扁平化的展示列表
  },

  onLoad() {
    this.loadCategories();
  },

  // 1. 加载分类数据
  async loadCategories() {
    try {
      wx.showLoading({ title: '加载中' });
      const res = await categoryApi.getList();
      if (res.success) {
        this.setData({ categories: res.data }, () => {
          this.buildFlatList();
        });
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 2. 构建扁平化展示列表
  buildFlatList() {
    const { categories } = this.data;
    const flatList: FlatCategory[] = [];

    // 获取并排序一级分类
    const rootCategories = categories
      .filter(item => !item.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    rootCategories.forEach((parent, rootIndex) => {
      const children = categories.filter(item => item.parentId === parent._id);
      const hasChildren = children.length > 0;
      const canAddChild = parent.productCount === 0;

      // 保持之前的展开状态
      const prevItem = this.data.flatList.find(f => f._id === parent._id);
      const isExpanded = prevItem ? prevItem.expanded : true;

      flatList.push({
        ...parent,
        indent: 0,
        hasChildren,
        canAddChild,
        expanded: isExpanded,
        isFirstInGroup: rootIndex === 0,
        isLastInGroup: rootIndex === rootCategories.length - 1
      });

      // 如果展开且有子分类，按 sortOrder 顺序插入
      if (isExpanded && hasChildren) {
        const sortedChildren = children.sort((a, b) => a.sortOrder - b.sortOrder);
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

  // 3. 排序移动逻辑
  async onMoveOrder(e: any) {
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
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const currentIndexInGroup = siblingItems.findIndex(item => item._id === currentItem._id);
    const targetIndexInGroup = direction === 'up' ? currentIndexInGroup - 1 : currentIndexInGroup + 1;

    // 同级边界检查
    if (targetIndexInGroup < 0 || targetIndexInGroup >= siblingItems.length) return;

    const targetItem = siblingItems[targetIndexInGroup];

    wx.vibrateShort({ type: 'medium' });

    try {
      wx.showLoading({ title: '更新中' });
      // 交换 sortOrder 值并更新
      const currentSort = currentItem.sortOrder;
      const targetSort = targetItem.sortOrder;

      await Promise.all([
        categoryApi.update({ id: currentItem._id, sortOrder: targetSort }),
        categoryApi.update({ id: targetItem._id, sortOrder: currentSort })
      ]);

      await this.loadCategories();
      wx.showToast({ title: '顺序已更新', icon: 'success' });
    } catch (error) {
      console.error('更新顺序失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 4. 编辑名称
  onStartEdit(e: any) {
    const { id, name } = e.currentTarget.dataset;

    wx.showModal({
      title: '编辑分类名称',
      editable: true,
      placeholderText: '请输入新名称',
      content: name,
      success: async (res) => {
        if (res.confirm && res.content) {
          const newName = res.content.trim();
          if (!newName) {
            wx.showToast({ title: '名称不能为空', icon: 'none' });
            return;
          }

          try {
            wx.showLoading({ title: '修改中' });
            await categoryApi.update({ id, name: newName });
            await this.loadCategories();
            wx.showToast({ title: '修改成功', icon: 'success' });
          } catch (error) {
            console.error('修改名称失败:', error);
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 5. 状态切换与层级操作
  onToggleExpand(e: any) {
    const { id } = e.currentTarget.dataset;
    const flatList = this.data.flatList.map(item =>
      item._id === id ? { ...item, expanded: !item.expanded } : item
    );
    this.setData({ flatList }, () => this.buildFlatList());
  },

  async onToggleVisible(e: any) {
    const { id, visible } = e.currentTarget.dataset;
    try {
      wx.showLoading({ title: '更新中' });
      await categoryApi.update({ id, isVisible: !visible });
      await this.loadCategories();
      wx.showToast({ title: '状态已更新', icon: 'success' });
    } catch (error) {
      console.error('更新可见性失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 6. 删除分类
  onDelete(e: any) {
    const { id, name, hasChildren, productCount } = e.currentTarget.dataset;

    if (productCount > 0) {
      wx.showModal({
        title: '无法删除',
        content: `"${name}"下有 ${productCount} 件商品，请先移除或转移商品。`,
        showCancel: false
      });
      return;
    }

    if (hasChildren) {
      wx.showModal({
        title: '无法删除',
        content: `"${name}"下有子分类，请先删除子分类。`,
        showCancel: false
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `确定删除"${name}"吗？`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中' });
            await categoryApi.delete(id);
            await this.loadCategories();
            wx.showToast({ title: '删除成功', icon: 'success' });
          } catch (error) {
            console.error('删除失败:', error);
          } finally {
            wx.hideLoading();
          }
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
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            wx.showLoading({ title: '创建中' });
            await categoryApi.create({
              name: res.content,
              parentId: parentId,
              level: parentId ? 1 : 0,
              sortOrder: 99
            });
            await this.loadCategories();
            wx.showToast({ title: '创建成功', icon: 'success' });
          } catch (error) {
            console.error('创建分类失败:', error);
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});
