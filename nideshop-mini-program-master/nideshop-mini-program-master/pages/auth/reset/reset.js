var user = require('../../../services/user.js');

Page({
  data: {
    mobile: '',
    code: '',
    password: '',
    confirmPassword: '',
    isSubmitting: false
  },

  bindMobileInput: function (e) {
    this.setData({ mobile: e.detail.value });
  },

  bindCodeInput: function (e) {
    this.setData({ code: e.detail.value });
  },

  bindPasswordInput: function (e) {
    this.setData({ password: e.detail.value });
  },

  bindConfirmPasswordInput: function (e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  resetPassword: function () {
    var that = this;
    var mobile = that.data.mobile.trim();
    var code = that.data.code.trim();
    var password = that.data.password;

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      wx.showModal({ title: '错误信息', content: '请输入正确的手机号', showCancel: false });
      return;
    }
    if (code !== '666666') {
      wx.showModal({ title: '错误信息', content: '验证码错误', showCancel: false });
      return;
    }
    if (password.length < 6) {
      wx.showModal({ title: '错误信息', content: '密码长度不能少于 6 位', showCancel: false });
      return;
    }
    if (password !== that.data.confirmPassword) {
      wx.showModal({ title: '错误信息', content: '两次输入的密码不一致', showCancel: false });
      return;
    }

    that.setData({ isSubmitting: true });
    user.resetPassword(mobile, code, password).then(function (res) {
      if (res.errno === 0) {
        wx.showToast({ title: '重置成功', icon: 'success' });
        setTimeout(function () {
          wx.navigateBack();
        }, 800);
      } else {
        wx.showModal({ title: '重置失败', content: res.errmsg || '请检查信息', showCancel: false });
      }
    }).catch(function (err) {
      wx.showModal({ title: '重置失败', content: err.errmsg || '网络异常，请稍后重试', showCancel: false });
    }).then(function () {
      that.setData({ isSubmitting: false });
    });
  },

  clearInput: function (e) {
    switch (e.currentTarget.id) {
      case 'clear-mobile':
        this.setData({ mobile: '' });
        break;
      case 'clear-code':
        this.setData({ code: '' });
        break;
      case 'clear-password':
        this.setData({ password: '' });
        break;
      case 'clear-confirm-password':
        this.setData({ confirmPassword: '' });
        break;
    }
  }
});
