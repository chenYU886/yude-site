/* ==========================================================================
 * 屿的 FiveM 工作室 —— 全站公共脚本
 * 负责：渲染导航栏/页脚、插件卡片、轮播、筛选、手风琴、滚动动画
 * 一般不需要修改这个文件，改内容请打开 assets/js/data.js
 * ========================================================================== */

(function () {
  'use strict';

  var S = {};          // 站点信息，由 applyContent 填充
  var C = {};          // 联系方式

  /* ======================================================================
   * 内容加载：优先读云端 content.json，失败则用内置兜底数据
   * ==================================================================== */

  /* 把云端内容挂到全局，页面渲染函数直接用 window.PLUGINS 之类 */
  function applyContent(content) {
    content = content || {};
    window.SITE = S = content.site || {};
    C = S.contact || {};
    window.SLIDES   = content.slides   || [];
    window.CATS     = content.cats     || [];
    window.PLUGINS  = content.plugins  || [];
    window.SERVICES = content.services || [];
    window.STEPS    = content.steps    || [];
    window.NEWS     = content.news     || [];
    window.REVIEWS  = content.reviews  || [];
    window.FAQ      = content.faq      || [];
  }

  function loadContent() {
    var sources = (window.CONTENT_SOURCES || ['content.json']).slice();

    // file:// 直接双击打开时，浏览器禁止读取本地 json，直接用兜底数据
    if (location.protocol === 'file:') {
      console.log('[屿的] 本地 file:// 模式，使用内置兜底数据（线上会读 content.json）');
      return Promise.resolve(window.FALLBACK_CONTENT || null);
    }

    return next(0);

    function next(i) {
      if (i >= sources.length) {
        console.warn('[屿的] 所有内容来源都失败，使用内置兜底数据');
        return Promise.resolve(window.FALLBACK_CONTENT || null);
      }
      var src = sources[i];
      var url = src + (src.indexOf('?') > -1 ? '&' : '?') + 'v=' + Date.now();
      return fetch(url, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (json) {
          if (!json || !json.plugins) throw new Error('内容格式不正确');
          console.log('[屿的] 内容已加载：' + src);
          window.__contentFrom = src;
          return json;
        })
        .catch(function (e) {
          console.warn('[屿的] ' + src + ' 读取失败（' + e.message + '），尝试下一个来源');
          return next(i + 1);
        });
    }
  }

  /* ------------------------------------------------------------ 小工具函数 */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) { return Number(n).toLocaleString('zh-CN'); }
  function priceHTML(p) {
    var old = p.oldPrice ? '<s>¥' + money(p.oldPrice) + '</s>' : '';
    return '<div class="price"><span class="rmb">¥</span><b>' + money(p.price) + '</b>' + old + '</div>';
  }
  function stars(n) {
    var full = Math.max(0, Math.min(5, Math.round(n || 5)));
    return '<span class="stars">' + '★'.repeat(full) + '☆'.repeat(5 - full) + '</span>';
  }
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function isPlaceholder(v) { return !v || /请填写/.test(v); }

  /* 分类配色（占位图用） */
  var CAT_COLOR = {
    '玩法系统': ['#ff4d8d', '#7c5cff'],
    '职业系统': ['#7c5cff', '#00d4ff'],
    '车辆载具': ['#00d4ff', '#00e08a'],
    '界面 UI':  ['#00e08a', '#7c5cff'],
    '地图素材': ['#ffb020', '#ff4d8d'],
    '工具反作弊': ['#7c5cff', '#ff4d8d']
  };
  var CAT_ICON = {};
  (window.CATS || []).forEach(function (c) { CAT_ICON[c.name] = c.icon; });
  function catColor(cat, flip) {
    var c = CAT_COLOR[cat] || ['#7c5cff', '#00d4ff'];
    return flip ? [c[1], c[0]] : c;
  }

  /* 封面：有图用图，没图用渐变占位 */
  function coverHTML(p, cls) {
    var c = catColor(p.cat);
    var style = '--g1:' + c[0] + ';--g2:' + c[1];
    if (p.cover) {
      return '<div class="' + (cls || 'cover') + '" style="' + style + '">' +
        '<img src="' + esc(p.cover) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        badgesHTML(p) + '</div>';
    }
    return '<div class="' + (cls || 'cover') + '" style="' + style + '">' +
      '<div class="ph"><div class="ph-ico">' + (CAT_ICON[p.cat] || '🎮') + '</div>' +
      '<div class="ph-txt">' + esc(p.cat || 'PLUGIN') + '</div></div>' +
      badgesHTML(p) + '</div>';
  }
  function badgesHTML(p) {
    var out = '<div class="badges">';
    if (p.hot) out += '<span class="badge badge-hot">🔥 热销</span>';
    out += '<span class="badge badge-cat">' + esc(p.cat) + '</span>';
    return out + '</div>';
  }

  /* 插件卡片 */
  function pluginCard(p) {
    var tags = (p.tags || []).slice(0, 3).map(function (t) {
      return '<span class="tag">' + esc(t) + '</span>';
    }).join('');
    return '' +
      '<a class="card reveal" href="plugin.html?id=' + encodeURIComponent(p.id) + '">' +
        coverHTML(p) +
        '<div class="card-body">' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<div class="card-meta">' + stars(p.rating) +
            '<span>已售 ' + money(p.sales || 0) + '</span></div>' +
          '<p class="sum">' + esc(p.summary) + '</p>' +
          '<div class="tags">' + tags + '</div>' +
          '<div class="card-foot">' + priceHTML(p) +
            '<span class="btn btn-line btn-sm">查看详情 →</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  /* --------------------------------------------------------------- 顶部导航 */
  var NAV = [
    { t: '首页',     h: 'index.html',    k: 'home' },
    { t: '插件商城', h: 'plugins.html',  k: 'plugins' },
    { t: '服务项目', h: 'services.html', k: 'services' },
    { t: '公告',     h: 'news.html',     k: 'news' },
    { t: '关于 & 售后', h: 'about.html', k: 'about' }
  ];

  function renderHeader() {
    var page = document.body.dataset.page || '';
    var navHTML = NAV.map(function (n) {
      return '<a href="' + n.h + '"' + (n.k === page ? ' class="active"' : '') + '>' + n.t + '</a>';
    }).join('');

    var qq = isPlaceholder(C.qq) ? '待填写' : C.qq;
    var grp = isPlaceholder(C.qqGroup) ? '待填写' : C.qqGroup;

    var html = '' +
      '<div class="topbar"><div class="container">' +
        '<div>🎮 <b>' + esc(S.brandFull) + '</b> · ' + esc(S.slogan) + '</div>' +
        '<div class="tb-right">QQ：' + esc(qq) + ' &nbsp;|&nbsp; QQ群：' + esc(grp) + '</div>' +
      '</div></div>' +
      '<header class="header"><div class="container">' +
        '<a class="logo" href="index.html">' +
          '<span class="mark">屿</span>' +
          '<span class="txt">' + esc(S.brand) + '<small>FIVEM STUDIO</small></span>' +
        '</a>' +
        '<nav class="nav" id="nav">' + navHTML + '</nav>' +
        '<a class="btn btn-primary btn-sm header-cta" href="index.html#contact">立即咨询</a>' +
        '<button class="burger" id="burger" aria-label="菜单">☰</button>' +
      '</div></header>';

    var host = $('#app-header');
    if (host) host.innerHTML = html;

    var burger = $('#burger'), nav = $('#nav');
    if (burger && nav) {
      burger.addEventListener('click', function () {
        nav.classList.toggle('open');
        burger.textContent = nav.classList.contains('open') ? '✕' : '☰';
      });
    }
  }

  /* ---------------------------------------------------------------- 页脚 */
  function contactRows() {
    var rows = '';
    function row(label, val, link) {
      if (isPlaceholder(val)) return '';
      if (link) {
        return '<a class="contact-line has-link" href="' + esc(link) + '" target="_blank" rel="noopener">' +
          '<span>' + label + '</span><b>' + esc(val) + ' ↗</b></a>';
      }
      return '<div class="contact-line"><span>' + label + '</span><b>' + esc(val) + '</b></div>';
    }
    rows += row('QQ 号', C.qq);
    rows += row('QQ 群', C.qqGroup, C.qqGroupLink);
    rows += row('微信号', C.wechat);
    rows += row('邮箱', C.email);
    rows += row('Discord', C.discord);
    if (!rows) rows = '<div class="contact-line"><span>联系方式</span><b>待填写</b></div>';
    return rows;
  }

  function renderFooter() {
    var html = '' +
      '<footer class="footer"><div class="container">' +
        '<div class="footer-grid">' +
          '<div class="about">' +
            '<a class="logo" href="index.html">' +
              '<span class="mark">屿</span>' +
              '<span class="txt">' + esc(S.brand) + '<small>FIVEM STUDIO</small></span>' +
            '</a>' +
            '<p>' + esc(S.desc) + '</p>' +
            '<p style="color:var(--brand-2);margin-top:12px;">' + esc(C.workTime || '') + '</p>' +
          '</div>' +
          '<div>' +
            '<h5>快速导航</h5>' +
            '<ul>' + NAV.map(function (n) {
              return '<li><a href="' + n.h + '">' + n.t + '</a></li>';
            }).join('') + '</ul>' +
          '</div>' +
          '<div>' +
            '<h5>热门服务</h5>' +
            '<ul>' +
              '<li><a href="services.html#server-setup">开服一条龙</a></li>' +
              '<li><a href="services.html#custom-dev">定制插件开发</a></li>' +
              '<li><a href="services.html#translate">插件汉化</a></li>' +
              '<li><a href="services.html#fix">BUG 修复 / 适配</a></li>' +
              '<li><a href="services.html#coach">一对一技术指导</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h5>联系方式</h5>' +
            contactRows() +
          '</div>' +
        '</div>' +
        '<div class="disclaimer">' +
          '免责声明：本站为第三方 FiveM 资源开发与技术服务站点，与 Rockstar Games、Take-Two Interactive、Cfx.re 无任何隶属或合作关系。' +
          '本站所售插件均为独立开发，不含任何官方素材。请在遵守相关平台服务条款的前提下使用。' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>© ' + new Date().getFullYear() + ' ' + esc(S.copyright || S.brandFull) + ' 版权所有</span>' +
          '<span>' + (S.icp ? esc(S.icp) : '技术支持：' + esc(S.brandFull)) + '</span>' +
        '</div>' +
      '</div></footer>';

    var host = $('#app-footer');
    if (host) host.innerHTML = html;
  }

  /* -------------------------------------------------------------- 轮播组件 */
  function initSlider() {
    var host = $('#slider');
    if (!host || !window.SLIDES) return;
    var slides = window.SLIDES;
    var slideHTML = slides.map(function (s, i) {
      return '<div class="slide' + (i === 0 ? ' on' : '') + '" style="--c1:' + s.c1 + '66;--c2:' + s.c2 + '66">' +
        '<div class="slide-inner">' +
          '<span class="slide-tag">' + esc(s.tag) + '</span>' +
          '<h2>' + esc(s.title) + '</h2>' +
          '<p>' + esc(s.sub) + '</p>' +
          '<div class="slide-btns">' +
            '<a class="btn btn-primary" href="' + esc(resolveLink(s.btn1.link)) + '">' + esc(s.btn1.text) + '</a>' +
            '<a class="btn btn-ghost" href="' + esc(resolveLink(s.btn2.link)) + '">' + esc(s.btn2.text) + '</a>' +
          '</div>' +
        '</div></div>';
    }).join('');

    var dots = slides.map(function (_, i) {
      return '<i data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + '></i>';
    }).join('');

    host.innerHTML = '<div class="slides">' + slideHTML + '</div>' +
      '<div class="dots">' + dots + '</div>' +
      '<div class="slider-nav">' +
        '<button data-dir="-1" aria-label="上一张">‹</button>' +
        '<button data-dir="1" aria-label="下一张">›</button>' +
      '</div>';

    var items = $$('.slide', host), ds = $$('.dots i', host), cur = 0, timer;

    function go(n) {
      cur = (n + items.length) % items.length;
      items.forEach(function (el, i) { el.classList.toggle('on', i === cur); });
      ds.forEach(function (el, i) { el.classList.toggle('on', i === cur); });
    }
    function play() { timer = setInterval(function () { go(cur + 1); }, 5200); }
    function stop() { clearInterval(timer); }

    ds.forEach(function (d) {
      d.addEventListener('click', function () { stop(); go(+d.dataset.i); play(); });
    });
    $$('.slider-nav button', host).forEach(function (b) {
      b.addEventListener('click', function () { stop(); go(cur + (+b.dataset.dir)); play(); });
    });
    host.addEventListener('mouseenter', stop);
    host.addEventListener('mouseleave', play);
    play();
  }

  function resolveLink(link) {
    if (!link) return '#';
    if (/^(https?:|mailto:|#)/.test(link)) return link;
    if (/\.html/.test(link)) return link;
    return 'index.html#' + link;
  }

  /* ------------------------------------------------------------ 手风琴组件 */
  function initAccordion() {
    $$('.acc-item').forEach(function (item) {
      var q = $('.acc-q', item), a = $('.acc-a', item);
      if (!q || !a) return;
      q.addEventListener('click', function () {
        var on = item.classList.toggle('on');
        a.style.maxHeight = on ? a.scrollHeight + 'px' : '0px';
      });
    });
  }

  /* ------------------------------------------------------------ 滚动动画 */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: .06 });
    els.forEach(function (e, i) {
      e.style.transitionDelay = (i % 3) * 70 + 'ms';
      io.observe(e);
    });
  }

  /* ------------------------------------------------------------ 返回顶部 */
  function initTop() {
    var b = document.createElement('button');
    b.className = 'totop';
    b.innerHTML = '↑';
    b.setAttribute('aria-label', '返回顶部');
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(b);
    window.addEventListener('scroll', function () {
      b.classList.toggle('on', window.scrollY > 520);
    });
  }

  /* ======================================================================
   * 页面级渲染
   * ==================================================================== */

  /* 插件卡片通用渲染：把数组写进某个容器 */
  function mountPlugins(hostSel, list) {
    var host = $(hostSel);
    if (!host) return;
    if (!list.length) {
      host.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>没有匹配的插件</b>换个关键词，或者直接加 QQ 问我有没有。</div>';
      return;
    }
    host.innerHTML = list.map(pluginCard).join('');
    initReveal();
  }

  /* 首页 */
  function pageHome() {
    initSlider();

    // 数字
    var st = $('#stats');
    if (st && S.stats) {
      st.innerHTML = S.stats.map(function (s) {
        return '<div class="stat reveal"><b>' + esc(s.num) + '</b><span>' + esc(s.label) + '</span></div>';
      }).join('');
    }

    // 分类
    var cg = $('#cats');
    if (cg && window.CATS) {
      cg.innerHTML = window.CATS.map(function (c) {
        var n = (window.PLUGINS || []).filter(function (p) { return p.cat === c.name; }).length;
        return '<a class="cat reveal" href="plugins.html?cat=' + encodeURIComponent(c.name) + '">' +
          '<span class="count">' + n + ' 款</span>' +
          '<div class="ico">' + c.icon + '</div>' +
          '<h3>' + esc(c.name) + '</h3><p>' + esc(c.desc) + '</p></a>';
      }).join('');
    }

    // 热门插件
    var hot = (window.PLUGINS || []).filter(function (p) { return p.hot; });
    if (!hot.length) hot = (window.PLUGINS || []).slice(0, 6);
    hot = hot.slice(0, 6);
    mountPlugins('#hot-plugins', hot);

    // 服务
    var sg = $('#services');
    if (sg && window.SERVICES) {
      sg.innerHTML = window.SERVICES.map(function (s) {
        return '<a class="service reveal" href="services.html#' + s.id + '">' +
          '<div class="ico">' + s.icon + '</div>' +
          '<h3>' + esc(s.name) + (s.hot ? ' <span class="badge badge-hot">热门</span>' : '') + '</h3>' +
          '<div class="price-line">' + esc(s.price) + '<small>' + esc(s.unit || '') + '</small></div>' +
          '<p>' + esc(s.summary) + '</p>' +
          '<ul>' + s.items.slice(0, 3).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
          '<span class="btn btn-line btn-sm">查看详情 →</span>' +
        '</a>';
      }).join('');
    }

    // 流程
    var sp = $('#steps');
    if (sp && window.STEPS) {
      sp.innerHTML = window.STEPS.map(function (s) {
        return '<div class="step reveal"><b class="n">' + s.n + '</b><h4>' + esc(s.t) + '</h4><p>' + esc(s.d) + '</p></div>';
      }).join('');
    }

    // 公告（取前 3 条）
    var nl = $('#news');
    if (nl && window.NEWS) {
      nl.innerHTML = window.NEWS.slice(0, 3).map(newsItem).join('');
    }

    // 评价
    var rv = $('#reviews');
    if (rv && window.REVIEWS) {
      rv.innerHTML = window.REVIEWS.map(function (r) {
        return '<div class="review reveal"><div class="quote">“</div><p>' + esc(r.text) + '</p>' +
          '<div class="who"><div class="av">' + esc(r.name.charAt(0)) + '</div>' +
          '<div><b>' + esc(r.name) + '</b><span>' + esc(r.role) + '</span></div></div></div>';
      }).join('');
    }

    // FAQ
    renderFAQ('#faq', window.FAQ ? window.FAQ.slice(0, 5) : []);
  }

  function newsItem(n) {
    var d = n.date.split('-');
    return '<div class="news-item reveal">' +
      '<div class="news-date"><b>' + d[2] + '</b><span>' + d[0] + '-' + d[1] + '</span></div>' +
      '<div class="news-main"><h4><span class="type-tag type-' + esc(n.type) + '">' + esc(n.type) + '</span>' + esc(n.title) + '</h4>' +
      '<p>' + esc(n.body) + '</p></div></div>';
  }

  function renderFAQ(sel, list) {
    var host = $(sel);
    if (!host || !list.length) return;
    host.innerHTML = list.map(function (f, i) {
      return '<div class="acc-item reveal">' +
        '<div class="acc-q"><span class="idx">Q' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span>' + esc(f.q) + '</span><span class="plus">+</span></div>' +
        '<div class="acc-a"><p>' + esc(f.a) + '</p></div></div>';
    }).join('');
    initAccordion();
  }

  /* 插件商城页 */
  function pagePlugins() {
    var all = window.PLUGINS || [];
    var state = { cat: '全部', q: '', sort: 'default' };

    // 分类筛选按钮
    var chips = $('#chips');
    var cats = ['全部'].concat((window.CATS || []).map(function (c) { return c.name; }));
    if (chips) {
      chips.innerHTML = cats.map(function (c) {
        return '<button class="chip' + (c === state.cat ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('');
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('.chip');
        if (!b) return;
        state.cat = b.dataset.cat;
        $$('.chip', chips).forEach(function (x) { x.classList.toggle('on', x === b); });
        apply();
      });
    }

    var search = $('#search');
    if (search) search.addEventListener('input', function () { state.q = this.value.trim(); apply(); });

    var sort = $('#sort');
    if (sort) sort.addEventListener('change', function () { state.sort = this.value; apply(); });

    function apply() {
      var list = all.filter(function (p) {
        if (state.cat !== '全部' && p.cat !== state.cat) return false;
        if (state.q) {
          var hay = (p.name + p.summary + p.cat + (p.tags || []).join('')).toLowerCase();
          if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
        }
        return true;
      });
      if (state.sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
      if (state.sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
      if (state.sort === 'sales') list.sort(function (a, b) { return (b.sales || 0) - (a.sales || 0); });
      mountPlugins('#plugin-list', list);
      var cnt = $('#count');
      if (cnt) cnt.textContent = '共 ' + list.length + ' 款插件';
    }

    // 支持从首页分类跳转：plugins.html?cat=职业系统
    var c = param('cat');
    if (c && cats.indexOf(c) > -1) {
      state.cat = c;
      $$('.chip', chips).forEach(function (x) { x.classList.toggle('on', x.dataset.cat === c); });
    }
    apply();
  }

  /* 插件详情页 */
  function pagePlugin() {
    var all = window.PLUGINS || [];
    var id = param('id');
    var p = all.filter(function (x) { return x.id === id; })[0];

    var host = $('#detail');
    if (!p) {
      if (host) host.innerHTML = '<div class="empty" style="margin-top:40px"><b>没有找到这个插件</b>' +
        '链接可能已失效，去 <a href="plugins.html" style="color:var(--brand-2)">插件商城</a> 看看其他的吧。</div>';
      return;
    }

    document.title = p.name + ' - ' + (S.brandFull || '屿的 FiveM 工作室');

    // 图库：没图就生成占位
    var gallery = (p.gallery && p.gallery.length) ? p.gallery : ['', '', '', ''];
    var gcolors = catColor(p.cat);
    var mainHTML = p.cover
      ? '<div class="gallery-main" style="--g1:' + gcolors[0] + ';--g2:' + gcolors[1] + '"><img id="g-main-img" src="' + esc(p.cover) + '" alt="' + esc(p.name) + '"></div>'
      : '<div class="gallery-main" style="--g1:' + gcolors[0] + ';--g2:' + gcolors[1] + '">' +
          '<div class="ph"><div class="big">' + (CAT_ICON[p.cat] || '🎮') + '</div><div class="txt">请替换为真实截图</div></div></div>';

    var thumbsHTML = gallery.map(function (g, i) {
      if (g) {
        return '<div class="thumb' + (i === 0 && !p.cover ? ' on' : '') + '" data-src="' + esc(g) + '"><img src="' + esc(g) + '" alt="预览' + (i + 1) + '"></div>';
      }
      return '<div class="thumb' + (i === 0 && !p.cover ? ' on' : '') + '" data-ph="1"><span class="t-ph">截图 ' + (i + 1) + '</span></div>';
    }).join('');

    var videoHTML = p.video
      ? (/\.(mp4|webm)$/i.test(p.video)
        ? '<video src="' + esc(p.video) + '" controls preload="metadata"></video>'
        : '<iframe src="' + esc(p.video) + '" allowfullscreen scrolling="no" frameborder="0"></iframe>')
      : '<div class="ph"><div class="big">▶</div><div class="txt">演示视频位（把 B站 iframe 或 mp4 链接填进 data.js）</div></div>';

    var save = p.oldPrice ? (p.oldPrice - p.price) : 0;
    var qq = isPlaceholder(C.qq) ? '请填写QQ号' : C.qq;
    var grp = isPlaceholder(C.qqGroup) ? '请填写QQ群号' : C.qqGroup;

    var html = '' +
      '<div class="crumbs"><a href="index.html">首页</a><span>/</span>' +
        '<a href="plugins.html">插件商城</a><span>/</span>' +
        '<a href="plugins.html?cat=' + encodeURIComponent(p.cat) + '">' + esc(p.cat) + '</a><span>/</span>' +
        esc(p.name) + '</div>' +

      '<div class="detail-grid">' +

        '<div>' +
          '<div class="panel">' +
            '<h3 style="margin-bottom:16px">' + esc(p.name) + '</h3>' +
            '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px;color:var(--muted);font-size:13.5px">' +
              stars(p.rating) + '<span>已售 ' + money(p.sales || 0) + ' 份</span><span>·</span>' +
              '<span>' + esc(p.cat) + '</span>' +
              (p.hot ? '<span class="badge badge-hot">🔥 热销</span>' : '') +
            '</div>' +
            mainHTML +
            '<div class="thumbs">' + thumbsHTML + '</div>' +
            '<div class="video-box">' + videoHTML + '</div>' +
          '</div>' +

          '<div class="panel"><h3>功能说明</h3>' +
            '<p style="margin:0 0 16px;color:var(--txt-2)">' + esc(p.summary) + '</p>' +
            '<ul class="feature-list">' + (p.features || []).map(function (f) {
              return '<li>' + esc(f) + '</li>';
            }).join('') + '</ul>' +
          '</div>' +

          '<div class="panel"><h3>插件参数</h3>' +
            '<table class="spec-table">' + Object.keys(p.specs || {}).map(function (k) {
              return '<tr><td>' + esc(k) + '</td><td>' + esc(p.specs[k]) + '</td></tr>';
            }).join('') + '</table>' +
          '</div>' +

          '<div class="panel"><h3>交付内容</h3><ul class="feature-list">' +
            (p.includes || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') +
          '</ul></div>' +

          '<div class="panel"><h3>更新日志</h3><div class="timeline">' +
            (p.changelog || []).map(function (c) {
              return '<div class="tl-item"><div class="tl-head"><b>v' + esc(c.v) + '</b><span>' + esc(c.date) + '</span></div>' +
                '<p>' + esc(c.text) + '</p></div>';
            }).join('') + '</div></div>' +
        '</div>' +

        '<div class="buy-box">' +
          '<div class="panel">' +
            '<div class="buy-price"><span class="rmb">¥</span><b>' + money(p.price) + '</b>' +
              (p.oldPrice ? '<s>¥' + money(p.oldPrice) + '</s>' : '') + '</div>' +
            (save > 0 ? '<span class="save">立省 ¥' + money(save) + '</span>' : '') +
            '<div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap">' +
              '<span class="tag">' + esc(p.cat) + '</span>' +
              (p.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
            '</div>' +
            '<div style="margin-top:18px">' +
              '<button class="btn btn-primary btn-block" id="buy-btn">立即咨询购买</button>' +
              '<p style="margin:10px 0 0;font-size:12.5px;color:var(--muted);text-align:center">' +
                '加 QQ 确认框架与版本后下单，支持微信 / 支付宝</p>' +
            '</div>' +
            '<ul class="trust">' +
              '<li><i>✓</i><span>源码非加密，可二次开发</span></li>' +
              '<li><i>✓</i><span>永久免费更新，新版本群文件下载</span></li>' +
              '<li><i>✓</i><span>一对一远程安装，装不上可退</span></li>' +
              '<li><i>✓</i><span>30 天内免费修 BUG</span></li>' +
              '<li><i>✓</i><span>可选授权绑定，防止被转发</span></li>' +
            '</ul>' +
            '<div style="margin-top:18px;padding-top:16px;border-top:1px dashed var(--line-2)">' +
              '<div class="contact-line"><span>QQ 号</span><b>' + esc(qq) + '</b></div>' +
              '<div class="contact-line"><span>QQ 群</span><b>' + esc(grp) + '</b></div>' +
              '<div class="contact-line"><span>在线时间</span><b style="font-family:inherit">' + esc(C.workTime || '') + '</b></div>' +
            '</div>' +
          '</div>' +

          '<div class="panel">' +
            '<h3>购买前请确认</h3>' +
            '<ul class="trust" style="margin-top:0">' +
              '<li><i>1</i><span>你的服务器是 ESX / QBCore / QBox 中的哪一个？</span></li>' +
              '<li><i>2</i><span>服务器版本号是多少（如 1.0.0.6600）？</span></li>' +
              '<li><i>3</i><span>是否已安装 oxmysql 或 mysql-async？</span></li>' +
            '</ul>' +
            '<p style="margin:12px 0 0;font-size:12.5px;color:var(--muted)">' +
              '不确定也没关系，把服务器报错或截图发到群里，我帮你判断。</p>' +
          '</div>' +
        '</div>' +

      '</div>';

    host.innerHTML = html;

    // 图片切换
    $$('.thumb', host).forEach(function (t) {
      t.addEventListener('click', function () {
        $$('.thumb', host).forEach(function (x) { x.classList.toggle('on', x === t); });
        var src = t.dataset.src;
        var main = $('#g-main-img', host);
        if (src && main) { main.src = src; return; }
        if (src) {
          var box = $('.gallery-main', host);
          box.innerHTML = '<img id="g-main-img" src="' + esc(src) + '" alt="' + esc(p.name) + '">';
        }
      });
    });

    // 购买按钮 → 复制 QQ
    var buy = $('#buy-btn', host);
    if (buy) {
      buy.addEventListener('click', function () {
        if (isPlaceholder(C.qq)) {
          alert('还没有填写 QQ 号。\n请打开 assets/js/data.js，把 contact.qq 换成你的真实 QQ 号。');
          return;
        }
        copyText(C.qq, 'QQ 号已复制：' + C.qq + '\n打开 QQ 粘贴搜索即可加我。');
      });
    }
    initReveal();
  }

  /* 把联系方式渲染到页面上的 #contact-info（每个页面都有这块） */
  function fillContact() {
    var box = $('#contact-info');
    if (!box) return;
    var extra = box.dataset.notice === 'off' ? '' :
      '<p style="margin:14px 0 0;color:var(--muted);font-size:12.5px;line-height:1.7">' +
      '点击号码可复制 · ' + esc(C.workTime || '') + '</p>';
    box.innerHTML = contactRows() + extra;

    // 点击复制（带链接的行除外，那个直接跳转）
    $$('.contact-line', box).forEach(function (line) {
      if (line.classList.contains('has-link')) return;
      var b = $('b', line);
      if (!b) return;
      if (isPlaceholder(b.textContent)) return;
      line.style.cursor = 'pointer';
      line.title = '点击复制';
      line.addEventListener('click', function () {
        copyText(b.textContent, '已复制：' + b.textContent);
      });
    });
  }

  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { alert(msg); }, function () { alert(msg); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      alert(msg);
    }
  }

  /* 服务页 */
  function pageServices() {
    var host = $('#service-list');
    if (host && window.SERVICES) {
      host.innerHTML = window.SERVICES.map(function (s) {
        return '<div class="service reveal" id="' + s.id + '">' +
          '<div class="ico">' + s.icon + '</div>' +
          '<h3>' + esc(s.name) + (s.hot ? ' <span class="badge badge-hot">热门</span>' : '') + '</h3>' +
          '<div class="price-line">' + esc(s.price) + '<small>' + esc(s.unit || '') + '</small></div>' +
          '<p>' + esc(s.summary) + '</p>' +
          '<ul>' + s.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
          '<a class="btn btn-line btn-sm" href="index.html#contact">咨询这项服务 →</a>' +
        '</div>';
      }).join('');
    }
    var sp = $('#steps');
    if (sp && window.STEPS) {
      sp.innerHTML = window.STEPS.map(function (s) {
        return '<div class="step reveal"><b class="n">' + s.n + '</b><h4>' + esc(s.t) + '</h4><p>' + esc(s.d) + '</p></div>';
      }).join('');
    }
    renderFAQ('#faq', window.FAQ || []);
  }

  /* 公告页 */
  function pageNews() {
    var host = $('#news-list');
    if (host && window.NEWS) host.innerHTML = window.NEWS.map(newsItem).join('');
  }

  /* 关于页 */
  function pageAbout() {
    renderFAQ('#faq', window.FAQ || []);
    var st = $('#stats');
    if (st && S.stats) {
      st.innerHTML = S.stats.map(function (s) {
        return '<div class="stat reveal"><b>' + esc(s.num) + '</b><span>' + esc(s.label) + '</span></div>';
      }).join('');
    }
  }

  /* ------------------------------------------------------------------ 启动 */
  document.addEventListener('DOMContentLoaded', function () {
    loadContent().then(function (content) {
      applyContent(content);

      renderHeader();
      renderFooter();
      initTop();

      var page = document.body.dataset.page;
      if (page === 'home') pageHome();
      if (page === 'plugins') pagePlugins();
      if (page === 'plugin') pagePlugin();
      if (page === 'services') pageServices();
      if (page === 'news') pageNews();
      if (page === 'about') pageAbout();

      fillContact();
      initReveal();

      // 方便排查：在浏览器控制台执行 __contentInfo() 看内容是从哪来的
      window.__contentInfo = function () {
        return {
          来源: window.__contentFrom || '内置兜底数据（data.js）',
          插件数: (window.PLUGINS || []).length,
          服务数: (window.SERVICES || []).length,
          公告数: (window.NEWS || []).length
        };
      };
    });
  });
})();
