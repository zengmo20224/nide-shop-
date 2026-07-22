const _ = require('lodash');

module.exports = class extends think.Model {
  generateOrderNumber() {
    const date = new Date();
    return date.getFullYear() + _.padStart(date.getMonth(), 2, '0') + _.padStart(date.getDay(), 2, '0') + _.padStart(date.getHours(), 2, '0') + _.padStart(date.getMinutes(), 2, '0') + _.padStart(date.getSeconds(), 2, '0') + _.random(100000, 999999);
  }

  async getOrderHandleOption(orderId) {
    const handleOption = {
      cancel: false,
      delete: false,
      pay: false,
      comment: false,
      delivery: false,
      confirm: false,
      return: false,
      buy: false
    };

    const orderInfo = await this.where({id: orderId}).find();
    const orderStatus = parseInt(orderInfo.order_status || 0);
    const payStatus = parseInt(orderInfo.pay_status || 0);

    if (orderStatus === 101 || orderStatus === 102) {
      handleOption.delete = true;
      handleOption.buy = true;
    }

    if (orderStatus === 0 && payStatus !== 2) {
      handleOption.cancel = true;
      handleOption.pay = true;
    }

    if (orderStatus === 201 || (orderStatus === 0 && payStatus === 2)) {
      handleOption.return = true;
    }

    if (orderStatus === 300) {
      handleOption.delivery = true;
      handleOption.return = true;
    }

    if (orderStatus === 301) {
      handleOption.delete = true;
      handleOption.comment = true;
      handleOption.buy = true;
    }

    return handleOption;
  }

  async getOrderStatusText(orderId) {
    const orderInfo = await this.where({id: orderId}).find();
    const orderStatus = parseInt(orderInfo.order_status || 0);
    const payStatus = parseInt(orderInfo.pay_status || 0);

    switch (orderStatus) {
      case 0:
        return payStatus === 2 ? '已付款' : '未付款';
      case 101:
        return '已取消';
      case 102:
        return '已删除';
      case 201:
        return '已付款';
      case 300:
        return '已发货';
      case 301:
        return '已收货';
      case 401:
        return '退款中';
      case 402:
        return '已退款';
      default:
        return payStatus === 2 ? '已付款' : '未付款';
    }
  }
};
