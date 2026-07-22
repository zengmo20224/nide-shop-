/**
 * 用户相关服务
 */

const util = require('../utils/util.js');
const api = require('../config/api.js');

function saveAuth(res) {
  if (res.errno === 0 && res.data) {
    wx.setStorageSync('userInfo', res.data.userInfo);
    wx.setStorageSync('token', res.data.token);

    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = res.data.userInfo;
      app.globalData.token = res.data.token;
    }
  }
  return res;
}

function loginByAccount(username, password) {
  return util.post(api.AuthLogin, {
    username: username,
    password: password
  }).then(saveAuth);
}

function registerByAccount(username, password, mobile) {
  return util.post(api.AuthRegister, {
    username: username,
    password: password,
    mobile: mobile
  }).then(saveAuth);
}

function resetPassword(mobile, code, password) {
  return util.post(api.AuthResetPassword, {
    mobile: mobile,
    code: code,
    password: password
  });
}

/**
 * 调用微信登录
 */
function loginByWeixin() {

  let code = null;
  return new Promise(function (resolve, reject) {
    return util.login().then((res) => {
      code = res.code;
      return util.getUserInfo();
    }).then((userInfo) => {
      //登录远程服务器
      util.request(api.AuthLoginByWeixin, { code: code, userInfo: userInfo }, 'POST').then(res => {
        if (res.errno === 0) {
          //存储用户信息
          saveAuth(res);

          resolve(res);
        } else {
          reject(res);
        }
      }).catch((err) => {
        reject(err);
      });
    }).catch((err) => {
      reject(err);
    })
  });
}

/**
 * 判断用户是否登录
 */
function checkLogin() {
  return new Promise(function (resolve, reject) {
    if (wx.getStorageSync('userInfo') && wx.getStorageSync('token')) {

      util.checkSession().then(() => {
        resolve(true);
      }).catch(() => {
        reject(false);
      });

    } else {
      reject(false);
    }
  });
}

function logout() {
  const token = wx.getStorageSync('token');
  if (!token) {
    util.clearAuth();
    return Promise.resolve({ errno: 0 });
  }

  return util.post(api.AuthLogout).then(function (res) {
    util.clearAuth();
    return res;
  }).catch(function () {
    util.clearAuth();
    return { errno: 0 };
  });
}


module.exports = {
  loginByAccount,
  registerByAccount,
  resetPassword,
  loginByWeixin,
  checkLogin,
  logout,
};








