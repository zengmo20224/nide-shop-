module.exports = class extends think.Controller {
  async __before() {
    // 根据token值获取用户id
    this.ctx.state.token = this.ctx.header['x-nideshop-token'] || '';
    const tokenSerivce = think.service('token', 'api');
    this.ctx.state.userId = await tokenSerivce.getUserId(this.ctx.state.token);

    const publicController = this.config('publicController');
    const publicAction = this.config('publicAction');
    // 如果为非公开，则验证用户是否登录
    const controllerAction = this.ctx.controller + '/' + this.ctx.action;
    if (!publicController.includes(this.ctx.controller) && !publicAction.includes(controllerAction)) {
      if (this.ctx.state.userId <= 0) {
        return this.fail(401, '请先登录');
      }
    }
  }

  /**
   * 获取时间戳
   * @returns {Number}
   */
  getTime() {
    return parseInt(Date.now() / 1000);
  }

  /**
   * 获取当前登录用户的id
   * @returns {*}
   */
  getLoginUserId() {
    return this.ctx.state.userId;
  }

  getOrigin() {
    const forwardedProto = this.ctx.header['x-forwarded-proto'];
    const proto = forwardedProto || this.ctx.protocol || 'http';
    const host = this.ctx.host || this.ctx.header.host || '127.0.0.1:8360';
    return `${proto}://${host}`;
  }

  absoluteAssetUrl(url) {
    if (!url || typeof url !== 'string') {
      return url;
    }

    const localStaticMatch = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/static\/.*)$/i);
    if (localStaticMatch) {
      return `${this.getOrigin()}${localStaticMatch[3]}`;
    }

    if (/^http:\/\//i.test(url)) {
      return url.replace(/^http:/i, 'https:');
    }
    if (/^https:\/\//i.test(url)) {
      return url;
    }
    if (url.indexOf('//') === 0) {
      return `https:${url}`;
    }
    if (url.indexOf('/static/') === 0) {
      return `${this.getOrigin()}${url}`;
    }
    return url;
  }

  normalizeAssetUrls(data) {
    const imageFields = [
      'list_pic_url',
      'primary_pic_url',
      'app_list_pic_url',
      'pic_url',
      'new_pic_url',
      'image_url',
      'img_url',
      'url',
      'avatar',
      'scene_pic_url',
      'item_pic_url',
      'wap_banner_url',
      'banner_url',
      'icon_url'
    ];

    if (Array.isArray(data)) {
      return data.map(item => this.normalizeAssetUrls(item));
    }

    if (!data || typeof data !== 'object') {
      return data;
    }

    Object.keys(data).forEach(key => {
      if (imageFields.includes(key)) {
        data[key] = this.absoluteAssetUrl(data[key]);
      } else if (data[key] && typeof data[key] === 'object') {
        data[key] = this.normalizeAssetUrls(data[key]);
      }
    });

    return data;
  }

  success(data, message) {
    return super.success(this.normalizeAssetUrls(data), message);
  }
};
