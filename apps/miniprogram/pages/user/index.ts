import { ORDER_STATUS, SERVICE_LIST, ADMIN_LIST } from '../../common/constants'

Page({
  data: {
    isAdmin: false, // TODO: 根据实际权限控制
    userInfo: {
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie',
      badge: '🌿',
      nickname: '送花小马',
      level: 'L2',
      userId: '8859 2034'
    },
    levelInfo: {
      title: 'L2 高级花友',
      current: 1280,
      total: 2000,
      percent: 65
    },
    orderStatus: ORDER_STATUS,
    serviceList: SERVICE_LIST,
    adminList: ADMIN_LIST,
  },

  onLoad() {
    // TODO: 获取用户信息、等级、资产等数据
    this.checkAdminAuth()
  },

  // 检查管理员权限
  checkAdminAuth() {
    // TODO: 实际的权限检查逻辑
    // 这里先简单设置为 true 便于测试
    this.setData({
      isAdmin: true
    })
  },

  // 编辑资料
  onEdit() {
    wx.showToast({
      title: '编辑资料',
      icon: 'none'
    })
  },

  // 积分
  onPoints() {
    wx.showToast({
      title: '积分余额',
      icon: 'none'
    })
  },

  // 礼品卡
  onGiftCard() {
    wx.showToast({
      title: '礼品卡',
      icon: 'none'
    })
  },

  // 全部订单
  onAllOrders() {
    wx.showToast({
      title: '全部订单',
      icon: 'none'
    })
  },

  // 订单状态
  onOrderStatus(e: any) {
    const type = e.currentTarget.dataset.type
    wx.showToast({
      title: `订单类型: ${type}`,
      icon: 'none'
    })
  },

  // 服务功能
  onService(e: any) {
    const type = e.currentTarget.dataset.type
    wx.showToast({
      title: `服务: ${type}`,
      icon: 'none'
    })
  },

  // 联系客服
  onContactService() {
    wx.showToast({
      title: '联系专属花艺师',
      icon: 'none'
    })
  },

  // 商品管理
  onProductManagement() {
    wx.navigateTo({
      url: '/pages/admin/index'
    })
  },

  // 后台管理
  onAdmin(e: any) {
    const type = e.currentTarget.dataset.type
    wx.showToast({
      title: `管理: ${type}`,
      icon: 'none'
    })

    if (type) {
      wx.navigateTo({
        url: `/pages/admin/${type}/index`
      })
    }

  },
})