var user = require('../../../services/user.js');
var app = getApp();

Page({
  data: {
    username: '',
    password: '',
    isSubmitting: false
  },

  startLogin: function () {
    var that = this;
    var username = that.data.username.trim();
    var password = that.data.password;

    if (!username || !password) {
      wx.showModal({
        title: '错误信息',
        content: '请输入账号和密码',
        showCancel: false
      });
      return false;
    }

    that.setData({ isSubmitting: true });
    user.loginByAccount(username, password).then(function (res) {
      if (res.errno === 0) {
        app.globalData.userInfo = res.data.userInfo;
        app.globalData.token = res.data.token;
        wx.switchTab({
          url: '/pages/ucenter/index/index'
        });
      } else {
        wx.showModal({
          title: '登录失败',
          content: res.errmsg || '账号或密码错误',
          showCancel: false
        });
      }
    }).catch(function (err) {
      wx.showModal({
        title: '登录失败',
        content: err.errmsg || '网络异常，请稍后重试',
        showCancel: false
      });
    }).then(function () {
      that.setData({ isSubmitting: false });
    });
  },

  bindUsernameInput: function (e) {
    this.setData({
      username: e.detail.value
    });
  },

  bindPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    });
  },

  clearInput: function (e) {
    switch (e.currentTarget.id) {
      case 'clear-username':
        this.setData({ username: '' });
        break;
      case 'clear-password':
        this.setData({ password: '' });
        break;
    }
  }
})
