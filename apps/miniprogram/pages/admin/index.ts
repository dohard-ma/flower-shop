import { request } from '../../utils/apis/index';
import { storage, STORAGE_KEYS } from '../../utils/storage';

Page({
  data: {
  },

  onLoad(options: any) {
  },

  onShow() {
  },

  // 商品管理
  onProductManagement() {
    wx.navigateTo({
      url: '/pages/admin/products/index'
    })
  },

  // 新增商品
  onAddProduct() {
    wx.navigateTo({
      url: '/pages/admin/upload/index'
    })
  }
})