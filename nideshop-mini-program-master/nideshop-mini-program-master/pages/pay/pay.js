var app = getApp();
var util = require('../../utils/util.js');
var api = require('../../config/api.js');

Page({
  data: {
    orderId: 0,
    actualPrice: 0.00,
    balance: 0.00,
    payType: 'balance'
  },
  onLoad: function (options) {
    // 页面初始化 options为页面跳转所带来的参数
    this.setData({
      orderId: options.orderId,
      actualPrice: options.actualPrice
    })
  },
  onReady: function () {

  },
  onShow: function () {
    this.getBalance();
  },
  onHide: function () {
    // 页面隐藏

  },
  onUnload: function () {
    // 页面关闭

  },
  //向服务请求支付参数
  getBalance() {
    var that = this;
    util.request(api.UserBalance).then(function (res) {
      if (res.errno === 0) {
        that.setData({
          balance: Number(res.data.balance || 0).toFixed(2)
        });
      }
    });
  },
  selectPayType(e) {
    this.setData({
      payType: e.currentTarget.dataset.type
    });
  },
  requestPayParam() {
    let that = this;
    util.request(api.PayPrepayId, { orderId: that.data.orderId, payType: 1 }).then(function (res) {
      if (res.errno === 0) {
        let payParam = res.data;
        wx.requestPayment({
          'timeStamp': payParam.timeStamp,
          'nonceStr': payParam.nonceStr,
          'package': payParam.package,
          'signType': payParam.signType,
          'paySign': payParam.paySign,
          'success': function (res) {
            wx.redirectTo({
              url: '/pages/payResult/payResult?status=true',
            })
          },
          'fail': function (res) {
            wx.redirectTo({
              url: '/pages/payResult/payResult?status=0&orderId=' + that.data.orderId,
            })
          }
        })
      }
    });
  },
  payByBalance() {
    var that = this;
    util.request(api.PayBalance, { orderId: that.data.orderId }, 'POST').then(function (res) {
      if (res.errno === 0) {
        wx.redirectTo({
          url: '/pages/payResult/payResult?status=1&orderId=' + that.data.orderId,
        });
      } else {
        util.showErrorToast(res.errmsg || '余额支付失败');
      }
    }).catch(function (err) {
      util.showErrorToast(err.errmsg || '余额支付失败');
    });
  },
  startPay() {
    if (this.data.payType === 'balance') {
      this.payByBalance();
    } else {
      this.requestPayParam();
    }
  }
})
