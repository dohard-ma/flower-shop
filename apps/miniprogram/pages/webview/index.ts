interface IData {
  url: string;
  title: string;
  isLoading: boolean;
}

interface IOptions {
  url?: string;
  title?: string;
}

Page({
  data: {
    url: '',
    title: 'H5页面',
    isLoading: true,
  },

  onLoad(options: IOptions) {
    console.log('webview页面参数:', options);

    if (options.url) {
      // URL解码，防止传递的URL包含特殊字符
      const decodedUrl = decodeURIComponent(options.url);
      this.setData({
        url: decodedUrl
      });
    } else {
      // 如果没有传递URL参数，显示错误提示
      wx.showToast({
        title: 'URL参数缺失',
        icon: 'error',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
      return;
    }

    // 设置页面标题
    let pageTitle = 'H5页面';
    if (options.title) {
      pageTitle = decodeURIComponent(options.title);
      this.setData({
        title: pageTitle
      });
    }

    // 动态设置导航栏标题
    wx.setNavigationBarTitle({
      title: pageTitle
    });

    // 验证URL格式
    if (!this.isValidUrl(this.data.url)) {
      wx.showToast({
        title: 'URL格式错误',
        icon: 'error',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  onShow() {
    console.log('webview页面显示');
  },

  onHide() {
    console.log('webview页面隐藏');
  },

  onUnload() {
    console.log('webview页面卸载');
  },

  // web-view加载完成
  onWebViewLoad() {
    console.log('webview加载完成');
    this.setData({
      isLoading: false
    });
  },

  // web-view加载失败
  onWebViewError(e: any) {
    console.error('webview加载失败:', e.detail);
    this.setData({
      isLoading: false
    });

    wx.showModal({
      title: '加载失败',
      content: '网页加载失败，请检查网络连接或重试',
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          // 重新加载页面
          this.setData({
            isLoading: true
          });
        } else {
          wx.navigateBack();
        }
      }
    });
  },

  // 验证URL格式
  isValidUrl(url: string): boolean {
    // 使用正则表达式验证URL格式，因为小程序环境可能不支持URL构造函数
    const urlPattern = /^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i;
    return urlPattern.test(url);
  },

  // 处理页面消息（web-view向小程序发送消息）
  onWebViewMessage(e: any) {
    console.log('收到webview消息:', e.detail.data);
    // 可以在这里处理来自H5页面的消息
  }
});
