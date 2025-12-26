import { request } from '../../utils/apis/index';
import { storage, STORAGE_KEYS } from '../../utils/storage';

Page({
  data: {
  },

  onLoad(options: any) {
    if (options.scene) {
      const scene = decodeURIComponent(options.scene);
      // ticketId is in the scene
      this.handleLoginConfirm(scene);
    }
  },

  onShow() {
  },

  // 处理后台扫码登录确认
  async handleLoginConfirm(ticketId: string) {
    wx.showModal({
      title: '确认登录',
      content: '是否确认登录管理后台？',
      confirmText: '确认登录',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '正在确认', mask: true });

            const openid = storage.getItem(STORAGE_KEYS.OPENID);
            const storeId = storage.getItem(STORAGE_KEYS.STORE_ID);

            if (!openid || !storeId) {
              throw new Error('未获取到用户信息，请稍后重试');
            }

            const result = await request<any>({
              url: '/wx/admin/login-confirm',
              method: 'POST',
              data: { ticketId, openid, storeId }
            });

            wx.hideLoading();

            if (result.success) {
              wx.showToast({
                title: '登录成功',
                icon: 'success',
                duration: 2000
              });
            }
          } catch (err: any) {
            wx.hideLoading();
            wx.showModal({
              title: '提示',
              content: err.message || '确认失败，请重试',
              showCancel: false
            });
          }
        } else {
          // 用户取消，可以返回上一页或回到首页
          wx.reLaunch({
            url: '/pages/home/index'
          });
        }
      }
    });
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