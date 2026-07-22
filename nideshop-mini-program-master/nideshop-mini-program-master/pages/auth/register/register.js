var user = require('../../../services/user.js');
var app = getApp();

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    isSubmitting: false
  },

  startRegister: function () {
    var that = this;
    var username = that.data.username.trim();
    var password = that.data.password;
    var confirmPassword = that.data.confirmPassword;
    var mobile = that.data.mobile.trim();

    if (username.length < 3 || username.length > 20) {
      wx.showModal({
        title: '错误信息',
        content: '账号长度需在 3-20 个字符之间',
        showCancel: false
      });
      return false;
    }

    if (password.length < 6) {
      wx.showModal({
        title: '错误信息',
        content: '密码长度不能少于 6 位',
        showCancel: false
      });
      return false;
    }

    if (password !== confirmPassword) {
      wx.showModal({
        title: '错误信息',
        content: '两次输入的密码不一致',
        showCancel: false
      });
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      wx.showModal({
        title: '错误信息',
        content: '请输入正确的手机号',
        showCancel: false
      });
      return false;
    }

    that.setData({ isSubmitting: true });
    user.registerByAccount(username, password, mobile).then(function (res) {
      if (res.errno === 0) {
        app.globalData.userInfo = res.data.userInfo;
        app.globalData.token = res.data.token;
        wx.switchTab({
          url: '/pages/ucenter/index/index'
        });
      } else {
        wx.showModal({
          title: '注册失败',
          content: res.errmsg || '请检查注册信息',
          showCancel: false
        });
      }
    }).catch(function (err) {
      wx.showModal({
        title: '注册失败',
        content: err.errmsg || '网络异常，请稍后重试',
        showCancel: false
      });
    }).then(function () {
      that.setData({ isSubmitting: false });
    });
  },

  bindUsernameInput: function (e) {
    this.setData({ username: e.detail.value });
  },

  bindPasswordInput: function (e) {
    this.setData({ password: e.detail.value });
  },

  bindConfirmPasswordInput: function (e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  bindMobileInput: function (e) {
    this.setData({ mobile: e.detail.value });
  },

  clearInput: function (e) {
    switch (e.currentTarget.id) {
      case 'clear-username':
        this.setData({ username: '' });
        break;
      case 'clear-password':
        this.setData({ password: '' });
        break;
      case 'clear-confirm-password':
        this.setData({ confirmPassword: '' });
        break;
      case 'clear-mobile':
        this.setData({ mobile: '' });
        break;
    }
  }
})
