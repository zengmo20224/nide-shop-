const Base = require('./base.js');
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
      official_openid: userInfo.official_openid || '',
      official_nickname: userInfo.official_nickname || '',
      official_bind_time: userInfo.official_bind_time || 0
    };
  }

  async createSession(userId) {
    await this.model('user').ensureOfficialSchema();
    const userInfo = await this.model('user').field(['id', 'username', 'nickname', 'gender', 'avatar', 'birthday', 'mobile', 'official_openid', 'official_nickname', 'official_bind_time']).where({ id: userId }).find();
    await this.model('user').where({ id: userId }).update({
      last_login_time: parseInt(new Date().getTime() / 1000),
      last_login_ip: this.ctx.ip
    });

    const tokenService = this.service('token', 'api');
    const token = await tokenService.create({ user_id: userId });
    if (think.isEmpty(token)) {
      return null;
    }

    return {
      token: token,
      userInfo: this.getPublicUser(userInfo)
    };
  }

  /**
   * 用户注册
   * POST /api/auth/register
   * 参数: username, password, mobile
   */
  async registerAction() {
    const username = (this.post('username') || '').trim();
    const password = this.post('password') || '';
    const mobile = (this.post('mobile') || '').trim();

    // 检查用户名是否已存在
    const existsUser = await this.model('user').where({ username }).find();
    if (!think.isEmpty(existsUser)) {
      return this.fail(400, '用户名已存在');
    }

    const existsMobile = await this.model('user').where({ mobile }).find();
    if (!think.isEmpty(existsMobile)) {
      return this.fail(400, '该手机号已注册');
    }

    // bcrypt 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const currentTime = parseInt(new Date().getTime() / 1000);
    const userId = await this.model('user').add({
      username: username,
      password: hashedPassword,
      register_time: currentTime,
      register_ip: this.ctx.ip,
      last_login_time: currentTime,
      last_login_ip: this.ctx.ip,
      mobile: mobile,
      weixin_openid: '',
      avatar: '',
      gender: 0,
      birthday: 0,
      user_level_id: 0,
      nickname: username
    });

    const session = await this.createSession(userId);
    if (think.isEmpty(session)) {
      return this.fail(400, '生成 token 失败');
    }

    return this.success(session);
  }

  /**
   * 用户登录
   * POST /api/auth/login
   * 参数: username(用户名或手机号), password
   */
  async loginAction() {
    const username = (this.post('username') || this.post('account') || '').trim();
    const password = this.post('password') || '';

    if (username.length < 1 || password.length < 1) {
      return this.fail(400, '请输入用户名和密码');
    }

    const where = /^1[3-9]\d{9}$/.test(username) ? { mobile: username } : { username: username };
    const userInfo = await this.model('user').where(where).find();
    if (think.isEmpty(userInfo)) {
      return this.fail(401, '用户名或密码错误');
    }

    if (!userInfo.password) {
      return this.fail(401, '用户名或密码错误');
    }

    // bcrypt 验证密码
    const isPasswordValid = await bcrypt.compare(password, userInfo.password);
    if (!isPasswordValid) {
      return this.fail(401, '用户名或密码错误');
    }

    const session = await this.createSession(userInfo.id);
    if (think.isEmpty(session)) {
      return this.fail(400, '生成 token 失败');
    }

    return this.success(session);
  }

  async resetPasswordAction() {
    const mobile = (this.post('mobile') || '').trim();
    const code = (this.post('code') || '').trim();
    const password = this.post('password') || this.post('newPassword') || '';

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      return this.fail(400, '手机号格式不正确');
    }
    if (code !== '666666') {
      return this.fail(400, '验证码错误');
    }
    if (password.length < 6) {
      return this.fail(400, '密码长度不能少于 6 位');
    }

    const userInfo = await this.model('user').where({ mobile: mobile }).find();
    if (think.isEmpty(userInfo)) {
      return this.fail(400, '该手机号尚未注册');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.model('user').where({ id: userInfo.id }).update({
      password: hashedPassword
    });

    return this.success('密码重置成功');
  }

  /**
   * 修改密码
   * POST /api/auth/changePassword
   * 参数: oldPassword, newPassword
   * 需要登录（携带 X-Nideshop-Token）
   */
  async changePasswordAction() {
    const userId = this.getLoginUserId();
    if (!userId) {
      return this.fail(401, '请先登录');
    }

    const oldPassword = this.post('oldPassword');
    const newPassword = this.post('newPassword');

    const user = await this.model('user').where({ id: userId }).find();
    if (think.isEmpty(user)) {
      return this.fail(400, '用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return this.fail(400, '原密码错误');
    }

    // 新密码不能与旧密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return this.fail(400, '新密码不能与原密码相同');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.model('user').where({ id: userId }).update({
      password: hashedNewPassword
    });

    return this.success('密码修改成功');
  }

  /**
   * 微信登录（预留）
   * POST /api/auth/loginByWeixin
   */
  async loginByWeixinAction() {
    const code = this.post('code');
    const fullUserInfo = this.post('userInfo');
    const clientIp = this.ctx.ip;

    // 解释用户数据
    const { errno, errmsg, data: userInfo } = await this.service('weixin', 'api').login(code, fullUserInfo);
    if (errno !== 0) {
      return this.fail(errno, errmsg);
    }

    // 根据openid查找用户是否已经注册
    let userId = await this.model('user').where({ weixin_openid: userInfo.openId }).getField('id', true);
    if (think.isEmpty(userId)) {
      // 注册
      userId = await this.model('user').add({
        username: '微信用户' + think.uuid(6),
        password: '',
        register_time: parseInt(new Date().getTime() / 1000),
        register_ip: clientIp,
        mobile: '',
        weixin_openid: userInfo.openId,
        avatar: userInfo.avatarUrl || '',
        gender: userInfo.gender || 1, // 性别 0：未知、1：男、2：女
        nickname: userInfo.nickName
      });
    }

    // 查询用户信息
    const newUserInfo = await this.model('user').field(['id', 'username', 'nickname', 'gender', 'avatar', 'birthday']).where({ id: userId }).find();

    // 更新登录信息
    await this.model('user').where({ id: userId }).update({
      last_login_time: parseInt(new Date().getTime() / 1000),
      last_login_ip: clientIp
    });

    const TokenSerivce = this.service('token', 'api');
    const sessionKey = await TokenSerivce.create({ user_id: userId });

    if (think.isEmpty(sessionKey)) {
      return this.fail('生成 token 失败');
    }

    return this.success({ token: sessionKey, userInfo: newUserInfo });
  }

  async logoutAction() {
    return this.success();
  }
};
