import { getUserInfo, UserInfo } from '@/utils/apis/user';
import { storage, STORAGE_KEYS } from '@/utils/storage';

Page({
  data: {
    userInfo: {} as UserInfo,
    userAssets: {
      balance: '0.00',
      fanCoin: '0.00',
      coupons: 0,
      points: 0
    },
    membership: {
      type: 'normal', // normal, vip, svip
      typeName: 'FANYANG 普通会员'
    }
  },

  onShow() {
    this.loadUserInfo();
  },

  // 加载用户信息
  async loadUserInfo() {
    // 获取微信用户信息
    const cache = storage.getItem(STORAGE_KEYS.USER_INFO);
    if (cache) {
      this.setData({
        userInfo: cache
      });
    }
    const res = await getUserInfo();
    if (res.success) {
      storage.setItem(STORAGE_KEYS.USER_INFO, res.data);
      this.setData({
        userInfo: res.data
      });
    }

    console.log('res.data', res.data);
    // 如果没有用户的头像和昵称，则触发弹窗，提示用户完善资料（头像、昵称、手机号、生日）
    if (!res.data.phone || !res.data.nickname || !res.data.avatar) {
      wx.showModal({
        title: '完善资料',
        content: '请完善资料，以便我们更好地为您服务',
        confirmText: '去完善',
        showCancel: false,
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user/profile/index'
            });
          }
        }
      });
    }
  },

  // 会员服务点击事件
  onServiceTap(event: WechatMiniprogram.BaseEvent) {
    const { type } = event.currentTarget.dataset;

    switch (type) {
      case 'customer-service':
        this.openCustomerService();
        break;
      case 'personal-advisor':
        this.openPersonalAdvisor();
        break;
      case 'birthday':
        this.openBirthdaySettings();
        break;
      case 'courses':
        this.openCourses();
        break;
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
    }
  },

  // 常用功能点击事件
  onFunctionTap(event: WechatMiniprogram.BaseEvent) {
    const { type } = event.currentTarget.dataset;

    switch (type) {
      case 'follow-wechat':
        this.followWechat();
        break;
      case 'diy-cover':
        this.openDiyCover();
        break;
      case 'complete-profile':
        this.openProfileEdit();
        break;
      case 'share-resources':
        this.openShareResources();
        break;
      case 'address':
        this.openAddressManage();
        break;
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
    }
  },

  // 打开客服
  openCustomerService() {
    // 直接调转到微信小程序自带的客服
    wx.showToast({
      title: '客服功能开发中',
      icon: 'none'
    });
  },

  // 打开专属顾问
  openPersonalAdvisor() {
    wx.showToast({
      title: '专属顾问功能开发中',
      icon: 'none'
    });
  },

  // 打开生日设置
  openBirthdaySettings() {
    wx.navigateTo({
      url: '/pages/user/birthday/index'
    });
  },

  // 打开课程
  openCourses() {
    wx.navigateTo({
      url: '/pages/courses/index'
    });
  },

  // 关注公众号
  followWechat() {
    wx.showModal({
      title: '关注公众号',
      content: '请在微信中搜索"FANYANG"关注我们的公众号，获取最新产品资讯',
      confirmText: '知道了',
      showCancel: false
    });
  },

  // 打开DIY封面
  openDiyCover() {
    wx.navigateTo({
      url: '/pages/order/gift-card/index'
    });
  },

  // 打开资料编辑
  openProfileEdit() {
    wx.navigateTo({
      url: '/pages/user/profile/index'
    });
  },

  // 打开分享资源
  openShareResources() {
    wx.navigateTo({
      url: '/pages/user/share/index'
    });
  },

  // 点击会员卡片
  onMembershipTap() {
    wx.navigateTo({
      url: '/pages/membership/index'
    });
  },

  // 点击资产项
  onAssetTap(event: WechatMiniprogram.BaseEvent) {
    const { type } = event.currentTarget.dataset;

    switch (type) {
      case 'balance':
        wx.navigateTo({
          url: '/pages/wallet/index'
        });
        break;
      case 'coupons':
        wx.navigateTo({
          url: '/pages/coupons/index'
        });
        break;
      case 'points':
        wx.navigateTo({
          url: '/pages/points/index'
        });
        break;
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
    }
  },

  openAddressManage() {
    wx.navigateTo({
      url: '/pages/user/address/index'
    });
  }
})