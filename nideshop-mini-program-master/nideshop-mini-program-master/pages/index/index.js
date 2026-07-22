const util = require('../../utils/util.js');
const api = require('../../config/api.js');
const user = require('../../services/user.js');

//获取应用实例
const app = getApp()
const channelIconMap = {
  1: '/static/images/channel_home.png',
  2: '/static/images/channel_kitchen.png',
  3: '/static/images/channel_accessory.png',
  4: '/static/images/channel_clothing.png',
  5: '/static/images/channel_hobby.png'
};
const channelCategoryMap = {
  1: 1005000,
  2: 1005001,
  3: 1008000,
  4: 1010000,
  5: 1019000
};

function normalizeChannel(channel) {
  return (channel || []).map(function (item) {
    const categoryId = channelCategoryMap[item.id];
    return Object.assign({}, item, {
      icon_url: channelIconMap[item.id] || item.icon_url,
      url: categoryId ? '/pages/category/category?id=' + categoryId : item.url
    });
  });
}

Page({
  data: {
    goodsCount: 0,
    newGoods: [],
    hotGoods: [],
    topics: [],
    brands: [],
    floorGoods: [],
    banner: [],
    channel: []
  },
  onShareAppMessage: function () {
    return {
      title: 'NideShop',
      desc: '仿网易严选微信小程序商城',
      path: '/pages/index/index'
    }
  },

  getIndexData: function () {
    let that = this;
    util.request(api.IndexUrl).then(function (res) {
      if (res.errno === 0) {
        that.setData({
          newGoods: res.data.newGoodsList,
          hotGoods: res.data.hotGoodsList,
          topics: res.data.topicList,
          brand: res.data.brandList,
          floorGoods: res.data.categoryList,
          banner: res.data.banner,
          channel: normalizeChannel(res.data.channel)
        });
      }
    });
  },
  onLoad: function (options) {
    this.getIndexData();
    util.request(api.GoodsCount).then(res => {
      this.setData({
        goodsCount: res.data.goodsCount
      });
    });
  },
  onReady: function () {
    // 页面渲染完成
  },
  onShow: function () {
    // 页面显示
  },
  onHide: function () {
    // 页面隐藏
  },
  onUnload: function () {
    // 页面关闭
  },
})
