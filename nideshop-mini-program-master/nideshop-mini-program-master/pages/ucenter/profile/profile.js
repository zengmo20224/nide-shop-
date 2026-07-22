var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var app = getApp();

Page({
  data: {
    userInfo: {},
    password: '',
    confirmPassword: '',
    defaultAvatar: 'https://yanxuan.nosdn.127.net/8945ae63d940cc42406c3f67019c5cb6.png'
  },

  onShow: function () {
    this.getUserInfo();
  },

  syncUserInfo: function (userInfo) {
    app.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
    this.setData({
      userInfo: userInfo
    });
  },

  getUserInfo: function () {
    var that = this;
    util.request(api.UserInfo).then(function (res) {
      if (res.errno === 0) {
        that.syncUserInfo(res.data);
      }
    }).catch(function (err) {
      util.showErrorToast(err.errmsg || '资料加载失败');
    });
  },

  bindPasswordInput: function (e) {
    this.setData({ password: e.detail.value });
  },

  bindConfirmPasswordInput: function (e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  changePassword: function () {
    var that = this;
    if (that.data.password.length < 6) {
      util.showErrorToast('密码至少 6 位');
      return;
    }
    if (that.data.password !== that.data.confirmPassword) {
      util.showErrorToast('两次密码不一致');
      return;
    }

    util.request(api.UserPassword, { password: that.data.password }, 'POST').then(function (res) {
      if (res.errno === 0) {
        that.setData({ password: '', confirmPassword: '' });
        wx.showToast({ title: '密码已修改', icon: 'success' });
      } else {
        util.showErrorToast(res.errmsg || '修改失败');
      }
    }).catch(function (err) {
      util.showErrorToast(err.errmsg || '修改失败');
    });
  },

  chooseAvatar: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var filePath = res.tempFilePaths[0];
        wx.uploadFile({
          url: api.UserAvatar,
          filePath: filePath,
          name: 'avatar',
          header: {
            'X-Nideshop-Token': wx.getStorageSync('token')
          },
          success: function (uploadRes) {
            var data = {};
            try {
              data = JSON.parse(uploadRes.data);
            } catch (e) {}
            if (data.errno === 0) {
              that.syncUserInfo(data.data);
              wx.showToast({ title: '头像已更新', icon: 'success' });
            } else {
              util.showErrorToast(data.errmsg || '上传失败');
            }
          },
          fail: function () {
            util.showErrorToast('上传失败');
          }
        });
      }
    });
  }
});
