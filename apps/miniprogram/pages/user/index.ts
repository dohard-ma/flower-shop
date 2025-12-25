import { ORDER_STATUS, SERVICE_LIST, ADMIN_LIST } from '../../common/constants'
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { getUserInfo } from '../../utils/apis/user';

Page({
  data: {
    isLoggedIn: false,
    isAdmin: false,
    userInfo: null as any,
    levelInfo: null as any,
    orderStatus: ORDER_STATUS,
    serviceList: SERVICE_LIST,
    adminList: ADMIN_LIST,
  },

  onLoad() {
    this.initData()
  },

  onShow() {
    // 每次进入页面都检查一下登录状态
    this.checkLoginStatus()
  },

  async initData() {
    await this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.fetchUserInfo()
    }
  },

  async checkLoginStatus() {
    const token = storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const userInfo = storage.getItem(STORAGE_KEYS.USER_INFO);

    this.setData({
      isLoggedIn: !!token,
      userInfo: userInfo || null,
      isAdmin: userInfo?.role === 'ADMIN' || false // 假设 userInfo 中有 isAdmin 字段
    });
  },

  async fetchUserInfo() {
    try {
      const res = await getUserInfo();
      if (res.success) {
        this.setData({
          userInfo: res.data,
          isLoggedIn: true,
          isAdmin: res.data?.role === 'ADMIN' || false
        });
        storage.setItem(STORAGE_KEYS.USER_INFO, res.data);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  // 统一拦截跳转
  ensureLogin(callback: Function) {
    if (!this.data.isLoggedIn) {
      const profileCard = this.selectComponent('#profileCard');
      if (profileCard) {
        profileCard.showLogin();
      }
      return;
    }
    callback();
  },

  // 登录成功回调
  onLoginSuccess(e: any) {
    const userInfo = e.detail;
    this.setData({
      isLoggedIn: true,
      userInfo: userInfo,
      isAdmin: userInfo.role === 'ADMIN' || false
    });
    storage.setItem(STORAGE_KEYS.USER_INFO, userInfo);
  },

  // 全部订单
  onAllOrders() {
    this.ensureLogin(() => {
      wx.showToast({
        title: '全部订单',
        icon: 'none'
      })
    });
  },

  // 订单状态
  onOrderStatus(e: any) {
    this.ensureLogin(() => {
      const type = e.currentTarget.dataset.type
      wx.showToast({
        title: `订单类型: ${type}`,
        icon: 'none'
      })
    });
  },

  // 服务功能
  onService(e: any) {
    this.ensureLogin(() => {
      const type = e.currentTarget.dataset.type
      wx.showToast({
        title: `服务: ${type}`,
        icon: 'none'
      })
    });
  },

  // 联系客服
  onContactService() {
    // 联系客服通常不需要登录，但如果业务要求也可以拦截
    wx.showToast({
      title: '联系专属花艺师',
      icon: 'none'
    })
  },

  // 后台管理
  onAdmin(e: any) {
    this.ensureLogin(() => {
      const type = e.currentTarget.dataset.type
      if (type) {
        wx.navigateTo({
          url: `/pages/admin/${type}/index`
        })
      }
    });
  },
})
