const app = getApp();

Page({
  data: {
    navbarHeight: app.globalData.navBarHeight, // 从全局拿数据
    searchValue: '',
    currentSwiperIndex: 0,
    swiperList: [
      'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg',
      'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg',
      'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg',
      'https://static.laohuoji.link/huajianli/products/images/b5ba45d8-5c2f-4bfa-975c-3f289242af02.jpg',
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