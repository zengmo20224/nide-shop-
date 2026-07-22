/* eslint-disable no-multi-spaces */
const Base = require('./base.js');

module.exports = class extends Base {
  async prepayAction() {
    const orderId = this.get('orderId');

    const orderInfo = await this.model('order').where({ id: orderId, user_id: this.getLoginUserId() }).find();
    if (think.isEmpty(orderInfo)) {
      return this.fail(400, '订单已取消');
    }
    if (parseInt(orderInfo.pay_status) !== 0) {
      return this.fail(400, '订单已支付，请不要重复操作');
    }

    const openid = await this.model('user').where({ id: orderInfo.user_id }).getField('weixin_openid', true);
    if (think.isEmpty(openid)) {
      return this.fail('微信支付失败 openid empty');
    }

    const WeixinSerivce = this.service('weixin', 'api');
    try {
      const returnParams = await WeixinSerivce.createUnifiedOrder({
        openid: openid,
        body: '订单编号：' + orderInfo.order_sn,
        out_trade_no: orderInfo.order_sn,
        total_fee: parseInt(orderInfo.actual_price * 100),
        spbill_create_ip: ''
      });
      return this.success(returnParams);
    } catch (err) {
      return this.fail(400, `微信支付失败 ${err.err_code_des || err.return_msg}`);
    }
  }

  async balanceAction() {
    const orderId = parseInt(this.post('orderId') || this.get('orderId'));
    if (!orderId) {
      return this.fail(400, '订单不存在');
    }

    const orderInfo = await this.model('order').where({ id: orderId, user_id: this.getLoginUserId() }).find();
    if (think.isEmpty(orderInfo)) {
      return this.fail(400, '订单不存在');
    }
    if (parseInt(orderInfo.pay_status) !== 0) {
      return this.fail(400, '订单已支付，请不要重复操作');
    }

    const result = await this.model('user').payByBalance(this.getLoginUserId(), orderId, orderInfo.actual_price);
    if (!result.success) {
      return this.fail(400, `余额不足，当前余额 ¥${result.balance.toFixed(2)}`);
    }

    const updated = await this.model('order').updatePayStatus(orderId, 2, {
      pay_id: 2,
      pay_name: '余额支付'
    });
    if (!updated) {
      await this.model('user').recharge(this.getLoginUserId(), orderInfo.actual_price, '余额支付失败返还');
      return this.fail(400, '订单支付状态更新失败');
    }

    return this.success({
      orderId: orderId,
      balance: result.balance
    });
  }

  async notifyAction() {
    const WeixinSerivce = this.service('weixin', 'api');
    const result = WeixinSerivce.payNotify(this.post('xml'));
    if (!result) {
      return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付失败]]></return_msg></xml>';
    }

    const orderModel = this.model('order');
    const orderInfo = await orderModel.getOrderByOrderSn(result.out_trade_no);
    if (think.isEmpty(orderInfo)) {
      return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>';
    }

    if (await orderModel.updatePayStatus(orderInfo.id, 2, {
      pay_id: 1,
      pay_name: '微信支付'
    })) {
      return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
    }

    return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>';
  }
};
