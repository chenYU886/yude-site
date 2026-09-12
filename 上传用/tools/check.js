/* 站点自检脚本：node tools/check.js
 *
 * 检查内容：
 *   1. content.json 格式与数据完整性（插件 id 重复、分类写错、价格类型等）
 *   2. 兜底数据 data.js 是否和 content.json 同步
 *   3. 每个页面的 data-page、必要元素 id、脚本引入
 *   4. 站内链接与锚点是否有效
 *
 * 改完 content.json 跑一次，能提前发现问题。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const errors = [];
const warns = [];
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---- 1. 读取 content.json ---- */
if (!fs.existsSync(path.join(ROOT, 'content.json'))) {
  console.error('❌ 找不到 content.json');
  process.exit(1);
}
const raw = read('content.json');
let w;
try {
  w = JSON.parse(raw);
} catch (e) {
  console.error('❌ content.json 格式错误（多半是少了逗号、多了一行逗号，或者引号没配对）：');
  console.error('   ' + e.message);
  const m = /position (\d+)/.exec(e.message);
  if (m) {
    const pos = Number(m[1]);
    const line = raw.slice(0, pos).split('\n').length;
    const col = pos - raw.lastIndexOf('\n', pos - 1);
    console.error(`   大致位置：第 ${line} 行 第 ${col} 列`);
    console.error('   附近内容：' + JSON.stringify(raw.slice(Math.max(0, pos - 60), pos + 40)));
  }
  process.exit(1);
}

/* ---- 2. 数据完整性 ---- */
if (!w.site || !w.site.contact) errors.push('content.json 缺少 site.contact（联系方式）');
const catNames = (w.cats || []).map(c => c.name);
const ids = new Set();

(w.plugins || []).forEach(p => {
  const tag = `插件「${p.name || p.id || '?'}」`;
  if (!p.id) errors.push(`${tag} 缺少 id`);
  if (ids.has(p.id)) errors.push(`${tag} 的 id 重复：${p.id}`);
  ids.add(p.id);
  if (!p.name || !p.summary) errors.push(`${tag} 缺少 name 或 summary`);
  if (typeof p.price !== 'number') errors.push(`${tag} 的 price 必须是数字（不要写引号，不要写 ¥ 符号）`);
  if (p.oldPrice && p.oldPrice <= p.price) warns.push(`${tag} 的 oldPrice 不比 price 高，划线价没意义`);
  if (catNames.length && !catNames.includes(p.cat)) errors.push(`${tag} 的分类「${p.cat}」不在 cats 列表里`);
  if (!Array.isArray(p.features) || !p.features.length) warns.push(`${tag} 没有 features（功能说明）`);
  if (!p.specs || !Object.keys(p.specs).length) warns.push(`${tag} 没有 specs（插件参数）`);
  if (!Array.isArray(p.tags)) warns.push(`${tag} 的 tags 不是数组`);
});

const svcIds = new Set();
(w.services || []).forEach(s => {
  if (!s.id || !s.name || !s.price) errors.push(`服务「${s.name || '?'}」缺少 id / name / price`);
  svcIds.add(s.id);
});

(w.news || []).forEach(n => {
  if (!['更新', '修复', '公告'].includes(n.type)) errors.push(`公告「${n.title}」的 type 必须是 更新 / 修复 / 公告`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date || '')) errors.push(`公告「${n.title}」的 date 格式应为 YYYY-MM-DD`);
});

(w.slides || []).forEach((s, i) => {
  if (!s.title || !s.btn1 || !s.btn2) errors.push(`轮播第 ${i + 1} 张缺少 title / btn1 / btn2`);
});

if (/请填写/.test(w.site?.contact?.qq || '')) warns.push('还没有填真实 QQ 号（content.json → site.contact.qq）');
if (/请填写/.test(w.site?.contact?.qqGroup || '')) warns.push('还没有填真实 QQ 群号（content.json → site.contact.qqGroup）');
if (w.site?.contact?.qqGroup && !w.site.contact.qqGroupLink) warns.push('填了 QQ 群号但没填群链接，群里那行就不能点击跳转');

/* ---- 3. 兜底数据是否同步 ---- */
const dataFile = 'assets/js/data.js';
if (!fs.existsSync(path.join(ROOT, dataFile))) {
  errors.push('缺少 assets/js/data.js（本地预览用的兜底数据），执行 node tools/sync-content.js 生成');
} else {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  try {
    vm.runInContext(read(dataFile), sandbox, { filename: 'data.js' });
    const fb = sandbox.window.FALLBACK_CONTENT;
    if (!fb) errors.push('data.js 里没有 FALLBACK_CONTENT，执行 node tools/sync-content.js 重新生成');
    else if (JSON.stringify(fb) !== JSON.stringify(w)) {
      warns.push('data.js 和 content.json 内容不一致（本地双击预览会看到旧内容），执行：node tools/sync-content.js');
    }
  } catch (e) {
    errors.push('data.js 语法错误：' + e.message);
  }
}

/* ---- 4. 每个页面需要的元素 ---- */
const PAGES = {
  'index.html':    { page: 'home',     ids: ['app-header', 'app-footer', 'slider', 'stats', 'cats', 'hot-plugins', 'services', 'steps', 'news', 'reviews', 'faq', 'contact', 'contact-info'] },
  'plugins.html':  { page: 'plugins',  ids: ['app-header', 'app-footer', 'chips', 'search', 'sort', 'count', 'plugin-list', 'contact-info'] },
  'plugin.html':   { page: 'plugin',   ids: ['app-header', 'app-footer', 'detail', 'contact-info'] },
  'services.html': { page: 'services', ids: ['app-header', 'app-footer', 'service-list', 'steps', 'faq', 'contact-info'] },
  'news.html':     { page: 'news',     ids: ['app-header', 'app-footer', 'news-list', 'contact-info'] },
  'about.html':    { page: 'about',    ids: ['app-header', 'app-footer', 'stats', 'faq', 'contact-info'] }
};

const fileIds = {};
Object.entries(PAGES).forEach(([file, cfg]) => {
  if (!fs.existsSync(path.join(ROOT, file))) { errors.push(`${file} 不存在`); return; }
  const html = read(file);
  const m = /data-page="([^"]+)"/.exec(html);
  if (!m) errors.push(`${file} 的 <body> 缺少 data-page`);
  else if (m[1] !== cfg.page) errors.push(`${file} 的 data-page 是 "${m[1]}"，期望 "${cfg.page}"`);

  fileIds[file] = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]));
  cfg.ids.forEach(id => {
    if (['app-header', 'app-footer'].includes(id)) {
      if (!html.includes(`id="${id}"`)) errors.push(`${file} 缺少 #${id}`);
      return;
    }
    if (!html.includes(`id="${id}"`)) errors.push(`${file} 缺少元素 #${id}`);
  });

  ['assets/css/style.css', 'assets/js/config.js', 'assets/js/data.js', 'assets/js/site.js'].forEach(a => {
    if (!html.includes(a)) errors.push(`${file} 没有引入 ${a}`);
  });

  // 乱码检测：出现连续问号或典型 GBK 乱码字符说明文件编码被写坏了
  if (/锛|銆|鐨|鈥|锟斤拷/.test(html)) errors.push(`${file} 出现乱码，文件编码可能被写坏了`);
});

/* ---- 5. 站内链接检查 ---- */
Object.entries(PAGES).forEach(([file]) => {
  const html = read(file);
  [...html.matchAll(/href="([^"]+)"/g)].map(x => x[1]).forEach(href => {
    if (/^(https?:|mailto:|data:|tel:)/.test(href)) return;
    const [target, hash] = href.split('#');
    const toFile = target === '' ? file : target;
    if (target && !fs.existsSync(path.join(ROOT, toFile))) { errors.push(`${file} 里的链接指向不存在的文件：${href}`); return; }
    if (!hash) return;
    const exists = (fileIds[toFile] && fileIds[toFile].has(hash)) || svcIds.has(hash);
    if (!exists) warns.push(`${file} 里的锚点可能无效：${href}`);
  });
});

/* ---- 6. 输出 ---- */
console.log('检查文件：' + Object.keys(PAGES).join('、'));
console.log(`插件 ${(w.plugins || []).length} 款 · 服务 ${(w.services || []).length} 项 · 公告 ${(w.news || []).length} 条 · 轮播 ${(w.slides || []).length} 张`);
if (warns.length) {
  console.log('\n⚠️  提醒（不影响使用）：');
  [...new Set(warns)].forEach(x => console.log('   · ' + x));
}
if (errors.length) {
  console.log('\n❌ 发现 ' + errors.length + ' 个问题：');
  errors.forEach(x => console.log('   · ' + x));
  process.exit(1);
}
console.log('\n✅ 全部检查通过。');
