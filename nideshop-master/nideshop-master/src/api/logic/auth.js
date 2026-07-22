module.exports = class extends think.Logic {
  /**
   * 注册接口参数校验
   */
  registerAction() {
    const username = (this.post('username') || '').trim();
    const password = this.post('password') || '';
    const mobile = (this.post('mobile') || '').trim();

    if (!username || username.length < 3 || username.length > 20) {
      this.fail(400, '用户名长度需在 3-20 个字符之间');
      return false;
    }

    if (!password || password.length < 6) {
      this.fail(400, '密码长度不能少于 6 位');
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      this.fail(400, '手机号格式不正确');
      return false;
    }
  }

  /**
   * 登录接口参数校验
   */
  loginAction() {
    const username = (this.post('username') || '').trim();
    const password = this.post('password') || '';

    if (!username) {
      this.fail(400, '请输入用户名或手机号');
      return false;
    }

    if (!password) {
      this.fail(400, '请输入密码');
      return false;
    }
  }

  /**
   * 修改密码接口参数校验
   */
  changePasswordAction() {
    const oldPassword = this.post('oldPassword');
    const newPassword = this.post('newPassword');

    if (!oldPassword) {
      this.fail(400, '请输入原密码');
      return false;
    }

    if (!newPassword || newPassword.length < 6) {
      this.fail(400, '新密码长度不能少于 6 位');
      return false;
    }
  }

  resetPasswordAction() {
    const mobile = (this.post('mobile') || '').trim();
    const code = (this.post('code') || '').trim();
    const password = this.post('password') || this.post('newPassword') || '';

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      this.fail(400, '手机号格式不正确');
      return false;
    }

    if (!code) {
      this.fail(400, '请输入验证码');
      return false;
    }

    if (!password || password.length < 6) {
      this.fail(400, '密码长度不能少于 6 位');
      return false;
    }
  }
};
