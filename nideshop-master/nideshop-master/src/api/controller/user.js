const Base = require('./base.js');
const fs = require('fs');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

module.exports = class extends Base {
  getPublicUser(userInfo) {
    return {
      id: userInfo.id,
      username: userInfo.username,
      nickname: userInfo.username,
      gender: userInfo.gender,
      avatar: userInfo.avatar,
      birthday: userInfo.birthday,
      mobile: userInfo.mobile,
      balance: userInfo.balance || 0,
      official_openid: userInfo.official_openid || '',
      official_nickname: userInfo.official_nickname || '',
      official_bind_time: userInfo.official_bind_time || 0
    };
  }

  async infoAction() {
    await this.model('user').ensureAccountSchema();
    await this.model('user').ensureOfficialSchema();
    const userInfo = await this.model('user').where({id: this.getLoginUserId()}).find();
    delete userInfo.password;
    return this.success(this.getPublicUser(userInfo));
  }

  async profileAction() {
    const userId = this.getLoginUserId();
    const userInfo = await this.model('user').where({ id: userId }).find();
    if (think.isEmpty(userInfo)) {
      return this.fail(400, '用户不存在');
    }
    if (this.ctx.method === 'POST') {
      await this.model('user').where({ id: userId }).update({ nickname: userInfo.username });
    }
    return this.success(this.getPublicUser(userInfo));
  }

  async passwordAction() {
    const newPassword = this.post('password') || this.post('newPassword') || '';
    if (newPassword.length < 6) {
      return this.fail(400, '密码长度不能少于 6 位');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.model('user').where({ id: this.getLoginUserId() }).update({
      password: hashedPassword
    });

    return this.success('密码修改成功');
  }

  async balanceAction() {
    const userId = this.getLoginUserId();
    const balance = await this.model('user').getBalance(userId);
    return this.success({ balance: balance });
  }

  async rechargeAction() {
    const amount = this.model('user').normalizeAmount(this.post('amount'));
    if (amount <= 0) {
      return this.fail(400, '请输入正确的充值金额');
    }
    if (amount > 100000) {
      return this.fail(400, '单次充值金额不能超过 100000 元');
    }

    const balance = await this.model('user').recharge(this.getLoginUserId(), amount, '充值卡充值');
    return this.success({ balance: balance });
  }

  async accountLogAction() {
    await this.model('user').ensureAccountSchema();
    const list = await this.model('account_log').where({ user_id: this.getLoginUserId() }).order({ id: 'desc' }).limit(20).select();
    return this.success(list);
  }

  /**
   * 保存用户头像
   * @returns {Promise.<void>}
   */
  async saveAvatarAction() {
    const avatar = this.file('avatar');
    if (think.isEmpty(avatar)) {
      return this.fail('保存失败');
    }

    let ext = _.last(_.split(avatar.name || avatar.path, '.')) || 'jpg';
    ext = String(ext).toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      ext = 'jpg';
    }
    const resourcePath = think.RESOURCE_PATH || (think.ROOT_PATH + '/www');
    const avatarDir = resourcePath + '/static/user/avatar';
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }

    const relativePath = `/static/user/avatar/${this.getLoginUserId()}-${Date.now()}.${ext}`;
    const avatarPath = resourcePath + relativePath;
    fs.copyFileSync(avatar.path, avatarPath);
    fs.unlinkSync(avatar.path);

    await this.model('user').where({ id: this.getLoginUserId() }).update({
      avatar: relativePath
    });
    const userInfo = await this.model('user').where({ id: this.getLoginUserId() }).find();

    return this.success(this.getPublicUser(userInfo));
  }
};
