import updateManager from './common/updateManager';

App({
  globalData: {
    navBarHeight: 0,    // 导航栏高度（含状态栏）
  },

  setNavBarInfo() {
    const systemInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

    // 计算导航栏高度，保证胶囊上下居中且不被遮挡
    this.globalData.navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height + systemInfo.statusBarHeight;
    console.log('navBarHeight', this.globalData.navBarHeight);
  },

  onLaunch() {
    this.setNavBarInfo();
  },

  onShow: function () {
    updateManager();
  },
});
