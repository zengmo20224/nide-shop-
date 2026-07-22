var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    balance: '0.00',
    amount: '',
    quickAmounts: [50, 100, 200, 500, 1000, 2000]
  },

  onShow: function () {
    this.getBalance();
  },

  getBalance: function () {
    var that = this;
    util.request(api.UserBalance).then(function (res) {
      if (res.errno === 0) {
        that.setData({
          balance: Number(res.data.balance || 0).toFixed(2)
        });
      }
    }).catch(function (err) {
      util.showErrorToast(err.errmsg || '余额加载失败');
    });
  },

  bindAmountInput: function (e) {
    this.setData({
      amount: e.detail.value
    });
  },

  selectQuickAmount: function (e) {
    this.setData({
      amount: String(e.currentTarget.dataset.amount)
    });
  },

  submitRecharge: function () {
    var that = this;
    var amount = Number(that.data.amount);
    if (!amount || amount <= 0) {
      util.showErrorToast('请输入金额');
      return;
    }

    util.request(api.UserRecharge, { amount: amount }, 'POST').then(function (res) {
      if (res.errno === 0) {
        that.setData({
          amount: '',
          balance: Number(res.data.balance || 0).toFixed(2)
        });
        wx.showToast({
          title: '充值成功',
          icon: 'success'
        });
      } else {
        util.showErrorToast(res.errmsg || '充值失败');
      }
    }).catch(function (err) {
      util.showErrorToast(err.errmsg || '充值失败');
    });
  }
});
