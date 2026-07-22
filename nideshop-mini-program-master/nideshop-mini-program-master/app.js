const DEFAULT_USER_INFO = {
  nickname: '点击登录',
  avatar: 'https://yanxuan.nosdn.127.net/8945ae63d940cc42406c3f67019c5cb6.png'
};

App({
  onLaunch: function () {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
      }
      this.globalData.token = wx.getStorageSync('token');
    } catch (e) {
      console.log(e);
    }
  },

  globalData: {
    defaultUserInfo: DEFAULT_USER_INFO,
    userInfo: Object.assign({}, DEFAULT_USER_INFO),
    token: '',
  }
})
