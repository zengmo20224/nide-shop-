const Base = require('./base.js');
const bcrypt = require('bcryptjs');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 10;
    const name = this.get('name') || '';

    const model = this.model('user');
    await model.ensureOfficialSchema();
    const data = await model
      .field(['id', 'username', 'nickname', 'mobile', 'avatar', 'gender', 'birthday', 'register_time', 'last_login_time', 'user_level_id', 'balance', 'official_openid', 'official_nickname', 'official_bind_time'])
      .where({'username|nickname|mobile': ['like', `%${name}%`]})
      .order(['id DESC'])
      .page(page, size)
      .countSelect();

    return this.success(data);
  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('user');
    await model.ensureOfficialSchema();
    const data = await model
      .field(['id', 'username', 'nickname', 'mobile', 'avatar', 'gender', 'birthday', 'register_time', 'register_ip', 'last_login_time', 'last_login_ip', 'user_level_id', 'balance', 'weixin_openid', 'official_openid', 'official_nickname', 'official_bind_time'])
      .where({id: id})
      .find();

    return this.success(data);
  }

  async ordersAction() {
    const id = this.get('id');
    const page = this.get('page') || 1;
    const size = this.get('size') || 10;

    const orderModel = this.model('order');
    const data = await orderModel.where({user_id: id}).order(['id DESC']).page(page, size).countSelect();
    const orderList = [];

    for (const item of data.data) {
      item.order_status_text = await orderModel.getOrderStatusText(item.id);
      item.goodsList = await this.model('order_goods').where({order_id: item.id}).select();
      item.goodsCount = 0;
      item.goodsList.forEach(goods => {
        item.goodsCount += Number(goods.number || 0);
      });
      orderList.push(item);
    }

    data.data = orderList;
    return this.success(data);
  }

  async storeAction() {
    if (!this.isPost) {
      return false;
    }

    const postData = this.post();
    const id = this.post('id');
    const username = (this.post('username') || '').trim();
    const password = this.post('password') || '';

    if (!username) {
      return this.fail(400, '请输入账号');
    }

    const model = this.model('user');
    const values = {
      username: username,
      nickname: (postData.nickname || username).trim(),
      mobile: (postData.mobile || '').trim(),
      avatar: (postData.avatar || '').trim(),
      gender: Number(postData.gender || 0),
      birthday: Number(postData.birthday || 0),
      user_level_id: Number(postData.user_level_id || 0)
    };

    if (postData.balance !== undefined) {
      values.balance = Number(postData.balance || 0);
    }

    if (password) {
      if (password.length < 6) {
        return this.fail(400, '密码长度不能少于 6 位');
      }
      values.password = await bcrypt.hash(password, 10);
    }

    if (id > 0) {
      const existsUser = await model.where({username: username}).find();
      if (!think.isEmpty(existsUser) && Number(existsUser.id) !== Number(id)) {
        return this.fail(400, '账号已存在');
      }
      await model.where({id: id}).update(values);
    } else {
      if (!password) {
        return this.fail(400, '新增用户需要设置密码');
      }
      const existsUser = await model.where({username: username}).find();
      if (!think.isEmpty(existsUser)) {
        return this.fail(400, '账号已存在');
      }
      const currentTime = parseInt(Date.now() / 1000);
      values.register_time = currentTime;
      values.register_ip = this.ctx.ip;
      values.last_login_time = 0;
      values.last_login_ip = '';
      values.weixin_openid = '';
      await model.add(values);
    }
    return this.success(values);
  }

  async destoryAction() {
    const id = this.post('id');
    await this.model('user').where({id: id}).limit(1).delete();
    // TODO 删除图片

    return this.success();
  }
};
