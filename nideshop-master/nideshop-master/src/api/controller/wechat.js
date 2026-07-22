const Base = require('./base.js');
const crypto = require('crypto');
const rp = require('request-promise');
const xml2js = require('xml2js');

module.exports = class extends Base {
  getOfficialConfig() {
    return think.config('wechatOfficial') || {};
  }

  getBaseUrl() {
    const forwardedProto = this.ctx.header['x-forwarded-proto'];
    const proto = forwardedProto || this.ctx.protocol || 'http';
    const host = this.ctx.host || this.ctx.header.host;
    return `${proto}://${host}`;
  }

  getRedirectUri() {
    const config = this.getOfficialConfig();
    return config.oauthRedirectUrl || `${this.getBaseUrl()}/api/wechat/oauthCallback`;
  }

  buildSignature(timestamp, nonce) {
    const token = this.getOfficialConfig().token || '';
    return crypto.createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex');
  }

  encodeState(redirect) {
    const target = redirect || '/#/me';
    return Buffer.from(target).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  decodeState(state) {
    if (!state) {
      return '/#/me';
    }
    try {
      const normalized = String(state).replace(/-/g, '+').replace(/_/g, '/');
      const target = Buffer.from(normalized, 'base64').toString();
      return target && target[0] === '/' ? target : '/#/me';
    } catch (err) {
      return '/#/me';
    }
  }

  async createSession(userId) {
    const userModel = this.model('user');
    await userModel.ensureOfficialSchema();
    const userInfo = await userModel
      .field(['id', 'username', 'nickname', 'gender', 'avatar', 'birthday', 'mobile', 'balance', 'official_openid', 'official_nickname', 'official_avatar', 'official_bind_time'])
      .where({ id: userId })
      .find();

    await userModel.where({ id: userId }).update({
      last_login_time: parseInt(Date.now() / 1000),
      last_login_ip: this.ctx.ip
    });

    const token = await this.service('token', 'api').create({ user_id: userId });
    return {
      token: token,
      userInfo: {
        id: userInfo.id,
        username: userInfo.username,
        nickname: userInfo.nickname || userInfo.username,
        gender: userInfo.gender,
        avatar: userInfo.avatar || userInfo.official_avatar || '',
        birthday: userInfo.birthday,
        mobile: userInfo.mobile,
        balance: userInfo.balance || 0,
        official_openid: userInfo.official_openid || '',
        official_nickname: userInfo.official_nickname || '',
        official_bind_time: userInfo.official_bind_time || 0
      }
    };
  }

  async verifyAction() {
    const signature = this.get('signature') || '';
    const timestamp = this.get('timestamp') || '';
    const nonce = this.get('nonce') || '';
    const echostr = this.get('echostr') || '';

    if (!signature || this.buildSignature(timestamp, nonce) !== signature) {
      return this.fail(400, 'wechat signature invalid');
    }

    if (this.ctx.method === 'GET') {
      this.ctx.body = echostr;
      return false;
    }

    this.ctx.body = await this.replyMessage(await this.getWechatMessage());
    return false;
  }

  getXmlValue(message, key) {
    const value = message && message[key];
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  }

  async getWechatMessage() {
    const xml = this.post('xml');
    if (xml && typeof xml === 'object') {
      return xml;
    }

    if (typeof xml === 'string') {
      const parsed = await xml2js.parseStringPromise(xml, { explicitArray: true });
      return parsed.xml || {};
    }

    const rawBody = this.ctx.request.rawBody;
    if (typeof rawBody === 'string' && rawBody.trim()) {
      const parsed = await xml2js.parseStringPromise(rawBody, { explicitArray: true });
      return parsed.xml || {};
    }

    const body = this.ctx.request.body;
    if (body && body.post && body.post.xml) {
      return body.post.xml;
    }
    if (body && body.xml) {
      return body.xml;
    }
    return {};
  }

  escapeXml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  buildTextXml(toUser, fromUser, content) {
    this.ctx.set('Content-Type', 'application/xml; charset=utf-8');
    return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${parseInt(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${this.escapeXml(content)}]]></Content>
</xml>`;
  }

  getH5Url(route) {
    return `${this.getBaseUrl()}/?v=20260523#${route}`;
  }

  getKeywordReply(content) {
    const text = String(content || '').trim();
    if (/订单|我的订单|order/i.test(text)) {
      return `点击查看我的订单：\n${this.getH5Url('/orders')}`;
    }
    if (/首页|商城|主页|\bhome\b/i.test(text)) {
      return `点击进入商城首页：\n${this.getH5Url('/home')}`;
    }
    if (/个人中心|我的|会员|中心|\bme\b/i.test(text)) {
      return `点击进入个人中心：\n${this.getH5Url('/me')}`;
    }
    if (/商品|分类|catalog|category/i.test(text)) {
      return `点击浏览商品分类：\n${this.getH5Url('/catalog')}`;
    }
    if (/帮助|菜单|help/i.test(text)) {
      return `可回复：\n1. 首页\n2. 个人中心\n3. 我的订单\n4. 商品分类`;
    }
    return `已收到你的消息：${text || '空消息'}\n\n可回复“首页”“个人中心”“我的订单”“商品分类”查看商城内容。`;
  }

  async replyMessage(message) {
    const fromUser = this.getXmlValue(message, 'FromUserName');
    const toUser = this.getXmlValue(message, 'ToUserName');
    const msgType = this.getXmlValue(message, 'MsgType');
    const event = this.getXmlValue(message, 'Event');
    const content = this.getXmlValue(message, 'Content');

    if (!fromUser || !toUser) {
      return 'success';
    }

    if (msgType === 'event' && event === 'subscribe') {
      return this.buildTextXml(fromUser, toUser, `欢迎关注 NideShop 商城。\n回复“首页”“个人中心”“我的订单”即可查看对应页面。`);
    }

    if (msgType === 'text') {
      return this.buildTextXml(fromUser, toUser, this.getKeywordReply(content));
    }

    if (msgType === 'image') {
      return this.buildTextXml(fromUser, toUser, '已收到图片。当前作业版本先支持文本关键词回复。');
    }

    return this.buildTextXml(fromUser, toUser, '已收到消息。回复“帮助”查看可用关键词。');
  }

  async oauthUrlAction() {
    const config = this.getOfficialConfig();
    if (!config.appid || !config.secret) {
      return this.fail(400, '公众号 AppID 或 AppSecret 未配置');
    }

    const redirect = this.get('redirect') || '/#/me';
    const state = this.encodeState(redirect);
    const redirectUri = encodeURIComponent(this.getRedirectUri());
    const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appid}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state}#wechat_redirect`;
    return this.success({ url: url });
  }

  async oauthCallbackAction() {
    const code = this.get('code') || '';
    const state = this.get('state') || '';
    const config = this.getOfficialConfig();
    if (!code) {
      return this.fail(400, 'missing code');
    }
    if (!config.appid || !config.secret) {
      return this.fail(400, '公众号 AppID 或 AppSecret 未配置');
    }

    let result;
    try {
      result = await rp({
        method: 'GET',
        url: 'https://api.weixin.qq.com/sns/oauth2/access_token',
        qs: {
          appid: config.appid,
          secret: config.secret,
          code: code,
          grant_type: 'authorization_code'
        },
        json: true,
        timeout: 10000
      });
    } catch (err) {
      return this.fail(400, `微信授权请求失败：${err.message}`);
    }

    if (!result || !result.openid) {
      return this.fail(400, `微信授权失败：${(result && (result.errmsg || result.errcode)) || 'openid empty'}`);
    }

    const userId = await this.model('user').findOrCreateOfficialUser(result.openid);
    const session = await this.createSession(userId);
    const target = this.decodeState(state);

    this.ctx.type = 'html';
    return `<!doctype html><html><head><meta charset="utf-8"><title>公众号登录</title></head><body><script>
localStorage.setItem('nideshop_token', ${JSON.stringify(session.token)});
localStorage.setItem('nideshop_user', ${JSON.stringify(JSON.stringify(session.userInfo))});
localStorage.removeItem('nideshop_return_hash');
location.replace(${JSON.stringify(target)});
</script></body></html>`;
  }
};
