const app = getApp();

Page({
  data: {
    navbarHeight: app.globalData.navBarHeight, // 从全局拿数据
    searchValue: '',
    currentSwiperIndex: 0,
    swiperList: [
      'https://tdesign.gtimg.com/mobile/demos/swiper1.png',
      'https://tdesign.gtimg.com/mobile/demos/swiper2.png',
      'https://tdesign.gtimg.com/mobile/demos/swiper3.png',
      'https://tdesign.gtimg.com/mobile/demos/swiper4.png',
    ]
  },

  onSearchChange(e: any) {
    this.setData({
      searchValue: e.detail.value,
    });
  },

  onSwiperChange(e: any) {
    this.setData({
      currentSwiperIndex: e.detail.current,
    });
  },
});