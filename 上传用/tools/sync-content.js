/* 内容同步脚本
 *
 *   node tools/sync-content.js            把 content.json 同步成 assets/js/data.js（兜底数据）
 *   node tools/sync-content.js --init     把旧版 data.js 的内容抽出来生成 content.json（只跑一次）
 *
 * 设计说明：
 *   content.json        = 唯一内容源，以后改内容只改这个文件（可以在 GitHub 网页上改）
 *   assets/js/data.js   = 自动生成的兜底数据，双击本地打开网站时用（浏览器不允许 file:// 读 json）
 *   所以：改完 content.json 要跑一次本脚本，让本地预览也同步。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const JSON_FILE = path.join(ROOT, 'content.json');
const DATA_FILE = path.join(ROOT, 'assets', 'js', 'data.js');

const KEYS = ['site', 'slides', 'cats', 'plugins', 'services', 'steps', 'news', 'reviews', 'faq'];
const GLOBALS = ['SITE', 'SLIDES', 'CATS', 'PLUGINS', 'SERVICES', 'STEPS', 'NEWS', 'REVIEWS', 'FAQ'];

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const initMode = process.argv.includes('--init');

if (initMode) {
  // 旧版 data.js → content.json
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(DATA_FILE, 'utf8'), sandbox, { filename: 'data.js' });
  const w = sandbox.window;
  const content = {};
  KEYS.forEach((k, i) => { content[k] = w[GLOBALS[i]]; });
  fs.writeFileSync(JSON_FILE, JSON.stringify(content, null, 2) + '\n', 'utf8');
  console.log('✓ 已从 data.js 生成 content.json');
}

// content.json → data.js
if (!fs.existsSync(JSON_FILE)) {
  console.error('✗ 找不到 content.json');
  process.exit(1);
}

let content;
try {
  content = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
} catch (e) {
  console.error('✗ content.json 格式错误（多半是少了逗号、多了一行逗号或引号没配对）：');
  console.error('  ' + e.message);
  process.exit(1);
}

const missing = KEYS.filter(k => !(k in content));
if (missing.length) console.warn('⚠️  content.json 缺少字段：' + missing.join('、'));

const out =
`/* ==========================================================================
 * 本文件由 content.json 自动生成，请不要手动修改！
 *
 * 想改网站内容 → 编辑 content.json（可以在 GitHub 网页上直接改）
 * 改完本地预览时跑一次：  node tools/sync-content.js
 *
 * 生成时间：${stamp()}
 * ========================================================================== */

window.FALLBACK_CONTENT = ${JSON.stringify(content, null, 2)};
`;

fs.writeFileSync(DATA_FILE, out, 'utf8');

const n = (a) => Array.isArray(a) ? a.length : 0;
console.log('✓ 已生成 assets/js/data.js');
console.log(`  插件 ${n(content.plugins)} 款 · 服务 ${n(content.services)} 项 · 公告 ${n(content.news)} 条 · 轮播 ${n(content.slides)} 张 · FAQ ${n(content.faq)} 条`);
if (content.site && content.site.contact && /请填写/.test(content.site.contact.qq || '')) {
  console.log('  ⚠️  content.json 里的 QQ 号还没填');
}
