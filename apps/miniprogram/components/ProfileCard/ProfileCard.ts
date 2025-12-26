import { storage, STORAGE_KEYS } from '@/utils/storage';
import { loginAndRegister } from '../../utils/apis/user';

Component({
  properties: {
    isLoggedIn: {
      type: Boolean,
      value: false
    },
    userInfo: {
      type: Object,
      value: {
        avatar: '',
        badge: '',
        nickname: '',
        level: '',
        userId: '',
        displayId: ''
      }
    },
    levelInfo: {
      type: Object,
      value: {
        title: '',
        current: 0,
        total: 0,
        percent: 0
      }
    }
  },

  data: {
    showLoginPopup: false,
    defaultAvatar: 'https://tdesign.gtimg.com/mobile/demos/avatar1.png',
    tempAvatar: '',
    tempNickname: '',
    tempPhone: '',
    tempPhoneCode: '',
    isAgreed: false,
    isSubmitting: false
  },

  methods: {
    toggleAgreement() {
      this.setData({ isAgreed: !this.data.isAgreed });
      if (this.data.isAgreed) {
        // wx.vibrateShort({ type: 'light' });
      }
    },
    showLogin() {
      this.setData({ showLoginPopup: true });
    },

    onPopupVisibleChange(e: any) {
      this.setData({
        showLoginPopup: e.detail.visible,
      });
    },

    closeLoginPopup() {
      this.setData({ showLoginPopup: false });
    },

    onEdit() {
      this.triggerEvent('edit')
    },

    // 处理头像选择
    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail;
      console.log('选择头像结果:', avatarUrl);
      this.setData({ tempAvatar: avatarUrl });
    },

    // 处理昵称输入
    onNicknameChange(e: any) {
      this.setData({ tempNickname: e.detail.value });
    },

    // 处理获取手机号
    async onGetPhoneNumber(e: any) {
      if (e.detail.errMsg === 'getPhoneNumber:ok') {
        const { code } = e.detail;
        this.setData({
          tempPhoneCode: code,
          tempPhone: '已获取微信手机号' // 占位显示，实际登录时用 code
        });
      } else {
        wx.showToast({ title: '获取手机号失败', icon: 'none' });
      }
    },

    // 提交登录
    async onLoginSubmit() {
      const { tempAvatar, tempNickname, tempPhoneCode, isAgreed } = this.data;

      if (!isAgreed) {
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: '请阅读并同意协议', icon: 'none' });
        return;
      }

      if (!tempAvatar || !tempNickname || !tempPhoneCode) {
        wx.showToast({ title: '请完善资料', icon: 'none' });
        return;
      }

      this.setData({ isSubmitting: true });
      wx.showLoading({ title: '登录中...' });

      try {
        // 1. 获取登录 code
        const { code } = await wx.login();

        // 2. 调用统一登录注册接口
        const loginRes = await loginAndRegister({
          code,
          phoneCode: tempPhoneCode,
          nickname: tempNickname,
          avatarPath: tempAvatar,
        });
console.log('------------', loginRes)
        if (loginRes.success) {
          wx.showToast({ title: '登录成功', icon: 'success' });
          wx.vibrateShort({ type: 'medium' });

          // 保存 token 和用户信息
          storage.setItem(STORAGE_KEYS.AUTH_TOKEN, loginRes.data.token);
          storage.setItem(STORAGE_KEYS.USER_INFO, loginRes.data);

          this.setData({
            showLoginPopup: false,
            tempAvatar: '',
            tempNickname: '',
            tempPhone: '',
            tempPhoneCode: '',
            isAgreed: false
          });
          this.triggerEvent('login-success', loginRes.data);
        }
      } catch (error) {
        console.error('登录失败:', error);
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      } finally {
        this.setData({ isSubmitting: false });
        wx.hideLoading();
      }
    }
  }
})
