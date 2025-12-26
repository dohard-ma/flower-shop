import { confirmAdminLogin } from '../../../utils/apis/user';
import { storage, STORAGE_KEYS } from '../../../utils/storage';

Page({
  data: {
    loading: false,
    ticketId: '',
    userInfo: null as any
  },

  onLoad(options: any) {
    // 1. 获取 ticketId (scene)
    let ticketId = '';
    if (options.scene) {
      ticketId = decodeURIComponent(options.scene);
    } else if (options.ticketId) {
      ticketId = options.ticketId;
    }

    if (!ticketId) {
      wx.showModal({
        title: '无效请求',
        content: '未找到有效的登录票据',
        showCancel: false,
        success: () => wx.reLaunch({ url: '/pages/home/index' })
      });
      return;
    }

    this.setData({ ticketId });

    // 2. 检查登录状态
    const userInfo = storage.getItem(STORAGE_KEYS.USER_INFO);
    const token = storage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (!token || !userInfo) {
      wx.showModal({
        title: '请先登录',
        content: '您需要先登录小程序才能授权管理后台登录',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/user/index' });
        }
      });
      return;
    }

    // 3. 检查权限
    if (userInfo.role !== 'ADMIN') {
      wx.showModal({
        title: '权限不足',
        content: '该账号不是管理员，无法登录后台',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/user/index' });
        }
      });
      return;
    }

    this.setData({ userInfo });
  },

  // 确认授权
  async onConfirm() {
    const { ticketId } = this.data;
    const userInfo = storage.getItem(STORAGE_KEYS.USER_INFO);
    const { openid, storeId } = userInfo;

    if (!openid || !storeId) {
      wx.showToast({ title: '登录信息失效，请重新登录', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const result = await confirmAdminLogin({
        ticketId,
        openid,
        storeId
      });

      if (result.success) {
        wx.showToast({
          title: '授权成功',
          icon: 'success',
          duration: 2000
        });

        // 成功后延迟返回
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/home/index' });
        }, 1500);
      } else {
        throw new Error(result.message || '授权失败');
      }
    } catch (err: any) {
      wx.showModal({
        title: '授权失败',
        content: err.message || '请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 取消授权
  onCancel() {
    wx.reLaunch({ url: '/pages/home/index' });
  }
});
