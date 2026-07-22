(function () {
  'use strict';

  var API_ROOT = location.protocol === 'file:' ? 'http://127.0.0.1:8360/api/' : '/api/';
  var TOKEN_KEY = 'nideshop_token';
  var USER_KEY = 'nideshop_user';
  var RETURN_KEY = 'nideshop_return_hash';
  var ADDRESS_KEY = 'nideshop_checkout_address_id';
  var CHANNEL_IMG = 'assets/images/';
  var STATIC_IMG = CHANNEL_IMG;
  var CHANNEL_ICONS = {
    1: CHANNEL_IMG + 'channel_home.png',
    2: CHANNEL_IMG + 'channel_kitchen.png',
    3: CHANNEL_IMG + 'channel_accessory.png',
    4: CHANNEL_IMG + 'channel_clothing.png',
    5: CHANNEL_IMG + 'channel_hobby.png'
  };
  var CHANNEL_CATEGORY_IDS = {
    1: 1005000,
    2: 1005001,
    3: 1008000,
    4: 1010000,
    5: 1019000
  };

  var state = {
    route: '/home',
    params: {},
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readJson(USER_KEY),
    currentProduct: null,
    selectedSpecs: {},
    detailNumber: 1,
    priceOrder: 'asc'
  };

  var endpoints = {
    home: 'index/index',
    goodsCount: 'goods/count',
    catalog: 'catalog/index',
    catalogCurrent: 'catalog/current',
    goodsList: 'goods/list',
    goodsDetail: 'goods/detail',
    goodsRelated: 'goods/related',
    brandList: 'brand/list',
    brandDetail: 'brand/detail',
    topicList: 'topic/list',
    topicDetail: 'topic/detail',
    topicRelated: 'topic/related',
    searchIndex: 'search/index',
    searchHelper: 'search/helper',
    searchClear: 'search/clearhistory',
    login: 'auth/login',
    register: 'auth/register',
    resetPassword: 'auth/resetPassword',
    wechatOauthUrl: 'wechat/oauthUrl',
    userInfo: 'user/info',
    userProfile: 'user/profile',
    userPassword: 'user/password',
    userAvatar: 'user/saveAvatar',
    cart: 'cart/index',
    cartAdd: 'cart/add',
    cartUpdate: 'cart/update',
    cartChecked: 'cart/checked',
    cartDelete: 'cart/delete',
    cartCheckout: 'cart/checkout',
    orderSubmit: 'order/submit',
    orderList: 'order/list',
    orderDetail: 'order/detail',
    payBalance: 'pay/balance',
    userBalance: 'user/balance',
    userRecharge: 'user/recharge',
    addressList: 'address/list',
    addressDetail: 'address/detail',
    addressSave: 'address/save',
    addressDelete: 'address/delete',
    collectList: 'collect/list',
    collectToggle: 'collect/addordelete',
    footprintList: 'footprint/list',
    footprintDelete: 'footprint/delete',
    commentList: 'comment/list'
  };

  var tabRoutes = ['/home', '/topic', '/catalog', '/cart', '/me'];
  var app = document.getElementById('app');

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function saveSession(token, user) {
    state.token = token || '';
    state.user = user || null;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  function clearSession() {
    state.token = '';
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isWeChatBrowser() {
    return /MicroMessenger/i.test(navigator.userAgent || '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) {
      num = 0;
    }
    return '¥' + num.toFixed(2);
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

  function img(src, cls, alt) {
    if (!src) {
      return '<div class="' + cls + '"></div>';
    }
    return '<img class="' + cls + '" src="' + escapeHtml(assetUrl(src)) + '" alt="' + escapeHtml(alt || '') + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  }

  function channelIcon(item) {
    return CHANNEL_ICONS[item.id] || item.icon_url || '';
  }

  function channelCategoryId(item) {
    if (CHANNEL_CATEGORY_IDS[item.id]) {
      return CHANNEL_CATEGORY_IDS[item.id];
    }
    var match = String(item.url || '').match(/[?&]id=(\d+)/);
    return match ? match[1] : (item.category_id || item.id || 0);
  }

  function toast(message) {
    var el = document.getElementById('toast');
    el.textContent = message || '操作失败';
    el.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () {
      el.hidden = true;
    }, 2200);
  }

  function parseHash() {
    var hash = window.location.hash.replace(/^#/, '') || '/home';
    if (hash.charAt(0) !== '/') {
      hash = '/' + hash;
    }
    var parts = hash.split('?');
    var params = {};
    new URLSearchParams(parts[1] || '').forEach(function (value, key) {
      params[key] = value;
    });
    state.route = parts[0] || '/home';
    state.params = params;
  }

  function buildHash(route, params) {
    var query = new URLSearchParams(params || {}).toString();
    return '#' + route + (query ? '?' + query : '');
  }

  function go(route, params) {
    window.location.hash = buildHash(route, params);
  }

  function back() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      go('/home');
    }
  }

  function request(path, options) {
    options = options || {};
    var method = options.method || 'GET';
    var query = options.query || {};
    var url = API_ROOT + path;
    var queryText = new URLSearchParams(query).toString();
    if (queryText) {
      url += '?' + queryText;
    }
    var headers = { 'Content-Type': 'application/json' };
    if (state.token) {
      headers['X-Nideshop-Token'] = state.token;
    }
    var fetchOptions = { method: method, headers: headers };
    if (method !== 'GET' && options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }
    return fetch(url, fetchOptions).then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return res.json();
    }).then(function (payload) {
      if (payload && payload.errno === 401) {
        localStorage.setItem(RETURN_KEY, window.location.hash || '#/home');
        clearSession();
        if (isWeChatBrowser()) {
          startWechatAuth(window.location.hash || '#/me');
        } else {
          go('/login');
        }
        throw new Error(payload.errmsg || '请先登录');
      }
      if (payload && payload.errno && payload.errno !== 0) {
        throw new Error(payload.errmsg || '接口请求失败');
      }
      return payload ? payload.data : null;
    });
  }

  function upload(path, fieldName, file) {
    var form = new FormData();
    form.append(fieldName, file);
    var headers = {};
    if (state.token) {
      headers['X-Nideshop-Token'] = state.token;
    }
    return fetch(API_ROOT + path, {
      method: 'POST',
      headers: headers,
      body: form
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return res.json();
    }).then(function (payload) {
      if (payload && payload.errno === 401) {
        localStorage.setItem(RETURN_KEY, window.location.hash || '#/home');
        clearSession();
        if (isWeChatBrowser()) {
          startWechatAuth(window.location.hash || '#/me');
        } else {
          go('/login');
        }
        throw new Error(payload.errmsg || '请先登录');
      }
      if (payload && payload.errno && payload.errno !== 0) {
        throw new Error(payload.errmsg || '上传失败');
      }
      return payload ? payload.data : null;
    });
  }

  function shell(content, opts) {
    opts = opts || {};
    var showTab = tabRoutes.indexOf(state.route) >= 0;
    app.className = 'app-shell' + (showTab ? '' : ' no-tab');
    var topbar = opts.title ? [
      '<div class="topbar">',
      '<button class="icon-btn" onclick="App.back()" aria-label="返回">‹</button>',
      '<div class="topbar-title">', escapeHtml(opts.title), '</div>',
      opts.action || '<span class="icon-btn"></span>',
      '</div>'
    ].join('') : '';
    app.innerHTML = topbar + content + (showTab ? tabbar() : '');
  }

  function loading(title) {
    shell('<div class="loading">' + escapeHtml(title || '加载中...') + '</div>', { title: pageTitle(state.route) });
  }

  function errorView(message, title) {
    shell('<div class="error">' + escapeHtml(message || '页面加载失败') + '</div>', { title: title || pageTitle(state.route) });
  }

  function pageTitle(route) {
    return {
      '/home': '首页',
      '/topic': '专题',
      '/catalog': '分类',
      '/cart': '购物车',
      '/me': '我的',
      '/search': '搜索',
      '/list': '商品列表',
      '/goods': '商品详情',
      '/brand': '品牌',
      '/brand-detail': '品牌详情',
      '/topic-detail': '专题详情',
      '/login': '登录',
      '/register': '注册',
      '/reset-password': '忘记密码',
      '/profile': '个人资料',
      '/checkout': '结算',
      '/pay': '支付订单',
      '/recharge': '充值卡',
      '/address': '收货地址',
      '/address-edit': '编辑地址',
      '/orders': '我的订单',
      '/order-detail': '订单详情',
      '/collect': '我的收藏',
      '/footprint': '浏览足迹'
    }[route] || 'NideShop';
  }

  function tabbar() {
    var tabs = [
      ['/home', '首页', 'ic_menu_choice'],
      ['/topic', '专题', 'ic_menu_topic'],
      ['/catalog', '分类', 'ic_menu_sort'],
      ['/cart', '购物车', 'ic_menu_shoping'],
      ['/me', '我的', 'ic_menu_me']
    ];
    return '<nav class="tabbar">' + tabs.map(function (tab) {
      var active = state.route === tab[0];
      var icon = STATIC_IMG + tab[2] + (active ? '_pressed.png' : '_nor.png');
      return '<a class="' + (active ? 'active' : '') + '" href="' + buildHash(tab[0]) + '">' +
        '<img src="' + icon + '" alt="">' +
        '<span>' + tab[1] + '</span>' +
        '</a>';
    }).join('') + '</nav>';
  }

  function productCard(item) {
    return '<a class="product-card" href="' + buildHash('/goods', { id: item.id }) + '">' +
      '<div class="product-thumb">' + img(item.list_pic_url || item.primary_pic_url, 'product-img', item.name) + '</div>' +
      '<div class="product-name">' + escapeHtml(item.name) + '</div>' +
      '<div class="price">' + money(item.retail_price || item.price_info || item.floor_price) + '</div>' +
      '</a>';
  }

  function empty(text) {
    return '<div class="empty">' + escapeHtml(text || '暂无数据') + '</div>';
  }

  async function renderHome() {
    shell('<div class="search-band"><input class="search-input" readonly onclick="App.go(\'/search\')" value="商品搜索"></div><div class="loading">加载中...</div>');
    try {
      var data = await request(endpoints.home);
      var count = await request(endpoints.goodsCount).catch(function () { return { goodsCount: 0 }; });
      var banner = (data.banner || [])[0] || {};
      var content = [
        '<div class="search-band"><input class="search-input" readonly onclick="App.go(\'/search\')" value="商品搜索，共' + escapeHtml(count.goodsCount || 0) + '款好物"></div>',
        '<div class="banner">' + img(banner.image_url, 'hero-img', banner.name) + '</div>',
        renderChannels(data.channel || []),
        renderBrandSection(data.brandList || []),
        renderGoodsSection('新品首发', data.newGoodsList || []),
        renderHotSection(data.hotGoodsList || []),
        renderTopicRail(data.topicList || []),
        (data.categoryList || []).map(function (category) {
          return renderGoodsSection(category.name, category.goodsList || []);
        }).join('')
      ].join('');
      shell(content);
    } catch (err) {
      errorView(err.message, '首页');
    }
  }

  function renderChannels(items) {
    if (!items.length) return '';
    return '<div class="channel-row">' + items.map(function (item) {
      return '<a class="channel-item" href="' + buildHash('/list', { categoryId: channelCategoryId(item) }) + '">' +
        img(channelIcon(item), 'channel-icon', item.name) + '<span>' + escapeHtml(item.name) + '</span></a>';
    }).join('') + '</div>';
  }

  function renderBrandSection(items) {
    if (!items.length) return '';
    return '<section class="page-section"><div class="section-head" onclick="App.go(\'/brand\')">品牌制造商直供</div>' +
      '<div class="brand-grid">' + items.map(function (item) {
        return '<a class="brand-card" href="' + buildHash('/brand-detail', { id: item.id }) + '">' +
          img(item.new_pic_url || item.pic_url, 'brand-img', item.name) +
          '<div class="meta"><div>' + escapeHtml(item.name) + '</div><div class="small light">' + money(item.floor_price) + '起</div></div>' +
          '</a>';
      }).join('') + '</div></section>';
  }

  function renderGoodsSection(title, items) {
    if (!items.length) return '';
    return '<section class="page-section"><div class="section-head">' + escapeHtml(title) + '</div>' +
      '<div class="product-grid">' + items.map(productCard).join('') + '</div></section>';
  }

  function renderHotSection(items) {
    if (!items.length) return '';
    return '<section class="page-section"><div class="section-head" onclick="App.go(\'/list\', { isHot: 1 })">人气推荐</div>' +
      '<div class="hot-list">' + items.map(function (item) {
        return '<a class="hot-item" href="' + buildHash('/goods', { id: item.id }) + '">' +
          '<div class="hot-thumb">' + img(item.list_pic_url, 'product-img', item.name) + '</div>' +
          '<div class="item-body"><div class="line-clamp">' + escapeHtml(item.name) + '</div>' +
          '<div class="small light line-clamp">' + escapeHtml(item.goods_brief || '') + '</div>' +
          '<div class="price" style="text-align:left">' + money(item.retail_price) + '</div></div></a>';
      }).join('') + '</div></section>';
  }

  function sanitizeRichHtml(html) {
    if (!html) return '';
    return String(html)
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/(src|href)=(["'])\/\//gi, '$1=$2https://')
      .replace(/(src|href)=\/\//gi, '$1=https://')
      .replace(/\son\w+=(["']).*?\1/gi, '')
      .replace(/\s(href|src)=(["'])javascript:[\s\S]*?\2/gi, ' $1="#"')
      .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"')
      .replace(/<img\b(?![^>]*\balt=)/gi, '<img alt=""');
  }

  function renderRichContent(html, className) {
    var content = sanitizeRichHtml(html);
    if (!content) return '';
    return '<section class="rich-html ' + (className || '') + '">' + content + '</section>';
  }

  function absoluteImageUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    return url;
  }

  function renderTopicIntro(topic) {
    var rawContent = topic.content || '';
    var hasImage = /<img[\s>]/i.test(rawContent);
    if (rawContent && hasImage) {
      return renderRichContent(rawContent, 'topic-detail-rich topic-photo-intro');
    }
    var cover = absoluteImageUrl(topic.scene_pic_url || topic.item_pic_url || topic.avatar || '');
    var fallback = [
      cover ? '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(topic.title || '') + '">' : '',
      '<div class="topic-copy-block">',
      '<h1>' + escapeHtml(topic.title || '') + '</h1>',
      topic.subtitle ? '<p>' + escapeHtml(topic.subtitle) + '</p>' : '',
      rawContent ? sanitizeRichHtml(rawContent) : '',
      '</div>'
    ].join('');
    return renderRichContent(fallback, 'topic-detail-rich topic-photo-intro');
  }

  function renderDividerTitle(title) {
    return '<div class="detail-divider"><span></span><strong>' + escapeHtml(title) + '</strong></div>';
  }

  function renderGallery(gallery, info) {
    var items = gallery && gallery.length ? gallery : [{ img_url: info.primary_pic_url || info.list_pic_url }];
    return '<div class="goods-gallery">' + items.map(function (item) {
      return '<div class="goods-gallery-slide">' + img(item.img_url || item.url, 'hero-img', info.name) + '</div>';
    }).join('') + '</div>';
  }

  function renderServicePolicy() {
    return '<div class="service-policy"><span>30天无忧退货</span><span>48小时快速退款</span><span>满88元免邮费</span></div>';
  }

  function renderCommentPreview(comment, goodsId) {
    if (!comment || !comment.count) return '';
    var data = comment.data || {};
    return '<section class="comments-block">' +
      '<a class="comments-head" href="' + buildHash('/comments', { valueId: goodsId, typeId: 0 }) + '"><span>评价(' + (comment.count > 999 ? '999+' : comment.count) + ')</span><span>查看全部 ›</span></a>' +
      '<div class="comment-item"><div class="comment-meta"><div class="comment-user">' + img(data.avatar, 'avatar-img', data.nickname) + '<span>' + escapeHtml(data.nickname || '用户') + '</span></div><span class="small light">' + escapeHtml(data.add_time || '') + '</span></div>' +
      '<div class="comment-text">' + escapeHtml(data.content || '') + '</div>' +
      '<div class="comment-pics">' + ((data.pic_list || []).map(function (pic) {
        return img(pic.pic_url, 'comment-pic', '');
      }).join('')) + '</div></div></section>';
  }

  function renderCommonProblem(items) {
    if (!items || !items.length) return '';
    return '<section class="common-problem">' + renderDividerTitle('常见问题') +
      '<div class="problem-body">' + items.map(function (issue) {
        return '<div class="problem-item"><div class="problem-q"><span></span><strong>' + escapeHtml(issue.question) + '</strong></div><div class="problem-a">' + escapeHtml(issue.answer) + '</div></div>';
      }).join('') + '</div></section>';
  }

  function renderTopicRail(items) {
    if (!items.length) return '';
    return '<section class="page-section"><div class="section-head" onclick="App.go(\'/topic\')">专题精选</div>' +
      '<div class="topic-rail">' + items.map(topicCard).join('') + '</div></section>';
  }

  function topicCard(item) {
    return '<a class="topic-card" href="' + buildHash('/topic-detail', { id: item.id }) + '">' +
      '<div class="topic-thumb">' + img(item.scene_pic_url || item.item_pic_url, 'topic-img', item.title) + '</div>' +
      '<div style="margin-top:8px">' + escapeHtml(item.title || item.name) + ' <span class="price" style="display:inline;text-align:left">' + money(item.price_info) + '起</span></div>' +
      '<div class="small light line-clamp">' + escapeHtml(item.subtitle || '') + '</div></a>';
  }

  async function renderCatalog(selectedId) {
    shell('<div class="loading">加载中...</div>');
    try {
      var data = await request(endpoints.catalog, { query: selectedId ? { id: selectedId } : {} });
      var nav = data.categoryList || [];
      var current = data.currentCategory || {};
      var content = '<div class="catalog"><aside class="catalog-nav">' + nav.map(function (item) {
        return '<button class="' + (item.id === current.id ? 'active' : '') + '" onclick="App.renderCatalog(' + item.id + ')">' + escapeHtml(item.name) + '</button>';
      }).join('') + '</aside><main class="catalog-main">' +
        '<div class="banner">' + img(current.wap_banner_url || current.banner_url, 'hero-img', current.name) + '</div>' +
        '<div class="section-head">' + escapeHtml(current.name || '分类') + '</div>' +
        '<div class="sub-grid">' + (current.subCategoryList || []).map(function (item) {
          return '<a class="sub-item" href="' + buildHash('/list', { categoryId: item.id }) + '">' +
            img(item.wap_banner_url || item.banner_url || item.icon_url, '', item.name) + '<div>' + escapeHtml(item.name) + '</div></a>';
        }).join('') + '</div></main></div>';
      shell(content);
    } catch (err) {
      errorView(err.message, '分类');
    }
  }

  async function renderTopic() {
    loading('加载专题...');
    try {
      var data = await request(endpoints.topicList, { query: { page: 1, size: 20 } });
      var list = data.data || data.topicList || [];
      shell('<section class="page-section" style="margin-top:0;padding-top:14px"><div class="topic-rail" style="display:block;overflow:visible">' +
        list.map(function (item) {
          return '<div style="margin-bottom:16px">' + topicCard(item) + '</div>';
        }).join('') + '</div></section>');
    } catch (err) {
      errorView(err.message, '专题');
    }
  }

  async function renderList(extra) {
    var query = Object.assign({ page: 1, size: 20, sort: 'default', order: 'desc' }, state.params, extra || {});
    loading('加载商品...');
    try {
      var data = await request(endpoints.goodsList, { query: query });
      var list = data.goodsList || data.data || [];
      var title = query.keyword ? '搜索：' + query.keyword : (query.isNew ? '新品首发' : (query.isHot ? '人气推荐' : '商品列表'));
      var content = '<div class="filter-bar">' +
        '<button class="' + (query.sort !== 'price' ? 'active' : '') + '" onclick="App.listSort(\'default\')">综合</button>' +
        '<button class="' + (query.sort === 'price' ? 'active' : '') + '" onclick="App.listSort(\'price\')">价格</button>' +
        '<button onclick="App.go(\'/search\')">搜索</button></div>' +
        (list.length ? '<section class="page-section" style="margin-top:0;padding-top:14px"><div class="product-grid">' + list.map(productCard).join('') + '</div></section>' : empty('没有找到商品'));
      shell(content, { title: title });
    } catch (err) {
      errorView(err.message, '商品列表');
    }
  }

  function listSort(sort) {
    var params = Object.assign({}, state.params);
    params.sort = sort;
    if (sort === 'price') {
      params.order = state.priceOrder === 'asc' ? 'desc' : 'asc';
      state.priceOrder = params.order;
    } else {
      params.order = 'desc';
    }
    go('/list', params);
  }

  async function renderSearch() {
    loading('加载搜索...');
    try {
      var data = await request(endpoints.searchIndex);
      var hot = data.hotKeywordList || [];
      var history = data.historyKeywordList || [];
      var content = '<form class="search-band" onsubmit="App.submitSearch(event)">' +
        '<input id="searchKeyword" class="search-input" placeholder="' + escapeHtml((data.defaultKeyword || {}).keyword || '商品搜索') + '">' +
        '<button class="btn" style="min-height:34px">搜索</button></form>' +
        renderKeywordBlock('热门搜索', hot.map(function (v) { return v.keyword || v; })) +
        renderKeywordBlock('历史记录', history);
      shell(content, { title: '搜索' });
    } catch (err) {
      errorView(err.message, '搜索');
    }
  }

  function renderKeywordBlock(title, words) {
    if (!words || !words.length) return '';
    return '<section class="page-section"><div class="section-head">' + title + '</div><div style="padding:0 15px 16px;display:flex;flex-wrap:wrap;gap:8px">' +
      words.map(function (word) {
        return '<button class="chip" onclick="App.searchWord(\'' + encodeURIComponent(word) + '\')">' + escapeHtml(word) + '</button>';
      }).join('') + '</div></section>';
  }

  function submitSearch(event) {
    event.preventDefault();
    var value = document.getElementById('searchKeyword').value.trim();
    if (value) {
      go('/list', { keyword: value, page: 1, size: 20 });
    }
  }

  function searchWord(word) {
    go('/list', { keyword: decodeURIComponent(word), page: 1, size: 20 });
  }

  async function renderGoods() {
    var id = state.params.id;
    if (!id) {
      errorView('缺少商品 id', '商品详情');
      return;
    }
    app.className = 'app-shell no-tab';
    app.innerHTML = '<div class="loading">加载商品...</div>';
    try {
      var data = await request(endpoints.goodsDetail, { query: { id: id } });
      var related = await request(endpoints.goodsRelated, { query: { id: id } }).catch(function () { return { goodsList: [] }; });
      var cartCount = 0;
      if (state.token) {
        var cartData = await request(endpoints.cart).catch(function () { return null; });
        cartCount = Number((((cartData || {}).cartTotal || {}).goodsCount) || 0);
      }
      state.currentProduct = data;
      state.selectedSpecs = {};
      state.detailNumber = 1;
      var info = data.info || {};
      var content = [
        renderGallery(data.gallery || [], info),
        renderServicePolicy(),
        '<section class="goods-info-panel">',
        '<h1>' + escapeHtml(info.name) + '</h1>',
        '<div class="light">' + escapeHtml(info.goods_brief || '') + '</div>',
        '<div class="price">' + money(info.retail_price) + '</div>',
        (data.brand && data.brand.name ? '<a class="brand-pill" href="' + buildHash('/brand-detail', { id: data.brand.id || data.brand.brandId }) + '">' + escapeHtml(data.brand.name) + ' ›</a>' : ''),
        '</section>',
        '<button class="section-nav-row" onclick="App.openSku()"><span>请选择规格数量</span><span>›</span></button>',
        renderCommentPreview(data.comment, info.id),
        renderAttributes(data.attribute || []),
        renderRichContent(info.goods_desc, 'goods-detail-rich'),
        renderCommonProblem(data.issue || []),
        '<section class="related-goods-html">' + renderDividerTitle('大家都在看') + '<div class="product-grid">' + ((related.goodsList || []).map(productCard).join('')) + '</div></section>',
        '<div class="detail-action goods-action-bar">' +
        '<button class="goods-action-icon" onclick="App.toggleCollect()"><span class="collect-symbol">☆</span><small>收藏</small></button>' +
        '<a class="goods-action-icon cart-entry" href="' + buildHash('/cart') + '"><img src="assets/images/ic_menu_shoping_nor.png" alt="">' + (cartCount ? '<em>' + (cartCount > 99 ? '99+' : cartCount) + '</em>' : '') + '<small>购物车</small></a>' +
        '<button class="buy-action" onclick="App.openSku(\'buy\')">立即购买</button>' +
        '<button class="cart-action" onclick="App.openSku(\'cart\')">加入购物车</button>' +
        '</div>'
      ].join('');
      app.innerHTML = content;
    } catch (err) {
      errorView(err.message, '商品详情');
    }
  }

  function renderAttributes(items) {
    if (!items.length) return '';
    return '<section class="goods-attr-html"><div class="goods-attr-title">商品参数</div><div>' + items.map(function (item) {
      return '<div class="attr-row"><span>' + escapeHtml(item.name) + '</span><strong>' + escapeHtml(item.value) + '</strong></div>';
    }).join('') + '</div></section>';
  }

  function openSku(action) {
    var data = state.currentProduct;
    if (!data) return;
    state.skuAction = action === 'buy' ? 'buy' : 'cart';
    var info = data.info || {};
    var specs = data.specificationList || [];
    var actionText = state.skuAction === 'buy' ? '立即购买' : '加入购物车';
    var sheet = document.createElement('div');
    sheet.className = 'sheet-mask';
    sheet.id = 'skuMask';
    sheet.innerHTML = '<div class="sku-sheet"><div class="hot-item" style="border:0;padding-top:0">' +
      '<div class="hot-thumb">' + img(info.list_pic_url || info.primary_pic_url, 'product-img', info.name) + '</div>' +
      '<div class="item-body"><div>' + escapeHtml(info.name) + '</div><div class="price" style="text-align:left">' + money(info.retail_price) + '</div><div id="skuText" class="small light">请选择规格</div></div></div>' +
      specs.map(function (group) {
        return '<div class="spec-group"><div>' + escapeHtml(group.name || group.specification_name || '规格') + '</div><div class="spec-values">' +
          (group.valueList || []).map(function (value) {
            return '<button class="chip" data-spec="' + group.specification_id + '" data-value="' + value.id + '" onclick="App.pickSpec(this)">' + escapeHtml(value.value) + '</button>';
          }).join('') + '</div></div>';
      }).join('') +
      '<div class="spec-group"><div>数量</div><div class="qty" style="margin-top:8px"><button onclick="App.changeDetailNumber(-1)">-</button><span id="detailNumber">1</span><button onclick="App.changeDetailNumber(1)">+</button></div></div>' +
      '<button class="btn full-btn" style="margin-top:18px" onclick="App.confirmAddCart()">' + actionText + '</button></div>';
    sheet.addEventListener('click', function (event) {
      if (event.target === sheet) closeSku();
    });
    document.body.appendChild(sheet);
  }

  function closeSku() {
    var mask = document.getElementById('skuMask');
    if (mask) mask.remove();
  }

  function pickSpec(button) {
    var specId = button.getAttribute('data-spec');
    var valueId = button.getAttribute('data-value');
    state.selectedSpecs[specId] = valueId;
    var siblings = button.parentNode.querySelectorAll('.chip');
    Array.prototype.forEach.call(siblings, function (el) { el.classList.remove('active'); });
    button.classList.add('active');
    var selectedText = Array.prototype.map.call(document.querySelectorAll('.spec-values .active'), function (el) {
      return el.textContent;
    }).join(' ');
    var text = document.getElementById('skuText');
    if (text) text.textContent = selectedText || '请选择规格';
  }

  function changeDetailNumber(delta) {
    state.detailNumber = Math.max(1, state.detailNumber + delta);
    var el = document.getElementById('detailNumber');
    if (el) el.textContent = state.detailNumber;
  }

  async function confirmAddCart() {
    var data = state.currentProduct;
    var info = data.info || {};
    var specs = data.specificationList || [];
    var ids = specs.map(function (group) {
      return state.selectedSpecs[group.specification_id];
    });
    if (ids.some(function (id) { return !id; })) {
      toast('请选择完整规格');
      return;
    }
    var key = ids.join('_');
    var product = (data.productList || []).filter(function (item) {
      return item.goods_specification_ids === key;
    })[0];
    if (!product || Number(product.goods_number) < state.detailNumber) {
      toast('库存不足');
      return;
    }
    try {
      var cartData = null;
      var existingCartItem = null;
      if (state.skuAction === 'buy') {
        cartData = await request(endpoints.cart).catch(function () { return null; });
        var currentIds = ((cartData || {}).cartList || []).map(function (item) {
          return item.product_id;
        }).filter(Boolean);
        existingCartItem = ((cartData || {}).cartList || []).filter(function (item) {
          return Number(item.product_id) === Number(product.id);
        })[0];
        if (currentIds.length) {
          await request(endpoints.cartChecked, {
            method: 'POST',
            body: { productIds: currentIds.join(','), isChecked: 0 }
          });
        }
      }
      if (state.skuAction === 'buy' && existingCartItem) {
        await request(endpoints.cartUpdate, {
          method: 'POST',
          body: { id: existingCartItem.id, goodsId: info.id, productId: product.id, number: state.detailNumber }
        });
      } else {
        await request(endpoints.cartAdd, {
          method: 'POST',
          body: { goodsId: info.id, productId: product.id, number: state.detailNumber }
        });
      }
      if (state.skuAction === 'buy') {
        await request(endpoints.cartChecked, {
          method: 'POST',
          body: { productIds: String(product.id), isChecked: 1 }
        });
        closeSku();
        go('/checkout');
        return;
      }
      toast('添加成功');
      closeSku();
    } catch (err) {
      toast(err.message);
    }
  }

  async function toggleCollect() {
    var data = state.currentProduct;
    var info = data && data.info ? data.info : {};
    if (!info.id) return;
    try {
      var result = await request(endpoints.collectToggle, {
        method: 'POST',
        body: { typeId: 0, valueId: info.id }
      });
      toast(result && result.type === 'add' ? '收藏成功' : '已取消收藏');
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderCart() {
    shell('<div class="loading">加载购物车...</div>');
    try {
      var data = await request(endpoints.cart);
      var rows = data.cartList || [];
      var total = data.cartTotal || {};
      var content = rows.length ? '<section class="page-section" style="margin-top:0;padding:0 12px">' + rows.map(function (item) {
        return '<div class="cart-row"><button class="checkbox ' + (item.checked ? 'active' : '') + '" onclick="App.checkCart(\'' + item.product_id + '\',' + (item.checked ? 0 : 1) + ')"></button>' +
          '<div class="cart-thumb">' + img(item.list_pic_url, 'product-img', item.goods_name) + '</div>' +
          '<div class="item-body"><div class="line-clamp">' + escapeHtml(item.goods_name) + '</div><div class="small light">' + escapeHtml(item.goods_specifition_name_value || '') + '</div>' +
          '<div class="price" style="text-align:left">' + money(item.retail_price) + '</div><div class="split-actions" style="align-items:center;margin-top:8px"><div class="qty"><button onclick="App.updateCart(' + item.id + ',' + item.goods_id + ',' + item.product_id + ',' + Math.max(1, item.number - 1) + ')">-</button><span>' + item.number + '</span><button onclick="App.updateCart(' + item.id + ',' + item.goods_id + ',' + item.product_id + ',' + (Number(item.number) + 1) + ')">+</button></div><button class="chip" onclick="App.deleteCart(\'' + item.product_id + '\')">删除</button></div></div></div>';
      }).join('') + '</section><div class="checkout-bar"><div class="total">已选 ' + escapeHtml(total.checkedGoodsCount || 0) + ' 件 <span class="price">' + money(total.checkedGoodsAmount) + '</span></div><button class="btn" onclick="App.go(\'/checkout\')">结算</button></div>' : empty('购物车还是空的');
      shell(content);
    } catch (err) {
      errorView(err.message, '购物车');
    }
  }

  async function checkCart(productIds, isChecked) {
    try {
      await request(endpoints.cartChecked, { method: 'POST', body: { productIds: productIds, isChecked: isChecked } });
      renderCart();
    } catch (err) {
      toast(err.message);
    }
  }

  async function updateCart(id, goodsId, productId, number) {
    try {
      await request(endpoints.cartUpdate, { method: 'POST', body: { id: id, goodsId: goodsId, productId: productId, number: number } });
      renderCart();
    } catch (err) {
      toast(err.message);
    }
  }

  async function deleteCart(productIds) {
    try {
      await request(endpoints.cartDelete, { method: 'POST', body: { productIds: productIds } });
      renderCart();
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderAuth(mode) {
    var isRegister = mode === 'register';
    var content = '<form class="form" onsubmit="App.submitAuth(event,\'' + mode + '\')">' +
      '<div class="form-row"><input id="authUsername" class="form-input" autocomplete="username" placeholder="' + (isRegister ? '用户名' : '用户名或手机号') + '"></div>' +
      (isRegister ? '<div class="form-row"><input id="authMobile" class="form-input" inputmode="numeric" placeholder="手机号"></div>' : '') +
      '<div class="form-row"><input id="authPassword" class="form-input" type="password" autocomplete="' + (isRegister ? 'new-password' : 'current-password') + '" placeholder="密码"></div>' +
      '<button class="btn full-btn">' + (isRegister ? '注册' : '登录') + '</button>' +
      '<div class="split-actions" style="margin-top:14px"><a class="btn ghost" href="' + buildHash(isRegister ? '/login' : '/register') + '">' + (isRegister ? '已有账号' : '注册账号') + '</a><a class="btn muted-btn" href="' + buildHash(isRegister ? '/home' : '/reset-password') + '">' + (isRegister ? '先逛逛' : '忘记密码') + '</a></div></form>';
    shell(content, { title: isRegister ? '注册' : '登录' });
  }

  async function startWechatAuth(redirect) {
    try {
      redirect = redirect || localStorage.getItem(RETURN_KEY) || '#/me';
      if (redirect.charAt(0) !== '#') {
        redirect = '#' + redirect;
      }
      localStorage.setItem(RETURN_KEY, redirect);
      var data = await request(endpoints.wechatOauthUrl, {
        query: { redirect: redirect }
      });
      if (!data || !data.url) {
        toast('公众号入口生成失败');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      toast(err.message);
    }
  }

  async function submitAuth(event, mode) {
    event.preventDefault();
    var username = document.getElementById('authUsername').value.trim();
    var password = document.getElementById('authPassword').value;
    if (username.length < 3 || password.length < 3) {
      toast('账号和密码至少 3 位');
      return;
    }
    var body = { username: username, password: password };
    if (mode === 'register') {
      var mobile = document.getElementById('authMobile').value.trim();
      if (!/^1[3-9]\d{9}$/.test(mobile)) {
        toast('请输入正确的手机号');
        return;
      }
      body.mobile = mobile;
    }
    try {
      var data = await request(mode === 'register' ? endpoints.register : endpoints.login, {
        method: 'POST',
        body: body
      });
      saveSession(data.token, data.userInfo);
      toast(mode === 'register' ? '注册成功' : '登录成功');
      var target = localStorage.getItem(RETURN_KEY);
      localStorage.removeItem(RETURN_KEY);
      window.location.hash = target || '#/me';
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderResetPassword() {
    var content = '<form class="form" onsubmit="App.submitResetPassword(event)">' +
      '<div class="form-row"><input id="resetMobile" class="form-input" inputmode="numeric" placeholder="注册手机号"></div>' +
      '<div class="form-row"><input id="resetCode" class="form-input" inputmode="numeric" placeholder="验证码 666666"></div>' +
      '<div class="form-row"><input id="resetPassword" class="form-input" type="password" placeholder="新密码，至少 6 位"></div>' +
      '<div class="form-row"><input id="resetConfirmPassword" class="form-input" type="password" placeholder="确认新密码"></div>' +
      '<button class="btn full-btn">重置密码</button></form>';
    shell(content, { title: '忘记密码' });
  }

  async function submitResetPassword(event) {
    event.preventDefault();
    var mobile = document.getElementById('resetMobile').value.trim();
    var code = document.getElementById('resetCode').value.trim();
    var password = document.getElementById('resetPassword').value;
    var confirmPassword = document.getElementById('resetConfirmPassword').value;

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      toast('请输入正确的手机号');
      return;
    }
    if (code !== '666666') {
      toast('验证码错误');
      return;
    }
    if (password.length < 6) {
      toast('密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      toast('两次密码不一致');
      return;
    }

    try {
      await request(endpoints.resetPassword, {
        method: 'POST',
        body: { mobile: mobile, code: code, password: password }
      });
      toast('密码已重置');
      go('/login');
    } catch (err) {
      toast(err.message);
    }
  }

  async function getBalance() {
    if (!state.token) {
      return 0;
    }
    var data = await request(endpoints.userBalance);
    return Number((data || {}).balance || 0);
  }

  async function renderMe() {
    if (!state.token && isWeChatBrowser()) {
      loading('正在进入公众号个人中心...');
      startWechatAuth('#/me');
      return;
    }
    var logged = !!state.token;
    var balance = 0;
    var user = state.user || {};
    if (logged) {
      try {
        user = await request(endpoints.userInfo);
        updateLocalUser(user);
        balance = await getBalance();
      } catch (err) {
        balance = 0;
      }
    }
    var displayName = user.username || 'NideShop 用户';
    var avatarInitial = escapeHtml((displayName || '用').slice(0, 1));
    var avatarMarkup = logged && user.avatar
      ? img(user.avatar, 'me-avatar-img', displayName)
      : '<div class="me-avatar-img me-avatar-empty">' + (logged ? avatarInitial : '未') + '</div>';
    var content = '<section class="me-dashboard">' +
      '<div class="me-identity">' +
      avatarMarkup +
      '<div class="me-identity-main"><div class="profile-name">' + escapeHtml(logged ? displayName : '未登录') + '</div>' +
      '<div class="small me-subtitle">' + (logged ? '手机号 ' + escapeHtml(user.mobile || '未登记') : '登录后可同步购物车、地址和订单') + '</div>' +
      (logged && user.official_openid ? '<div class="small me-subtitle">已通过公众号登录</div>' : '') + '</div>' +
      (logged ? '<button class="chip" onclick="App.go(\'/profile\')">编辑</button>' : '') +
      '</div>' +
      (logged ? '<div class="me-metrics"><button onclick="App.go(\'/recharge\')"><span>' + money(balance) + '</span><small>充值卡余额</small></button><button onclick="App.go(\'/orders\')"><span>订单</span><small>购买记录</small></button><button onclick="App.go(\'/address\')"><span>地址</span><small>收货信息</small></button></div>' : '<button class="btn full-btn" style="margin-top:18px" onclick="App.go(\'/login\')">登录/注册</button>') +
      '</section>' +
      '<section class="menu-panel"><div class="menu-title">账户服务</div><div class="menu-list">' +
      '<a href="' + buildHash('/profile') + '">个人资料<span>›</span></a>' +
      '<a href="' + buildHash('/orders') + '">我的订单<span>›</span></a>' +
      '<a href="' + buildHash('/address') + '">收货地址<span>›</span></a>' +
      '<a href="' + buildHash('/collect') + '">我的收藏<span>›</span></a>' +
      '<a href="' + buildHash('/footprint') + '">浏览足迹<span>›</span></a>' +
      (logged ? '<button onclick="App.logout()">退出登录<span>›</span></button>' : '') +
      '</div></section>';
    shell(content);
  }

  function logout() {
    clearSession();
    toast('已退出');
    go('/me');
    render();
  }

  function updateLocalUser(user) {
    state.user = user || state.user;
    if (state.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    }
  }

  async function renderProfile() {
    if (!state.token && isWeChatBrowser()) {
      loading('正在进入公众号个人中心...');
      startWechatAuth('#/profile');
      return;
    }
    loading('加载资料...');
    try {
      var user = await request(endpoints.userInfo);
      updateLocalUser(user);
      var content = '<section class="profile-edit-head">' +
        img(user.avatar, 'profile-avatar-html', user.nickname || user.username) +
        '<div><strong>' + escapeHtml(user.nickname || user.username || '用户') + '</strong><div class="small light">用户名 ' + escapeHtml(user.username || '') + '</div></div>' +
        '</section>' +
        '<section class="form">' +
        '<div class="form-row"><input class="form-input" value="' + escapeHtml(user.username || '') + '" disabled></div>' +
        '<div class="form-row"><input class="form-input" value="' + escapeHtml(user.mobile || '') + '" disabled></div></section>' +
        '<form class="form profile-form-gap" onsubmit="App.submitPassword(event)">' +
        '<div class="form-row"><input id="profilePassword" class="form-input" type="password" placeholder="新密码，至少 6 位"></div>' +
        '<div class="form-row"><input id="profileConfirmPassword" class="form-input" type="password" placeholder="确认新密码"></div>' +
        '<button class="btn full-btn muted-btn">修改密码</button></form>' +
        '<form class="form profile-form-gap" onsubmit="App.submitAvatar(event)">' +
        '<div class="form-row"><input id="profileAvatar" class="form-input" type="file" accept="image/*"></div>' +
        '<button class="btn full-btn ghost">上传头像</button></form>';
      shell(content, { title: '个人资料' });
    } catch (err) {
      errorView(err.message, '个人资料');
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    var password = document.getElementById('profilePassword').value;
    var confirmPassword = document.getElementById('profileConfirmPassword').value;
    if (password.length < 6) {
      toast('密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      toast('两次密码不一致');
      return;
    }
    try {
      await request(endpoints.userPassword, {
        method: 'POST',
        body: { password: password }
      });
      toast('密码已修改');
      renderProfile();
    } catch (err) {
      toast(err.message);
    }
  }

  async function submitAvatar(event) {
    event.preventDefault();
    var input = document.getElementById('profileAvatar');
    var file = input && input.files ? input.files[0] : null;
    if (!file) {
      toast('请选择头像图片');
      return;
    }
    try {
      var user = await upload(endpoints.userAvatar, 'avatar', file);
      updateLocalUser(user);
      toast('头像已更新');
      renderProfile();
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderCheckout() {
    loading('加载结算...');
    try {
      var addressId = localStorage.getItem(ADDRESS_KEY) || '';
      var data = await request(endpoints.cartCheckout, { query: { addressId: addressId, couponId: 0 } });
      var address = data.checkedAddress || {};
      var goods = data.checkedGoodsList || [];
      var content = '<section class="page-section" style="margin-top:0;padding:14px 15px" onclick="App.go(\'/address\',{ checkout: 1 })">' +
        (address.id ? '<strong>' + escapeHtml(address.name) + ' ' + escapeHtml(address.mobile) + '</strong><div class="small light">' + escapeHtml((address.full_region || '') + address.address) + '</div>' : '<div class="muted">请选择收货地址</div>') +
        '</section><section class="page-section" style="padding:0 12px">' + (goods.length ? goods.map(function (item) {
          return '<div class="order-row"><div class="order-thumb">' + img(item.list_pic_url, 'product-img', item.goods_name) + '</div><div class="item-body"><div>' + escapeHtml(item.goods_name) + '</div><div class="small light">x' + item.number + '</div><div class="price" style="text-align:left">' + money(item.retail_price) + '</div></div></div>';
        }).join('') : empty('没有选中的商品')) + '</section>' +
        '<section class="page-section" style="padding:14px 15px"><div>商品合计 <span class="price" style="float:right">' + money(data.goodsTotalPrice) + '</span></div><div>运费 <span style="float:right">' + money(data.freightPrice) + '</span></div><div>应付 <span class="price" style="float:right">' + money(data.actualPrice) + '</span></div></section>' +
        '<div class="detail-action" style="grid-template-columns:1fr 140px"><div style="display:grid;align-items:center;padding-left:14px">实付 <span class="price" style="text-align:left">' + money(data.actualPrice) + '</span></div><button class="primary" onclick="App.submitOrder()">提交订单</button></div>';
      shell(content, { title: '结算' });
    } catch (err) {
      errorView(err.message, '结算');
    }
  }

  async function submitOrder() {
    var addressId = localStorage.getItem(ADDRESS_KEY) || '';
    if (!addressId) {
      toast('请选择收货地址');
      return;
    }
    try {
      var data = await request(endpoints.orderSubmit, { method: 'POST', body: { addressId: addressId, couponId: 0 } });
      toast('下单成功');
      go('/pay', { id: data.orderInfo.id, amount: data.orderInfo.actual_price });
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderPay() {
    var id = state.params.id;
    if (!id) {
      errorView('订单不存在', '支付订单');
      return;
    }
    loading('加载支付方式...');
    try {
      var balance = await getBalance();
      var amount = Number(state.params.amount || 0);
      if (!amount) {
        var detail = await request(endpoints.orderDetail, { query: { orderId: id } });
        amount = Number((detail.orderInfo || {}).actual_price || 0);
      }
      var content = '<section class="page-section pay-summary-html"><div>订单金额</div><strong>' + money(amount) + '</strong></section>' +
        '<section class="page-section pay-methods-html">' +
        '<button class="pay-method active" onclick="App.payByBalance(' + Number(id) + ')"><span class="pay-radio"></span><span>充值卡余额</span><strong>' + money(balance) + '</strong></button>' +
        '<button class="pay-method" onclick="App.toast(\'微信支付入口已保留，请在小程序端继续使用\')"><span class="pay-radio"></span><span>微信支付</span><em>小程序可用</em></button>' +
        '</section>' +
        '<div class="detail-action" style="grid-template-columns:1fr 150px"><div style="display:grid;align-items:center;padding-left:14px">实付 <span class="price" style="text-align:left">' + money(amount) + '</span></div><button class="primary" onclick="App.payByBalance(' + Number(id) + ')">余额支付</button></div>';
      shell(content, { title: '支付订单' });
    } catch (err) {
      errorView(err.message, '支付订单');
    }
  }

  async function payByBalance(orderId) {
    try {
      await request(endpoints.payBalance, { method: 'POST', body: { orderId: orderId } });
      toast('支付成功');
      go('/order-detail', { id: orderId });
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderRecharge() {
    loading('加载充值卡...');
    try {
      var balance = await getBalance();
      var quick = [50, 100, 200, 500, 1000, 2000];
      var content = '<section class="wallet-hero-html"><div class="small">当前余额</div><strong>' + money(balance) + '</strong></section>' +
        '<form class="form recharge-form-html" onsubmit="App.submitRecharge(event)">' +
        '<div class="form-row"><input id="rechargeAmount" class="form-input" inputmode="decimal" placeholder="请输入充值金额"></div>' +
        '<div class="recharge-grid-html">' + quick.map(function (amount) {
          return '<button type="button" class="chip" onclick="App.pickRechargeAmount(' + amount + ')">¥' + amount + '</button>';
        }).join('') + '</div>' +
        '<button class="btn full-btn" style="margin-top:16px">确认充值</button></form>';
      shell(content, { title: '充值卡' });
    } catch (err) {
      errorView(err.message, '充值卡');
    }
  }

  function pickRechargeAmount(amount) {
    var input = document.getElementById('rechargeAmount');
    if (input) {
      input.value = amount;
    }
  }

  async function submitRecharge(event) {
    event.preventDefault();
    var input = document.getElementById('rechargeAmount');
    var amount = Number(input ? input.value : 0);
    if (!amount || amount <= 0) {
      toast('请输入充值金额');
      return;
    }
    try {
      await request(endpoints.userRecharge, { method: 'POST', body: { amount: amount } });
      toast('充值成功');
      go('/me');
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderAddress() {
    loading('加载地址...');
    try {
      var data = await request(endpoints.addressList);
      var list = data || [];
      var checkout = state.params.checkout;
      var content = '<section class="page-section" style="margin-top:0;padding:0 15px">' + (list.length ? list.map(function (item) {
        return '<div class="address-row"><div class="item-body" onclick="App.pickAddress(' + item.id + ',' + (checkout ? 1 : 0) + ')"><strong>' + escapeHtml(item.name) + ' ' + escapeHtml(item.mobile) + '</strong><div class="small light">' + escapeHtml((item.full_region || '') + item.address) + '</div></div><button class="chip" onclick="App.go(\'/address-edit\',{ id:' + item.id + ' })">编辑</button></div>';
      }).join('') : empty('暂无收货地址')) + '</section><div style="padding:15px"><button class="btn full-btn" onclick="App.go(\'/address-edit\')">新增地址</button></div>';
      shell(content, { title: '收货地址' });
    } catch (err) {
      errorView(err.message, '收货地址');
    }
  }

  function pickAddress(id, checkout) {
    localStorage.setItem(ADDRESS_KEY, id);
    go(checkout ? '/checkout' : '/address');
  }

  async function renderAddressEdit() {
    var id = state.params.id;
    loading('加载地址...');
    try {
      var item = id ? await request(endpoints.addressDetail, { query: { id: id } }) : {};
      var content = '<form class="form" onsubmit="App.saveAddress(event,' + (id || 0) + ')">' +
        '<div class="form-row"><input id="addrName" class="form-input" placeholder="收货人" value="' + escapeHtml(item.name || '') + '"></div>' +
        '<div class="form-row"><input id="addrMobile" class="form-input" placeholder="手机号" value="' + escapeHtml(item.mobile || '') + '"></div>' +
        '<div class="split-actions"><input id="addrProvince" class="form-input" placeholder="省ID" value="' + escapeHtml(item.province_id || '') + '"><input id="addrCity" class="form-input" placeholder="市ID" value="' + escapeHtml(item.city_id || '') + '"><input id="addrDistrict" class="form-input" placeholder="区ID" value="' + escapeHtml(item.district_id || '') + '"></div>' +
        '<div class="form-row" style="margin-top:12px"><textarea id="addrDetail" class="form-textarea" placeholder="详细地址">' + escapeHtml(item.address || '') + '</textarea></div>' +
        '<button class="btn full-btn">保存地址</button></form>';
      shell(content, { title: id ? '编辑地址' : '新增地址' });
    } catch (err) {
      errorView(err.message, '编辑地址');
    }
  }

  async function saveAddress(event, id) {
    event.preventDefault();
    var body = {
      id: id || undefined,
      name: document.getElementById('addrName').value.trim(),
      mobile: document.getElementById('addrMobile').value.trim(),
      province_id: document.getElementById('addrProvince').value.trim(),
      city_id: document.getElementById('addrCity').value.trim(),
      district_id: document.getElementById('addrDistrict').value.trim(),
      address: document.getElementById('addrDetail').value.trim(),
      is_default: true
    };
    if (!body.name || !body.mobile || !body.address) {
      toast('请补全地址信息');
      return;
    }
    try {
      var saved = await request(endpoints.addressSave, { method: 'POST', body: body });
      localStorage.setItem(ADDRESS_KEY, saved.id);
      toast('保存成功');
      go('/address');
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderOrders() {
    if (!state.token && isWeChatBrowser()) {
      loading('正在进入公众号订单...');
      startWechatAuth('#/orders');
      return;
    }
    loading('加载订单...');
    try {
      var data = await request(endpoints.orderList);
      var list = data.data || [];
      var content = '<section class="page-section" style="margin-top:0;padding:0 15px">' + (list.length ? list.map(function (item) {
        return '<a class="order-row" href="' + buildHash('/order-detail', { id: item.id }) + '"><div class="item-body"><strong>订单 ' + escapeHtml(item.order_sn) + '</strong><div class="small light">' + escapeHtml(item.order_status_text || '') + '</div><div class="price" style="text-align:left">' + money(item.actual_price) + '</div></div><span>›</span></a>';
      }).join('') : empty('暂无订单')) + '</section>';
      shell(content, { title: '我的订单' });
    } catch (err) {
      errorView(err.message, '我的订单');
    }
  }

  async function renderOrderDetail() {
    if (!state.token && isWeChatBrowser()) {
      loading('正在进入公众号订单...');
      startWechatAuth(window.location.hash || '#/orders');
      return;
    }
    var id = state.params.id;
    loading('加载订单...');
    try {
      var data = await request(endpoints.orderDetail, { query: { orderId: id } });
      var info = data.orderInfo || {};
      var goods = data.orderGoods || [];
      var content = '<section class="page-section" style="margin-top:0;padding:14px 15px"><strong>' + escapeHtml(info.order_status_text || '订单') + '</strong><div class="small light">订单号 ' + escapeHtml(info.order_sn || '') + '</div></section>' +
        '<section class="page-section" style="padding:0 12px">' + goods.map(function (item) {
          return '<div class="order-row"><div class="order-thumb">' + img(item.list_pic_url, 'product-img', item.goods_name) + '</div><div class="item-body"><div>' + escapeHtml(item.goods_name) + '</div><div class="small light">x' + item.number + '</div><div class="price" style="text-align:left">' + money(item.retail_price) + '</div></div></div>';
        }).join('') + '</section><section class="page-section" style="padding:14px 15px">实付 <span class="price" style="float:right">' + money(info.actual_price) + '</span></section>';
      shell(content, { title: '订单详情' });
    } catch (err) {
      errorView(err.message, '订单详情');
    }
  }

  async function renderBrand() {
    loading('加载品牌...');
    try {
      var data = await request(endpoints.brandList, { query: { page: 1, size: 50 } });
      var list = data.data || data.brandList || [];
      shell('<section class="page-section" style="margin-top:0"><div class="brand-grid">' + list.map(function (item) {
        return '<a class="brand-card" href="' + buildHash('/brand-detail', { id: item.id }) + '">' + img(item.new_pic_url || item.pic_url || item.app_list_pic_url, 'brand-img', item.name) + '<div class="meta"><div>' + escapeHtml(item.name) + '</div><div class="small light">' + money(item.floor_price) + '起</div></div></a>';
      }).join('') + '</div></section>', { title: '品牌' });
    } catch (err) {
      errorView(err.message, '品牌');
    }
  }

  async function renderBrandDetail() {
    var id = state.params.id;
    loading('加载品牌...');
    try {
      var detail = await request(endpoints.brandDetail, { query: { id: id } });
      var goods = await request(endpoints.goodsList, { query: { brandId: id, page: 1, size: 20 } });
      var brand = detail.brand || detail;
      var list = goods.goodsList || goods.data || [];
      var content = '<div class="banner">' + img(brand.new_pic_url || brand.pic_url, 'hero-img', brand.name) + '</div>' +
        '<section class="page-section" style="margin-top:0;padding:16px 15px;text-align:center"><h1 style="margin:0 0 8px">' + escapeHtml(brand.name) + '</h1><div class="small light">' + escapeHtml(brand.simple_desc || '') + '</div></section>' +
        renderGoodsSection('品牌商品', list);
      shell(content, { title: brand.name || '品牌详情' });
    } catch (err) {
      errorView(err.message, '品牌详情');
    }
  }

  async function renderTopicDetail() {
    var id = state.params.id;
    loading('加载专题...');
    try {
      var data = await request(endpoints.topicDetail, { query: { id: id } });
      var related = await request(endpoints.topicRelated, { query: { id: id } }).catch(function () { return { topicList: [] }; });
      var comments = await request(endpoints.commentList, { query: { valueId: id, typeId: 1, size: 5 } }).catch(function () { return { data: [], count: 0 }; });
      var topic = data.topic || data;
      var relatedList = related.topicList || related || [];
      var content = renderTopicIntro(topic) +
        renderTopicComments(comments, id) +
        '<section class="topic-rec-html">' + renderDividerTitle('专题推荐') + '<div class="topic-rec-list">' + relatedList.map(function (item) {
          return '<a class="topic-rec-card" href="' + buildHash('/topic-detail', { id: item.id }) + '">' + img(item.scene_pic_url || item.item_pic_url, 'topic-img', item.title) + '<span>' + escapeHtml(item.title) + '</span></a>';
        }).join('') + '</div></section>';
      shell(content, { title: '专题详情' });
    } catch (err) {
      errorView(err.message, '专题详情');
    }
  }

  function renderTopicComments(comments, topicId) {
    var list = comments.data || [];
    return '<section class="topic-comments-html"><div class="comments-head"><span>精选留言</span><a href="' + buildHash('/comments', { valueId: topicId, typeId: 1 }) + '">更多 ›</a></div>' +
      (list.length ? '<div class="comments-list">' + list.map(function (item) {
        var user = item.user_info || {};
        return '<div class="comment-item"><div class="comment-meta"><div class="comment-user">' + img(user.avatar, 'avatar-img', user.nickname) + '<span>' + escapeHtml(user.nickname || user.username || '用户') + '</span></div><span class="small light">' + escapeHtml(item.add_time || '') + '</span></div><div class="comment-text">' + escapeHtml(item.content || '') + '</div></div>';
      }).join('') + '</div>' : '<div class="no-comments"><div class="empty">等你来留言</div></div>') + '</section>';
  }

  async function renderCommentsPage() {
    var valueId = state.params.valueId;
    var typeId = state.params.typeId || 0;
    loading('加载评论...');
    try {
      var comments = await request(endpoints.commentList, { query: { valueId: valueId, typeId: typeId, page: 1, size: 20 } });
      var list = comments.data || [];
      var content = '<section class="topic-comments-html" style="margin-top:0">' +
        (list.length ? '<div class="comments-list">' + list.map(function (item) {
          var user = item.user_info || {};
          return '<div class="comment-item"><div class="comment-meta"><div class="comment-user">' + img(user.avatar, 'avatar-img', user.nickname) + '<span>' + escapeHtml(user.nickname || user.username || '用户') + '</span></div><span class="small light">' + escapeHtml(item.add_time || '') + '</span></div><div class="comment-text">' + escapeHtml(item.content || '') + '</div><div class="comment-pics">' + ((item.pic_list || []).map(function (pic) { return img(pic.pic_url, 'comment-pic', ''); }).join('')) + '</div></div>';
        }).join('') + '</div>' : empty('暂无评论')) + '</section>';
      shell(content, { title: '评论' });
    } catch (err) {
      errorView(err.message, '评论');
    }
  }

  async function renderSimpleList(kind) {
    var config = {
      collect: { title: '我的收藏', endpoint: endpoints.collectList, query: { typeId: 0 } },
      footprint: { title: '浏览足迹', endpoint: endpoints.footprintList, query: {} }
    }[kind];
    loading('加载中...');
    try {
      var data = await request(config.endpoint, { query: config.query });
      var list = data.collectList || data.footprintList || data.data || data || [];
      var content;
      if (kind === 'footprint') {
        var groups = normalizeFootprintGroups(list);
        content = '<section class="page-section simple-list-section">' + (groups.length ? groups.map(function (group) {
          var dateText = group[0] ? group[0].add_time : '';
          return '<div class="footprint-day-html">' +
            '<div class="footprint-date-html">' + escapeHtml(dateText || '浏览记录') + '</div>' +
            group.map(renderGoodsListItem).join('') +
            '</div>';
        }).join('') : empty('暂无数据')) + '</section>';
      } else {
        content = '<section class="page-section simple-list-section">' + (list.length ? list.map(renderGoodsListItem).join('') : empty('暂无数据')) + '</section>';
      }
      shell(content, { title: config.title });
    } catch (err) {
      errorView(err.message, config.title);
    }
  }

  function normalizeFootprintGroups(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    if (!list.length) {
      return [];
    }
    return Array.isArray(list[0]) ? list.filter(function (group) {
      return group && group.length;
    }) : [list];
  }

  function renderGoodsListItem(item) {
    var goods = item.goods || item;
    var id = goods.goods_id || goods.value_id || goods.id;
    var name = goods.name || goods.goods_name || '商品';
    return '<a class="hot-item" href="' + buildHash('/goods', { id: id }) + '">' +
      '<div class="hot-thumb">' + img(goods.list_pic_url, 'product-img', name) + '</div>' +
      '<div class="item-body"><div>' + escapeHtml(name) + '</div>' +
      (goods.goods_brief ? '<div class="small light line-clamp">' + escapeHtml(goods.goods_brief) + '</div>' : '') +
      '<div class="price" style="text-align:left">' + money(goods.retail_price) + '</div></div></a>';
  }

  function render() {
    parseHash();
    if (state.route === '/') state.route = '/home';
    if (state.route === '/home') return renderHome();
    if (state.route === '/topic') return renderTopic();
    if (state.route === '/catalog') return renderCatalog();
    if (state.route === '/cart') return renderCart();
    if (state.route === '/me') return renderMe();
    if (state.route === '/search') return renderSearch();
    if (state.route === '/list') return renderList();
    if (state.route === '/goods') return renderGoods();
    if (state.route === '/brand') return renderBrand();
    if (state.route === '/brand-detail') return renderBrandDetail();
    if (state.route === '/topic-detail') return renderTopicDetail();
    if (state.route === '/comments') return renderCommentsPage();
    if (state.route === '/login') return renderAuth('login');
    if (state.route === '/register') return renderAuth('register');
    if (state.route === '/reset-password') return renderResetPassword();
    if (state.route === '/profile') return renderProfile();
    if (state.route === '/checkout') return renderCheckout();
    if (state.route === '/pay') return renderPay();
    if (state.route === '/recharge') return renderRecharge();
    if (state.route === '/address') return renderAddress();
    if (state.route === '/address-edit') return renderAddressEdit();
    if (state.route === '/orders') return renderOrders();
    if (state.route === '/order-detail') return renderOrderDetail();
    if (state.route === '/collect') return renderSimpleList('collect');
    if (state.route === '/footprint') return renderSimpleList('footprint');
    go('/home');
  }

  window.App = {
    go: go,
    back: back,
    renderCatalog: renderCatalog,
    listSort: listSort,
    submitSearch: submitSearch,
    searchWord: searchWord,
    openSku: openSku,
    pickSpec: pickSpec,
    changeDetailNumber: changeDetailNumber,
    confirmAddCart: confirmAddCart,
    toggleCollect: toggleCollect,
    checkCart: checkCart,
    updateCart: updateCart,
    deleteCart: deleteCart,
    submitAuth: submitAuth,
    submitResetPassword: submitResetPassword,
    logout: logout,
    submitPassword: submitPassword,
    submitAvatar: submitAvatar,
    toast: toast,
    submitOrder: submitOrder,
    payByBalance: payByBalance,
    pickRechargeAmount: pickRechargeAmount,
    submitRecharge: submitRecharge,
    pickAddress: pickAddress,
    saveAddress: saveAddress
  };

  window.addEventListener('hashchange', render);
  if (!window.location.hash) {
    window.location.hash = '#/home';
  } else {
    render();
  }
})();
