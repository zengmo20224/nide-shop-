(function () {
  'use strict';

  var API_BASE = localStorage.getItem('nideshop_admin_api') || 'http://127.0.0.1:8360/admin/';
  var TOKEN_KEY = 'nideshop_admin_token';
  var USER_KEY = 'nideshop_admin_user';
  var MOCK_KEY = 'nideshop_admin_mock';

  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');

  var state = {
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readJson(USER_KEY) || null,
    mock: localStorage.getItem(MOCK_KEY) === '1',
    view: 'dashboard',
    page: {},
    keyword: {},
    modal: null
  };

  var navs = [
    { key: 'dashboard', label: '概览' },
    { key: 'goods', label: '商品管理' },
    { key: 'topic', label: '活动管理' },
    { key: 'user', label: '用户管理' },
    { key: 'order', label: '订单管理' },
    { key: 'brand', label: '品牌管理' },
    { key: 'category', label: '分类管理' }
  ];

  var modules = {
    goods: {
      title: '商品管理',
      endpoint: 'goods',
      searchParam: 'name',
      canEdit: true,
      columns: [
        { label: '图片', render: function (item) { return image(item.list_pic_url || item.primary_pic_url, item.name); } },
        { label: '商品', className: 'name-cell', render: function (item) { return '<strong>' + esc(item.name) + '</strong><div class="muted">' + esc(item.goods_brief || item.goods_sn || '') + '</div>'; } },
        { label: '价格', render: function (item) { return money(item.retail_price); } },
        { label: '库存', render: function (item) { return esc(item.goods_number || 0); } },
        { label: '状态', render: goodsTags }
      ],
      fields: [
        { name: 'name', label: '商品名称', required: true },
        { name: 'goods_sn', label: '商品编号' },
        { name: 'category_id', label: '分类 ID', type: 'number' },
        { name: 'brand_id', label: '品牌 ID', type: 'number' },
        { name: 'retail_price', label: '零售价', type: 'number' },
        { name: 'goods_number', label: '库存', type: 'number' },
        { name: 'sort_order', label: '排序', type: 'number' },
        { name: 'list_pic_url', label: '列表图 URL', wide: true, upload: true },
        { name: 'primary_pic_url', label: '主图 URL', wide: true, upload: true },
        { name: 'goods_brief', label: '卖点简介', wide: true },
        { name: 'promotion_tag', label: '活动标签' },
        { name: 'promotion_desc', label: '活动文案' }
      ],
      switches: [
        { name: 'is_on_sale', label: '上架' },
        { name: 'is_new', label: '新品' },
        { name: 'is_hot', label: '热门' }
      ],
      defaults: { goods_unit: '件', sort_order: 100, goods_number: 100, is_on_sale: 1 }
    },
    topic: {
      title: '活动管理',
      endpoint: 'topic',
      searchParam: 'name',
      canEdit: true,
      columns: [
        { label: '封面', render: function (item) { return image(item.scene_pic_url || item.item_pic_url || item.avatar, item.title); } },
        { label: '活动', className: 'name-cell', render: function (item) { return '<strong>' + esc(item.title) + '</strong><div class="muted">' + esc(item.subtitle || '') + '</div>'; } },
        { label: '价格信息', render: function (item) { return money(item.price_info); } },
        { label: '阅读数', render: function (item) { return esc(item.read_count || 0); } },
        { label: '状态', render: function (item) { return item.is_show ? tag('显示', 'green') : tag('隐藏', 'red'); } }
      ],
      fields: [
        { name: 'title', label: '活动标题', required: true },
        { name: 'subtitle', label: '副标题', wide: true },
        { name: 'price_info', label: '价格信息', type: 'number' },
        { name: 'read_count', label: '阅读数' },
        { name: 'sort_order', label: '排序', type: 'number' },
        { name: 'scene_pic_url', label: '场景图 URL', wide: true },
        { name: 'item_pic_url', label: '列表图 URL', wide: true },
        { name: 'content', label: '活动内容 HTML', type: 'textarea', wide: true }
      ],
      switches: [{ name: 'is_show', label: '显示' }],
      defaults: { sort_order: 100, is_show: 1, price_info: 0 }
    },
    user: {
      title: '用户管理',
      endpoint: 'user',
      searchParam: 'name',
      canEdit: true,
      columns: [
        { label: '头像', render: function (item) { return image(item.avatar, item.nickname || item.username); } },
        { label: '用户', className: 'name-cell', render: function (item) { return '<strong>' + esc(item.nickname || item.username) + '</strong><div class="muted">账号：' + esc(item.username || '-') + '</div>'; } },
        { label: '手机号', render: function (item) { return esc(item.mobile || '-'); } },
        { label: '公众号', render: function (item) { return item.official_openid ? tag('已绑定', 'green') : tag('未绑定', 'gray'); } },
        { label: '余额', render: function (item) { return money(item.balance); } },
        { label: '注册时间', render: function (item) { return time(item.register_time); } },
        { label: '最近登录', render: function (item) { return time(item.last_login_time); } }
      ],
      fields: [
        { name: 'username', label: '账号', required: true },
        { name: 'password', label: '新密码', type: 'password', placeholder: '留空则不修改，至少 6 位', skipEmpty: true },
        { name: 'nickname', label: '昵称' },
        { name: 'mobile', label: '手机号' },
        { name: 'gender', label: '性别', type: 'select', options: [{ value: 0, label: '未知' }, { value: 1, label: '男' }, { value: 2, label: '女' }] },
        { name: 'user_level_id', label: '会员等级 ID', type: 'number' },
        { name: 'balance', label: '账户余额', type: 'number' },
        { name: 'birthday', label: '生日时间戳', type: 'number' },
        { name: 'avatar', label: '头像 URL', wide: true }
      ],
      defaults: { gender: 0, user_level_id: 0, balance: 0, birthday: 0 }
    },
    order: {
      title: '订单管理',
      endpoint: 'order',
      searchParam: 'orderSn',
      columns: [
        { label: '订单号', className: 'name-cell', render: function (item) { return '<strong>' + esc(item.order_sn) + '</strong><div class="muted">' + esc(item.order_status_text || '') + '</div>'; } },
        { label: '收货人', render: function (item) { return esc(item.consignee || '-'); } },
        { label: '金额', render: function (item) { return money(item.actual_price || item.order_price || item.goods_price); } },
        { label: '支付方式', render: paymentLabel },
        { label: '下单时间', render: function (item) { return time(item.add_time); } },
        { label: '状态', render: orderStatusLabel }
      ]
    },
    brand: {
      title: '品牌管理',
      endpoint: 'brand',
      searchParam: 'name',
      canEdit: true,
      columns: [
        { label: '图片', render: function (item) { return image(item.app_list_pic_url || item.pic_url || item.new_pic_url, item.name); } },
        { label: '品牌', className: 'name-cell', render: function (item) { return '<strong>' + esc(item.name) + '</strong><div class="muted">' + esc(item.simple_desc || '') + '</div>'; } },
        { label: '起售价', render: function (item) { return money(item.floor_price); } },
        { label: '排序', render: function (item) { return esc(item.sort_order || 0); } },
        { label: '状态', render: function (item) { return (item.is_show ? tag('显示', 'green') : tag('隐藏', 'red')) + (item.is_new ? tag('新品牌', 'orange') : ''); } }
      ],
      fields: [
        { name: 'name', label: '品牌名称', required: true },
        { name: 'floor_price', label: '起售价', type: 'number' },
        { name: 'sort_order', label: '排序', type: 'number' },
        { name: 'app_list_pic_url', label: '列表图 URL', wide: true },
        { name: 'pic_url', label: '品牌图 URL', wide: true },
        { name: 'simple_desc', label: '简介', type: 'textarea', wide: true }
      ],
      switches: [
        { name: 'is_show', label: '显示' },
        { name: 'is_new', label: '新品牌' }
      ],
      defaults: { floor_price: 0, sort_order: 100, is_show: 1 }
    },
    category: {
      title: '分类管理',
      endpoint: 'category',
      canEdit: true,
      columns: [
        { label: '图片', render: function (item) { return image(item.wap_banner_url || item.banner_url || item.icon_url, item.name); } },
        { label: '分类', className: 'name-cell', render: function (item) { return '<strong>' + esc(item.name) + '</strong><div class="muted">ID ' + esc(item.id) + ' / 父级 ' + esc(item.parent_id || 0) + '</div>'; } },
        { label: '层级', render: function (item) { return tag('L' + (item.level || (item.parent_id ? 2 : 1)), item.parent_id ? 'orange' : 'green'); } },
        { label: '排序', render: function (item) { return esc(item.sort_order || 0); } },
        { label: '状态', render: function (item) { return item.is_show ? tag('显示', 'green') : tag('隐藏', 'red'); } }
      ],
      fields: [
        { name: 'name', label: '分类名称', required: true },
        { name: 'parent_id', label: '父级 ID', type: 'number' },
        { name: 'sort_order', label: '排序', type: 'number' },
        { name: 'front_name', label: '前台名称', wide: true },
        { name: 'wap_banner_url', label: '移动端横幅 URL', wide: true },
        { name: 'icon_url', label: '图标 URL', wide: true }
      ],
      switches: [{ name: 'is_show', label: '显示' }],
      defaults: { parent_id: 0, sort_order: 100, is_show: 1 }
    }
  };

  var mockDb = {
    goods: [
      { id: 1006002, name: '轻奢纯棉刺绣水洗四件套', goods_sn: '1006002', goods_brief: '设计师原款，精致绣花', retail_price: 899, goods_number: 100, list_pic_url: 'http://yanxuan.nosdn.127.net/8ab2d3287af0cefa2cc539e40600621d.png', is_on_sale: 1, is_new: 0, is_hot: 1, sort_order: 23, goods_unit: '件' },
      { id: 1006007, name: '秋冬保暖加厚澳洲羊毛被', goods_sn: '1006007', goods_brief: '臻品级澳洲进口羊毛', retail_price: 459, goods_number: 86, list_pic_url: 'http://yanxuan.nosdn.127.net/66425d1ed50b3968fed27c822fdd32e0.png', is_on_sale: 1, is_new: 1, is_hot: 0, sort_order: 17, goods_unit: '件' }
    ],
    topic: [
      { id: 314, title: '关爱成长的每一步', subtitle: '专业运动品牌同厂好物', price_info: 0, read_count: '6.4k', scene_pic_url: 'https://yanxuan.nosdn.127.net/14943267735961674.jpg', sort_order: 1, is_show: 1, content: '<p>活动详情</p>' },
      { id: 313, title: '一次解决节日送礼难题', subtitle: '这些就是他们想要的礼物清单', price_info: 59.9, read_count: '7.8k', scene_pic_url: 'https://yanxuan.nosdn.127.net/14942996754171334.jpg', sort_order: 2, is_show: 1, content: '<p>活动详情</p>' }
    ],
    user: [
      { id: 1, username: 'demo', nickname: '演示用户', mobile: '13800008888', avatar: '../nideshop-master/nideshop-master/www/static/user/avatar/1.jpg', gender: 1, balance: 268.5, register_time: 1716250000, last_login_time: 1716253600, user_level_id: 1 },
      { id: 2, username: 'buyer', nickname: '普通会员', mobile: '13900009999', avatar: '', gender: 2, balance: 35, register_time: 1716180000, last_login_time: 1716260000, user_level_id: 1 }
    ],
    order: [
      { id: 1, user_id: 1, order_sn: '202605210001', consignee: '小明', actual_price: 299, goods_price: 299, add_time: 1716250000, order_status: 201, pay_status: 2, pay_id: 2, pay_name: '余额支付', order_status_text: '已付款' },
      { id: 2, user_id: 1, order_sn: '202605210002', consignee: '小明', actual_price: 89, goods_price: 89, add_time: 1716260000, order_status: 301, pay_status: 2, pay_id: 1, pay_name: '微信支付', order_status_text: '已收货' },
      { id: 3, user_id: 2, order_sn: '202605210003', consignee: '小红', actual_price: 156, goods_price: 156, add_time: 1716263600, order_status: 0, pay_status: 0, pay_id: 0, pay_name: '', order_status_text: '未付款' }
    ],
    brand: [
      { id: 1, name: 'MUJI 制造商', simple_desc: '严选供应链品牌', floor_price: 29, app_list_pic_url: 'https://yanxuan.nosdn.127.net/1541445967645114dd75f6b0edc4762d.png', is_show: 1, is_new: 1, sort_order: 10 },
      { id: 2, name: 'CK 制造商', simple_desc: '品质内搭与家居服', floor_price: 59, app_list_pic_url: 'https://yanxuan.nosdn.127.net/1541445967645114dd75f6b0edc4762d.png', is_show: 1, is_new: 0, sort_order: 20 }
    ],
    category: [
      { id: 1005000, name: '居家', parent_id: 0, level: 1, sort_order: 1, is_show: 1, wap_banner_url: 'http://yanxuan.nosdn.127.net/e8bf0cf08cf7eda21606ab191762e35c.png' },
      { id: 1008008, name: '床品件套', parent_id: 1005000, level: 2, sort_order: 11, is_show: 1, wap_banner_url: 'http://yanxuan.nosdn.127.net/8fe62f8d0d531a47f07863417f8d63a1.png' }
    ],
    orderGoods: {
      1: [
        { goods_name: '轻奢纯棉刺绣水洗四件套', number: 1, retail_price: 299, list_pic_url: 'http://yanxuan.nosdn.127.net/8ab2d3287af0cefa2cc539e40600621d.png' }
      ],
      2: [
        { goods_name: '趣味粉彩单面纱布亲肤毛巾', number: 3, retail_price: 29.67, list_pic_url: 'http://yanxuan.nosdn.127.net/a84e8e6979f00efd9a728ed36b154753.png' }
      ],
      3: [
        { goods_name: '秋冬保暖加厚澳洲羊毛被', number: 1, retail_price: 156, list_pic_url: 'http://yanxuan.nosdn.127.net/66425d1ed50b3968fed27c822fdd32e0.png' }
      ]
    }
  };

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (err) {
      return null;
    }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    var num = Number(value || 0);
    return '¥' + num.toFixed(2);
  }

  function time(value) {
    var num = Number(value || 0);
    if (!num) return '-';
    var date = new Date(num * 1000);
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function assetUrl(src) {
    if (!src) return '';
    if (/^https?:\/\//i.test(src)) return src;
    if (src.indexOf('//') === 0) return 'https:' + src;
    if (src.charAt(0) === '/') {
      if (location.protocol === 'file:') return 'http://127.0.0.1:8360' + src;
      return location.origin + src;
    }
    return src;
  }

  function image(src, alt) {
    if (!src) return '<div class="cover empty-cover">' + esc((alt || '?').slice(0, 1).toUpperCase()) + '</div>';
    return '<img class="cover" src="' + esc(assetUrl(src)) + '" alt="' + esc(alt || '') + '" onerror="this.style.visibility=\'hidden\'">';
  }

  function tag(text, color) {
    return '<span class="tag ' + esc(color || '') + '">' + esc(text) + '</span>';
  }

  function paymentLabel(item) {
    var payStatus = Number(item.pay_status || 0);
    if (payStatus !== 2) return tag('未支付', 'red');
    return tag(item.pay_name || (Number(item.pay_id) === 2 ? '余额支付' : '已支付'), 'green');
  }

  function orderStatusLabel(item) {
    var text = item.order_status_text || (Number(item.pay_status) === 2 ? '已付款' : '未付款');
    var orderStatus = Number(item.order_status || 0);
    var payStatus = Number(item.pay_status || 0);
    var color = 'orange';
    if (orderStatus === 0 && payStatus !== 2) color = 'red';
    if (payStatus === 2 || orderStatus === 201 || orderStatus === 300 || orderStatus === 301) color = 'green';
    if (orderStatus === 101 || orderStatus === 102 || orderStatus === 401 || orderStatus === 402) color = 'red';
    return tag(text, color);
  }

  function goodsTags(item) {
    return [
      item.is_on_sale ? tag('上架', 'green') : tag('下架', 'red'),
      item.is_new ? tag('新品', 'orange') : '',
      item.is_hot ? tag('热门', 'orange') : ''
    ].join('');
  }

  function genderText(value) {
    return Number(value) === 1 ? '男' : (Number(value) === 2 ? '女' : '未知');
  }

  function toast(message) {
    toastEl.textContent = message || '操作失败';
    toastEl.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      toastEl.hidden = true;
    }, 2300);
  }

  function request(path, options) {
    options = options || {};
    if (state.mock) return mockRequest(path, options);

    var method = options.method || 'GET';
    var query = options.query || {};
    var url = API_BASE + path.replace(/^\/+/, '');
    var queryText = new URLSearchParams(query).toString();
    if (queryText) url += '?' + queryText;

    var headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['X-Nideshop-Token'] = state.token;

    var fetchOptions = { method: method, headers: headers };
    if (method !== 'GET') fetchOptions.body = JSON.stringify(options.body || {});

    return fetch(url, fetchOptions).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (payload) {
      if (payload.errno === 401) {
        clearSession();
        render();
        throw new Error(payload.errmsg || '登录已失效');
      }
      if (payload.errno && payload.errno !== 0) throw new Error(payload.errmsg || '接口请求失败');
      return payload.data;
    });
  }

  function mockRequest(path, options) {
    options = options || {};
    var parts = path.split('/');
    var module = parts[0];
    var action = parts[1] || 'index';
    var query = options.query || {};
    var body = options.body || {};

    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        if (path === 'auth/login') {
          resolve({ token: 'mock-admin-token', userInfo: { id: 1, username: body.username || 'admin' } });
          return;
        }

        if (path === 'user/orders') {
          var userOrders = mockDb.order.filter(function (item) { return String(item.user_id) === String(query.id); }).map(function (item) {
            var copy = Object.assign({}, item);
            copy.goodsList = mockDb.orderGoods[item.id] || [];
            copy.goodsCount = copy.goodsList.reduce(function (sum, goods) { return sum + Number(goods.number || 0); }, 0);
            return copy;
          });
          resolve({ count: userOrders.length, totalPages: 1, currentPage: 1, data: userOrders });
          return;
        }

        var list = mockDb[module];
        if (!list) {
          reject(new Error('演示数据不存在'));
          return;
        }

        if (action === 'index') {
          var keyword = String(query.name || query.orderSn || '').trim().toLowerCase();
          var page = Number(query.page || 1);
          var size = Number(query.size || 10);
          var filtered = list.filter(function (item) {
            var text = [item.name, item.title, item.username, item.nickname, item.mobile, item.order_sn, item.consignee].join(' ').toLowerCase();
            return !keyword || text.indexOf(keyword) >= 0;
          });
          resolve({
            count: filtered.length,
            totalPages: Math.max(1, Math.ceil(filtered.length / size)),
            currentPage: page,
            data: filtered.slice((page - 1) * size, page * size)
          });
          return;
        }

        if (action === 'info') {
          resolve(list.find(function (item) { return String(item.id) === String(query.id); }) || {});
          return;
        }

        if (action === 'store') {
          var id = Number(body.id || 0);
          if (id) {
            var current = list.find(function (item) { return Number(item.id) === id; });
            if (current) Object.assign(current, body);
            resolve(current || body);
            return;
          }
          body.id = Date.now();
          body.register_time = Math.floor(Date.now() / 1000);
          list.unshift(body);
          resolve(body);
          return;
        }

        if (action === 'destory') {
          var removeId = Number(body.id);
          mockDb[module] = list.filter(function (item) { return Number(item.id) !== removeId; });
          resolve({});
          return;
        }

        reject(new Error('演示接口不存在'));
      }, 180);
    });
  }

  function pickUpload(fieldName) {
    var fileInput = document.getElementById('file_' + fieldName);
    if (fileInput) fileInput.click();
  }

  function uploadGoodsImage(fieldName) {
    var fileInput = document.getElementById('file_' + fieldName);
    var file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file) return;

    if (!/^image\//.test(file.type || '')) {
      toast('请选择图片文件');
      fileInput.value = '';
      return;
    }

    if (state.mock) {
      setImageFieldValue(fieldName, URL.createObjectURL(file));
      toast('本地预览已更新，API 模式下会上传到服务器');
      return;
    }

    var formData = new FormData();
    formData.append('goods_pic', file);
    formData.append('field', fieldName);

    var headers = {};
    if (state.token) headers['X-Nideshop-Token'] = state.token;

    toast('正在上传图片...');
    fetch(API_BASE + 'upload/goodsPic', {
      method: 'POST',
      headers: headers,
      body: formData
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (payload) {
      if (payload.errno && payload.errno !== 0) throw new Error(payload.errmsg || '图片上传失败');
      var fileUrl = (payload.data || {}).fileUrl;
      if (!fileUrl) throw new Error('图片上传失败');
      setImageFieldValue(fieldName, fileUrl);
      toast('图片上传成功');
    }).catch(function (err) {
      toast(err.message);
    }).finally(function () {
      fileInput.value = '';
    });
  }

  function setImageFieldValue(fieldName, url) {
    var input = document.getElementById('form_' + fieldName);
    var preview = document.getElementById('preview_' + fieldName);
    if (input) input.value = url;
    if (preview) preview.innerHTML = image(url, fieldName);
  }

  function clearSession() {
    state.token = '';
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function saveSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  }

  function render() {
    closeModal();
    if (!state.token) {
      renderLogin();
      return;
    }

    app.innerHTML = [
      '<div class="app-layout">',
      renderSidebar(),
      '<main class="main">',
      renderTopbar(),
      '<div id="content" class="content"></div>',
      '</main>',
      '</div>'
    ].join('');

    if (state.view === 'dashboard') renderDashboard();
    else renderList(state.view);
  }

  function renderLogin() {
    app.innerHTML = [
      '<main class="login-page">',
      '<form class="login-panel" onsubmit="Admin.login(event)">',
      '<h1 class="login-title">NideShop 后台管理</h1>',
      '<p class="login-subtitle">连接本地 ThinkJS 后端，或使用离线演示数据。</p>',
      '<div class="field"><label>接口地址</label><input id="apiBase" value="' + esc(API_BASE) + '"></div>',
      '<div class="field"><label>账号</label><input id="username" autocomplete="username" value="admin"></div>',
      '<div class="field"><label>密码</label><input id="password" autocomplete="current-password" type="password" placeholder="管理员密码"></div>',
      '<button class="btn primary" style="width:100%;margin-top:4px">登录</button>',
      '<button class="btn" type="button" style="width:100%;margin-top:10px" onclick="Admin.useMock()">进入离线演示</button>',
      '</form>',
      '</main>'
    ].join('');
  }

  function renderSidebar() {
    return [
      '<aside class="sidebar">',
      '<div class="brand"><strong>NideShop</strong><span>Store Admin</span></div>',
      navs.map(function (item) {
        return '<button class="nav-button ' + (state.view === item.key ? 'active' : '') + '" onclick="Admin.go(\'' + item.key + '\')">' + esc(item.label) + '</button>';
      }).join(''),
      '</aside>'
    ].join('');
  }

  function renderTopbar() {
    var title = state.view === 'dashboard' ? '数据概览' : modules[state.view].title;
    return [
      '<header class="topbar">',
      '<h1>' + esc(title) + '</h1>',
      '<div class="topbar-actions">',
      '<span class="status-pill">' + (state.mock ? '离线演示' : 'API 模式') + '</span>',
      '<span class="muted">' + esc((state.user || {}).username || 'admin') + '</span>',
      '<button class="btn" onclick="Admin.logout()">退出</button>',
      '</div>',
      '</header>'
    ].join('');
  }

  function setContent(html) {
    document.getElementById('content').innerHTML = html;
  }

  function renderDashboard() {
    setContent('<div class="empty">正在加载数据...</div>');
    Promise.all([
      loadModule('goods', 1, 1, ''),
      loadModule('topic', 1, 1, ''),
      loadModule('user', 1, 1, ''),
      loadModule('order', 1, 1, '')
    ]).then(function (res) {
      setContent([
        '<section class="metric-grid">',
        metric('商品数量', res[0].count),
        metric('活动数量', res[1].count),
        metric('用户数量', res[2].count),
        metric('订单数量', res[3].count),
        '</section>',
        '<section class="panel">',
        '<div class="panel-head"><h2 class="panel-title">快捷入口</h2></div>',
        '<div class="modal-body toolbar">',
        '<button class="btn primary" onclick="Admin.go(\'goods\')">管理商品</button>',
        '<button class="btn" onclick="Admin.go(\'topic\')">管理活动</button>',
        '<button class="btn" onclick="Admin.go(\'order\')">查看订单</button>',
        '<button class="btn" onclick="Admin.go(\'user\')">管理用户</button>',
        '</div>',
        '</section>'
      ].join(''));
    }).catch(function (err) {
      setContent('<div class="empty">' + esc(err.message) + '</div>');
    });
  }

  function metric(label, value) {
    return '<div class="metric"><label>' + esc(label) + '</label><strong>' + esc(value || 0) + '</strong></div>';
  }

  function renderList(key) {
    var config = modules[key];
    var page = state.page[key] || 1;
    var keyword = state.keyword[key] || '';
    setContent('<div class="empty">正在加载数据...</div>');

    loadModule(key, page, 10, keyword).then(function (data) {
      var rows = data.data || [];
      var table = rows.length ? renderTable(key, rows) : '<div class="empty">暂无数据</div>';
      var addButton = config.canEdit ? '<button class="btn primary" onclick="Admin.openEditor(\'' + key + '\')">新增</button>' : '';
      setContent([
        '<section class="panel">',
        '<div class="panel-head">',
        '<div><h2 class="panel-title">' + esc(config.title) + '</h2>' + (key === 'user' ? '<p class="panel-desc">可查看资料、修改账号密码、删除用户，并追踪购买记录。</p>' : '') + '</div>',
        '<div class="toolbar">',
        '<input class="search-input" id="searchInput" value="' + esc(keyword) + '" placeholder="搜索关键词" onkeydown="Admin.searchEnter(event,\'' + key + '\')">',
        '<button class="btn" onclick="Admin.search(\'' + key + '\')">搜索</button>',
        '<button class="btn" onclick="Admin.reload()">刷新</button>',
        addButton,
        '</div>',
        '</div>',
        table,
        renderPager(key, data),
        '</section>'
      ].join(''));
    }).catch(function (err) {
      setContent('<div class="empty">' + esc(err.message) + '</div>');
      toast(err.message);
    });
  }

  function loadModule(key, page, size, keyword) {
    var config = modules[key];
    var query = { page: page, size: size };
    if (config.searchParam && keyword) query[config.searchParam] = keyword;
    return request(config.endpoint + '/index', { query: query }).then(normalizeList);
  }

  function normalizeList(data) {
    if (Array.isArray(data)) return { count: data.length, totalPages: 1, currentPage: 1, data: data };
    data = data || {};
    var rows = data.data || data.list || [];
    return {
      count: Number(data.count || rows.length || 0),
      totalPages: Number(data.totalPages || data.total_pages || Math.max(1, Math.ceil((data.count || rows.length || 0) / 10))),
      currentPage: Number(data.currentPage || data.current_page || 1),
      data: rows
    };
  }

  function renderTable(key, rows) {
    var config = modules[key];
    var head = config.columns.map(function (column) {
      return '<th>' + esc(column.label) + '</th>';
    }).join('') + '<th>操作</th>';

    var body = rows.map(function (item) {
      var cells = config.columns.map(function (column) {
        return '<td class="' + esc(column.className || '') + '">' + column.render(item) + '</td>';
      }).join('');
      return '<tr>' + cells + '<td>' + renderActions(key, item) + '</td></tr>';
    }).join('');

    return '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function renderActions(key, item) {
    if (key === 'user') {
      return [
        '<div class="actions">',
        '<button class="btn" onclick="Admin.viewInfo(\'user\',' + Number(item.id) + ')">查看</button>',
        '<button class="btn" onclick="Admin.openEditor(\'user\',' + Number(item.id) + ')">编辑</button>',
        '<button class="btn success" onclick="Admin.viewUserOrders(' + Number(item.id) + ')">购物记录</button>',
        '<button class="btn danger" onclick="Admin.removeItem(\'user\',' + Number(item.id) + ')">删除</button>',
        '</div>'
      ].join('');
    }

    var config = modules[key];
    if (!config.canEdit) {
      return '<div class="actions"><button class="btn" onclick="Admin.viewInfo(\'' + key + '\',' + Number(item.id) + ')">查看</button></div>';
    }
    return [
      '<div class="actions">',
      '<button class="btn" onclick="Admin.openEditor(\'' + key + '\',' + Number(item.id) + ')">编辑</button>',
      '<button class="btn danger" onclick="Admin.removeItem(\'' + key + '\',' + Number(item.id) + ')">删除</button>',
      '</div>'
    ].join('');
  }

  function renderPager(key, data) {
    var page = state.page[key] || 1;
    var totalPages = data.totalPages || 1;
    return [
      '<div class="pager">',
      '<span class="muted">共 ' + esc(data.count || 0) + ' 条，第 ' + esc(page) + ' / ' + esc(totalPages) + ' 页</span>',
      '<button class="btn" ' + (page <= 1 ? 'disabled' : '') + ' onclick="Admin.page(\'' + key + '\',' + (page - 1) + ')">上一页</button>',
      '<button class="btn" ' + (page >= totalPages ? 'disabled' : '') + ' onclick="Admin.page(\'' + key + '\',' + (page + 1) + ')">下一页</button>',
      '</div>'
    ].join('');
  }

  function getFieldValue(item, name) {
    return item && item[name] != null ? item[name] : '';
  }

  function renderImageUploadField(field, value) {
    var fieldName = esc(field.name);
    return [
      '<div class="image-upload-field">',
      '<input id="form_' + fieldName + '" type="text" value="' + esc(value) + '" placeholder="可填写网络图片 URL，也可上传本地图片">',
      '<div class="image-upload-row">',
      '<button class="btn" type="button" onclick="Admin.pickUpload(\'' + fieldName + '\')">上传本地图</button>',
      '<span class="muted">上传成功后会自动填入本地图片地址</span>',
      '</div>',
      '<input class="file-input" id="file_' + fieldName + '" type="file" accept="image/*" onchange="Admin.uploadGoodsImage(\'' + fieldName + '\')">',
      '<div class="image-preview" id="preview_' + fieldName + '">' + (value ? image(value, field.label) : '<span class="muted">暂无图片</span>') + '</div>',
      '</div>'
    ].join('');
  }

  function openEditor(key, id) {
    var config = modules[key];
    var itemPromise = id ? request(config.endpoint + '/info', { query: { id: id } }) : Promise.resolve(Object.assign({}, config.defaults || {}));
    itemPromise.then(function (item) {
      state.modal = { type: 'editor', key: key, item: item || {} };
      renderEditorModal();
    }).catch(function (err) {
      toast(err.message);
    });
  }

  function renderEditorModal() {
    closeModal(false);
    var modal = state.modal;
    if (!modal) return;
    var config = modules[modal.key];
    var item = modal.item;
    var fields = config.fields.map(function (field) {
      var value = field.name === 'password' ? '' : getFieldValue(item, field.name);
      var cls = field.wide ? 'field wide' : 'field';
      var input;
      if (field.upload) {
        input = renderImageUploadField(field, value);
      } else if (field.type === 'textarea') {
        input = '<textarea id="form_' + esc(field.name) + '">' + esc(value) + '</textarea>';
      } else if (field.type === 'select') {
        input = '<select id="form_' + esc(field.name) + '">' + (field.options || []).map(function (option) {
          return '<option value="' + esc(option.value) + '"' + (String(option.value) === String(value) ? ' selected' : '') + '>' + esc(option.label) + '</option>';
        }).join('') + '</select>';
      } else {
        input = '<input id="form_' + esc(field.name) + '" type="' + esc(field.type || 'text') + '" value="' + esc(value) + '"' + (field.required ? ' required' : '') + (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') + '>';
      }
      return '<div class="' + cls + '"><label>' + esc(field.label) + '</label>' + input + '</div>';
    }).join('');

    var switches = (config.switches || []).map(function (field) {
      var checked = Number(item[field.name] || 0) ? ' checked' : '';
      return '<label><input id="form_' + esc(field.name) + '" type="checkbox"' + checked + '> ' + esc(field.label) + '</label>';
    }).join('');

    var html = [
      '<div class="modal-mask">',
      '<form class="modal" onsubmit="Admin.saveEditor(event)">',
      '<div class="modal-head"><h2 class="panel-title">' + esc(item.id ? '编辑' : '新增') + esc(config.title.replace('管理', '')) + '</h2><button class="btn" type="button" onclick="Admin.closeModal()">关闭</button></div>',
      '<div class="modal-body">',
      '<div class="form-grid">',
      fields,
      switches ? '<div class="field wide"><label>状态</label><div class="switches">' + switches + '</div></div>' : '',
      '</div>',
      '</div>',
      '<div class="modal-foot"><button class="btn" type="button" onclick="Admin.closeModal()">取消</button><button class="btn primary">保存</button></div>',
      '</form>',
      '</div>'
    ].join('');

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function closeModal(resetState) {
    if (resetState !== false) state.modal = null;
    document.querySelectorAll('.modal-mask').forEach(function (mask) { mask.remove(); });
  }

  function saveEditor(event) {
    event.preventDefault();
    var modal = state.modal;
    if (!modal) return;
    var config = modules[modal.key];
    var body = Object.assign({}, modal.item);

    config.fields.forEach(function (field) {
      var el = document.getElementById('form_' + field.name);
      var value = field.type === 'number' ? Number(el.value || 0) : el.value.trim();
      if (field.skipEmpty && value === '') {
        delete body[field.name];
        return;
      }
      body[field.name] = value;
    });

    (config.switches || []).forEach(function (field) {
      var el = document.getElementById('form_' + field.name);
      body[field.name] = el.checked ? 1 : 0;
    });

    request(config.endpoint + '/store', { method: 'POST', body: body }).then(function () {
      closeModal();
      toast('保存成功');
      renderList(modal.key);
    }).catch(function (err) {
      toast(err.message);
    });
  }

  function removeItem(key, id) {
    var config = modules[key];
    if (!confirm('确认删除这条数据吗？')) return;
    request(config.endpoint + '/destory', { method: 'POST', body: { id: id } }).then(function () {
      toast('删除成功');
      renderList(key);
    }).catch(function (err) {
      toast(err.message);
    });
  }

  function viewInfo(key, id) {
    var config = modules[key];
    request(config.endpoint + '/info', { query: { id: id } }).then(function (item) {
      if (key === 'user') renderUserInfoModal(item || {});
      else renderInfoModal(config.title.replace('管理', '详情'), item || {});
    }).catch(function (err) {
      toast(err.message);
    });
  }

  function renderInfoModal(title, item) {
    closeModal(false);
    var rows = Object.keys(item).map(function (key) {
      return '<div class="detail-row"><span>' + esc(key) + '</span><strong>' + esc(item[key]) + '</strong></div>';
    }).join('');
    document.body.insertAdjacentHTML('beforeend', [
      '<div class="modal-mask">',
      '<section class="modal">',
      '<div class="modal-head"><h2 class="panel-title">' + esc(title) + '</h2><button class="btn" type="button" onclick="Admin.closeModal()">关闭</button></div>',
      '<div class="modal-body"><div class="detail-list">' + rows + '</div></div>',
      '</section>',
      '</div>'
    ].join(''));
  }

  function renderUserInfoModal(user) {
    closeModal(false);
    document.body.insertAdjacentHTML('beforeend', [
      '<div class="modal-mask">',
      '<section class="modal">',
      '<div class="modal-head"><h2 class="panel-title">用户详情</h2><button class="btn" type="button" onclick="Admin.closeModal()">关闭</button></div>',
      '<div class="modal-body">',
      '<div class="user-profile">',
      image(user.avatar, user.nickname || user.username),
      '<div><h3>' + esc(user.nickname || user.username || '-') + '</h3><p class="muted">账号：' + esc(user.username || '-') + '</p></div>',
      '</div>',
      '<div class="detail-grid">',
      detail('手机号', user.mobile || '-'),
      detail('性别', genderText(user.gender)),
      detail('公众号', user.official_openid ? '已绑定' : '未绑定'),
      detail('公众号 OpenID', user.official_openid || '-'),
      detail('公众号昵称', user.official_nickname || '-'),
      detail('绑定时间', time(user.official_bind_time)),
      detail('余额', money(user.balance)),
      detail('会员等级', user.user_level_id || 0),
      detail('注册时间', time(user.register_time)),
      detail('最近登录', time(user.last_login_time)),
      detail('注册 IP', user.register_ip || '-'),
      detail('登录 IP', user.last_login_ip || '-'),
      '</div>',
      '</div>',
      '<div class="modal-foot">',
      '<button class="btn" type="button" onclick="Admin.openEditor(\'user\',' + Number(user.id) + ')">编辑资料</button>',
      '<button class="btn success" type="button" onclick="Admin.viewUserOrders(' + Number(user.id) + ')">购物记录</button>',
      '</div>',
      '</section>',
      '</div>'
    ].join(''));
  }

  function detail(label, value) {
    return '<div class="detail-card"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
  }

  function viewUserOrders(id) {
    closeModal(false);
    document.body.insertAdjacentHTML('beforeend', [
      '<div class="modal-mask">',
      '<section class="modal wide-modal">',
      '<div class="modal-head"><h2 class="panel-title">购物记录</h2><button class="btn" type="button" onclick="Admin.closeModal()">关闭</button></div>',
      '<div class="modal-body" id="orderDetailBody"><div class="empty">正在加载购物记录...</div></div>',
      '</section>',
      '</div>'
    ].join(''));

    request('user/orders', { query: { id: id, page: 1, size: 20 } }).then(function (data) {
      var rows = normalizeList(data).data || [];
      var body = document.getElementById('orderDetailBody');
      if (!rows.length) {
        body.innerHTML = '<div class="empty">暂无购物记录</div>';
        return;
      }
      body.innerHTML = rows.map(renderOrderCard).join('');
    }).catch(function (err) {
      var body = document.getElementById('orderDetailBody');
      if (body) body.innerHTML = '<div class="empty">' + esc(err.message) + '</div>';
      toast(err.message);
    });
  }

  function renderOrderCard(order) {
    var goods = (order.goodsList || []).map(function (item) {
      return [
        '<div class="order-goods">',
        image(item.list_pic_url, item.goods_name),
        '<div><strong>' + esc(item.goods_name || '-') + '</strong><div class="muted">数量 ' + esc(item.number || 0) + ' / 单价 ' + money(item.retail_price) + '</div></div>',
        '</div>'
      ].join('');
    }).join('');

    return [
      '<article class="order-card">',
      '<div class="order-card-head">',
      '<div><strong>' + esc(order.order_sn || '-') + '</strong><div class="muted">' + time(order.add_time) + '</div></div>',
      '<div class="order-total"><span>' + tag(order.order_status_text || '订单', 'orange') + '</span><strong>' + money(order.actual_price || order.order_price || order.goods_price) + '</strong></div>',
      '</div>',
      goods || '<div class="muted">没有商品明细</div>',
      '</article>'
    ].join('');
  }

  function login(event) {
    event.preventDefault();
    API_BASE = document.getElementById('apiBase').value.trim().replace(/\/?$/, '/');
    localStorage.setItem('nideshop_admin_api', API_BASE);
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    state.mock = false;
    localStorage.removeItem(MOCK_KEY);

    request('auth/login', {
      method: 'POST',
      body: { username: username, password: password }
    }).then(function (data) {
      saveSession(data.token, data.userInfo);
      toast('登录成功');
      render();
    }).catch(function (err) {
      toast(err.message + '，也可使用离线演示');
    });
  }

  function useMock() {
    state.mock = true;
    localStorage.setItem(MOCK_KEY, '1');
    saveSession('mock-admin-token', { id: 1, username: 'admin' });
    render();
  }

  window.Admin = {
    login: login,
    useMock: useMock,
    go: function (key) {
      state.view = key;
      state.modal = null;
      render();
    },
    reload: function () {
      render();
    },
    logout: function () {
      clearSession();
      localStorage.removeItem(MOCK_KEY);
      state.mock = false;
      render();
    },
    search: function (key) {
      state.keyword[key] = document.getElementById('searchInput').value.trim();
      state.page[key] = 1;
      renderList(key);
    },
    searchEnter: function (event, key) {
      if (event.key === 'Enter') window.Admin.search(key);
    },
    page: function (key, page) {
      state.page[key] = page;
      renderList(key);
    },
    openEditor: openEditor,
    pickUpload: pickUpload,
    uploadGoodsImage: uploadGoodsImage,
    closeModal: closeModal,
    saveEditor: saveEditor,
    removeItem: removeItem,
    viewInfo: viewInfo,
    viewUserOrders: viewUserOrders
  };

  render();
})();
