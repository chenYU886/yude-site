/* 渲染结果自检：node tools/verify-dom.js
 * 读取 _shot 目录里由无头浏览器 --dump-dom 生成的页面，检查 JS 是否真的渲染成功。
 * 需要先跑 tools/render.ps1（或手动用 Edge 生成 dom.html）。
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '_shot');
const EXPECT = {
  'index':    { cards: 6, containers: ['cats', 'hot-plugins', 'services', 'steps', 'news', 'reviews', 'faq', 'stats', 'slider'] },
  'plugins':  { cards: 12, containers: ['chips', 'plugin-list'] },
  'detail':   { cards: 0, containers: ['detail'] },
  'services': { cards: 0, containers: ['service-list', 'steps', 'faq'] },
  'news':     { cards: 0, containers: ['news-list'] },
  'about':    { cards: 0, containers: ['faq', 'stats'] }
};

let bad = 0;
for (const [name, exp] of Object.entries(EXPECT)) {
  const file = path.join(DIR, name + '.dom.html');
  if (!fs.existsSync(file)) { console.log(`✗ ${name}: 缺少 ${name}.dom.html`); bad++; continue; }
  const html = fs.readFileSync(file, 'utf8');

  const cards = (html.match(/class="card reveal/g) || []).length;
  const headerOK = html.includes('id="nav"') && html.includes('class="footer"');
  const contactOK = html.includes('class="contact-line"');
  const empty = exp.containers.filter(id => {
    const re = new RegExp(`id="${id}"[^>]*>\\s*</`);
    return re.test(html);
  });

  // 页面级内容抽样
  const probes = [];
  if (name === 'detail') {
    probes.push(['插件标题', html.includes('高级警察系统 Pro')]);
    probes.push(['参数表', html.includes('spec-table') && html.includes('QBCore')]);
    probes.push(['更新日志', html.includes('tl-item')]);
    probes.push(['购买按钮', html.includes('id="buy-btn"')]);
    probes.push(['功能列表', html.includes('feature-list')]);
  }
  if (name === 'plugins') probes.push(['数量统计', /共 \d+ 款插件/.test(html)]);
  if (name === 'index') probes.push(['轮播', html.includes('class="slide on"')], ['分类导航', /class="cat reveal/.test(html)]);
  if (name === 'news') probes.push(['公告卡片', html.includes('news-item')]);
  if (name === 'about') probes.push(['售后政策', html.includes('售后政策')]);
  if (name === 'services') probes.push(['服务卡片', /class="service reveal/.test(html)]);

  const errFile = path.join(DIR, name + '.err.txt');
  const errs = fs.existsSync(errFile) ? fs.readFileSync(errFile, 'utf8') : '';
  const jsErr = /Uncaught|SyntaxError|ReferenceError|TypeError|is not a function|is not defined/i.test(errs);

  const problems = [];
  if (cards !== exp.cards) problems.push(`插件卡片数 ${cards}，期望 ${exp.cards}`);
  if (!headerOK) problems.push('页眉或页脚没渲染');
  if (!contactOK) problems.push('联系方式块没渲染');
  if (empty.length) problems.push('空容器：' + empty.join('、'));
  if (jsErr) problems.push('浏览器控制台有 JS 报错（见 ' + name + '.err.txt）');
  probes.forEach(([label, ok]) => { if (!ok) problems.push(`缺少内容：${label}`); });

  if (problems.length) { console.log(`✗ ${name}`); problems.forEach(p => console.log('   · ' + p)); bad++; }
  else console.log(`✓ ${name}  插件卡片 ${cards} 个，页眉页脚与联系方式正常`);
}

console.log(bad ? `\n渲染检查未通过：${bad} 个页面有问题` : '\n渲染检查全部通过 ✅');
process.exit(bad ? 1 : 0);
