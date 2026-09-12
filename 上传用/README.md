# 屿的 FiveM 工作室 · 官网源码

一套**纯静态网站** + **云端内容更新**方案。不需要服务器、不需要数据库。

- **代码**（页面结构、样式）→ 基本不用动
- **内容**（插件、价格、公告、联系方式）→ 全在 `content.json` 里，**可以在网页上直接改**

---

## 一、先看效果

### 方式 1：直接双击（最快）

双击 **`index.html`** 即可。此方式使用内置兜底数据，页面正常显示，但**不会读取 `content.json`**
（浏览器不允许 `file://` 网页读本地 json，这是浏览器的安全限制，不是网站的问题）。

### 方式 2：本地预览服务（推荐，和线上一致）

需要装 Node.js（https://nodejs.org 下载 LTS 版），然后在项目目录执行：

```powershell
node tools/serve.js
```

然后浏览器打开 **http://127.0.0.1:8080/** —— 这个模式会像线上一样读取 `content.json`，
改完内容刷新就能看到，是**验证云更新最方便的方式**。

---

## 二、云更新是怎么回事（重点）

### 内容在哪

**`content.json`** 是全站唯一的内容来源，里面装着：

| 字段 | 对应内容 |
|---|---|
| `site` | 品牌名、QQ / 群号 / 微信、在线时间、首页数字（100+ 在售插件等） |
| `slides` | 首页顶部三张轮播大图 |
| `cats` | 插件分类（玩法系统 / 职业系统 / 车辆载具 / 界面 UI / 地图素材 / 工具反作弊） |
| `plugins` | **所有插件**：名称、价格、功能点、参数、更新日志 |
| `services` | 服务项目与报价 |
| `steps` | 合作流程五步 |
| `news` | 公告与更新日志 |
| `reviews` | 客户评价 |
| `faq` | 常见问题 |

### 两条更新路线

**路线 A：跟网站一起部署（简单，推荐先用这个）**

1. 网站托管在 Cloudflare Pages、并连接了 GitHub 仓库（见第四节）
2. 以后改内容：打开 GitHub 网页 → 点开 `content.json` → 右上角铅笔图标 → 改 → 拉到底部 **Commit changes**
3. Cloudflare 自动重新部署，**约 30 秒后线上就是新内容**

优点：不用装任何软件，手机也能改。
缺点：每次要等 30 秒部署。

**路线 B：内容独立托管（改完刷新即生效，不用部署）**

1. 把 `content.json` 也放一份在你的 GitHub 仓库里
2. 拿到它的 raw 地址，形如：
   `https://raw.githubusercontent.com/你的用户名/仓库名/main/content.json`
3. 打开 `assets/js/config.js`，把地址填进去：

```js
window.CONTENT_SOURCES = [
  'https://raw.githubusercontent.com/你的用户名/仓库名/main/content.json',
  'content.json'
];
```

4. 以后在 GitHub 网页上改 `content.json` 并提交，**刷新网站页面立刻生效**，不用等部署

注意：GitHub 的 raw 地址在国内访问偶尔不稳，所以数组里**保留 `'content.json'` 作为第二个来源**——
第一个拿不到时会自动用第二个，网站不会白屏。三个来源全挂了才会退回内置兜底数据。

### 本地预览和线上的关系

`assets/js/data.js` 是**由 `content.json` 自动生成的兜底数据**（给双击 `index.html` 用的），
**不要手动改它**。改完 `content.json` 后，想让本地双击预览也同步，跑一次：

```powershell
node tools/sync-content.js
```

`tools/check.js` 会检查两者是否一致，不一致会提醒你。

---

## 三、怎么改内容

打开 `content.json`，找到对应字段改文字即可。**改完建议跑一次 `node tools/check.js`**，
它会告诉你有没有写错（比如少了逗号、分类名拼错、插件 id 重复），并指出具体位置。

### 改一个价格

找到那款插件，改 `price` 数字（**不要加引号和 ¥ 符号**）：

```json
{
  "id": "police-pro",
  "name": "高级警察系统 Pro",
  "price": 299,          ← 改这里
  "oldPrice": 399,       ← 划线价，不想要就删掉这一行（连同前面的逗号）
```

### 上新插件

复制 `plugins` 数组里任意一整段 `{ ... },` 粘到后面改内容：

```json
{
  "id": "my-plugin",              // 网址用的英文 id，不能重复，只能用字母数字和横线
  "name": "我的新插件",
  "cat": "玩法系统",               // 必须是 cats 里已有的分类名
  "price": 199,
  "oldPrice": 259,
  "hot": true,                    // 是否显示"🔥 热销"
  "sales": 100,                   // 已售数量
  "rating": 5,                    // 评分 1-5
  "summary": "一句话介绍这个插件是干嘛的。",
  "tags": ["ESX", "QBCore"],
  "features": ["功能点 1", "功能点 2"],
  "includes": ["完整源码", "中文安装文档", "永久免费更新"],
  "specs": { "支持框架": "ESX / QBCore", "依赖插件": "oxmysql" },
  "changelog": [ { "v": "1.0.0", "date": "2025-01-01", "text": "首个版本" } ],
  "cover": "",
  "gallery": [],
  "video": ""
}
```

### 下架插件

把那一整段 `{ ... },` 删掉即可（注意别把上一段的结尾逗号弄丢）。

### 发公告

在 `news` 数组**最前面**插一段（越靠前越新）：

```json
{
  "date": "2025-02-01",
  "type": "更新",              // 只能填：更新 / 修复 / 公告
  "title": "标题写这里",
  "body": "正文内容。"
}
```

### JSON 格式小抄（写错的人 90% 栽在这）

- 每段末尾的**逗号**：中间段必须有，**最后一段不能有**
- 文字必须是**英文双引号** `"像这样"`，不能用中文引号
- 数字**不加引号**：`"price": 199` ✅ ／ `"price": "199"` ❌
- 改完不放心就跑 `node tools/check.js`，它会告诉你第几行错了

---

## 四、图片和视频

### 图片

1. 在 `assets/` 下新建文件夹 `img`，把图片放进去，例如 `assets/img/police-1.jpg`
2. 在 `content.json` 对应插件里填路径：

```json
"cover": "assets/img/police-1.jpg",
"gallery": ["assets/img/police-1.jpg", "assets/img/police-2.jpg"]
```

`cover` 是列表页封面，`gallery` 是详情页截图（可多张）。
**留空也没关系**，会自动显示渐变色占位图。

> 用 GitHub 网页改内容时，也可以直接在网页上把图片拖进仓库上传，然后填它生成的路径。

### 视频

```json
"video": "https://player.bilibili.com/player.html?bvid=BVxxxxxxx"
```
或者本地 mp4：`"video": "assets/video/demo.mp4"`。留空显示"演示视频位"占位框。

### 换 Logo / 主题色

- Logo：打开 `assets/js/site.js`，搜索 `class="mark"`，把 `<span class="mark">屿</span>` 换成 `<img src="assets/img/logo.png" style="width:38px;height:38px;border-radius:11px">`
- 主题色：打开 `assets/css/style.css` 最上面的 `:root`，改 `--brand`（主色·紫）和 `--brand-2`（辅色·青）

---

## 五、上线（免费，推荐路线）

### 推荐做法：GitHub + Cloudflare Pages 自动部署

这套组合的好处是：**以后改内容不用再上传文件**，在网页上改一下，网站自动更新。

**第 1 步：注册 GitHub 并建仓库**

1. 打开 https://github.com/ 注册账号（邮箱即可，免费）
2. 右上角 **+** → **New repository**
3. 仓库名填 `yude-site`，选 **Public** 或 Private 都行，点 **Create repository**
4. 在新页面点 **uploading an existing file**，把 `yude-site` 文件夹里的**所有文件**拖进去
   （注意：是文件夹**里面**的内容，不是整个文件夹）
5. 拉到底部点 **Commit changes**

**第 2 步：注册 Cloudflare 并连接仓库**

1. 打开 https://dash.cloudflare.com/ 注册账号
2. 左侧 **Workers & Pages** → **Create** → 选 **Pages** → **Connect to Git**
3. 授权 GitHub，选中刚才的 `yude-site` 仓库
4. 构建配置：**Framework preset 选 None**，Build command **留空**，Build output directory 填 `/`
5. 点 **Save and Deploy**，等一分钟，会给你一个网址 `https://xxx.pages.dev`

**第 3 步：以后怎么更新内容**

打开 GitHub 上仓库里的 `content.json` → 点铅笔图标改 → **Commit changes** →
Cloudflare 自动重新部署，约 30 秒后网站更新。**全程不需要你电脑上做任何事。**

> 想做到"改完刷新就生效、连 30 秒都不用等"，就按第二节的**路线 B**，把
> `content.json` 的 GitHub raw 地址填进 `assets/js/config.js`。

**第 4 步（可选）：绑定自己的域名**

- 在 Pages 项目里点 **Custom domains** → **Set up a custom domain**
- 域名在阿里云 / 腾讯云 / Cloudflare 买都行：`.com` 约 60–90 元/年，`.cn` 约 30 元/年
- Cloudflare 会给你两条 DNS 记录，按提示到域名商那里加上即可

### 备选方案

| 方案 | 国内访问速度 | 是否需要备案 | 成本 |
|---|---|---|---|
| Cloudflare Pages（推荐先用） | 一般，部分网络偏慢 | 不需要 | 0 |
| Vercel / Netlify | 一般 | 不需要 | 0 |
| 腾讯云 COS / 阿里云 OSS 静态网站 | 快 | **绑域名需要备案** | 几元/月起 |
| 自己的 VPS + Nginx | 取决于机房 | **绑域名需要备案** | 二三十元/月起 |

**建议**：先用 Cloudflare Pages 免费上线把站跑起来，等有成交量了再花钱备案搬国内。
不要一开始就卡在备案上，那会拖很久。

---

## 六、在线支付（现在不用做）

现在网站是**"展示 + 加 QQ 下单"**模式，零成本，也最省心。以后想接在线支付：

| 方案 | 成本 | 门槛 |
|---|---|---|
| 人工下单（当前） | 0 | 无 |
| 爱发电 | 抽成约 6% | 个人可开 |
| 支付宝当面付 / 微信支付 | 费率约 0.6% | **需要个体户或公司资质** |
| 第四方聚合支付 | 费率约 2–3% | 有跑路风险，不建议 |

加支付不用推翻现在这套网站，以后要接的时候我再加下单页就行。

---

## 七、自检工具

需要 Node.js。改完内容后跑第一条就够：

```powershell
node tools/check.js          # 检查 content.json 格式、数据完整性、页面元素、站内链接、乱码
node tools/sync-content.js   # 把 content.json 同步成兜底数据 data.js
node tools/serve.js          # 本地预览服务（http://127.0.0.1:8080）
```

`check.js` 会明确指出：哪款插件缺少字段、价格写成了字符串、分类名不在列表里、
jQuery 式的链接锚点失效、文件出现乱码等。

另外两个是我做开发时用的（你一般用不上）：

```powershell
powershell -File tools/render.ps1  # 用 Edge/Chrome 无头渲染全部页面并截图到 _shot/
node tools/verify-dom.js           # 检查渲染结果是否正确（需要先跑上面那条）
```

---

## 八、文件结构

```
yude-site/
├── index.html            首页
├── plugins.html          插件商城（分类 / 搜索 / 排序）
├── plugin.html           插件详情（靠网址 ?id=xxx 区分，如 plugin.html?id=police-pro）
├── services.html         服务项目与报价
├── news.html             公告与更新日志
├── about.html            关于与售后政策
├── content.json          ★★★ 全站内容都在这里，改内容只改这个文件
├── assets/
│   ├── css/style.css     全站样式（主题色在文件最上面）
│   └── js/
│       ├── config.js     内容来源配置（要接 GitHub 云更新就改这里）
│       ├── data.js       自动生成的兜底数据，请勿手改
│       └── site.js       页面逻辑，一般不用动
├── tools/                自检与预览脚本
│   ├── check.js          内容体检
│   ├── sync-content.js   生成兜底数据
│   ├── serve.js          本地预览服务
│   ├── render.ps1        批量截图（开发用）
│   └── verify-dom.js     渲染检查（开发用）
├── _shot/                页面整页截图（可删）
└── README.md             本文件
```

---

## 九、还差什么（等你补充）

- [x] ~~QQ 号 / QQ 群号~~ —— 已填：QQ 3782170740，群 1035653433
- [ ] **确认「100+ 在售 / 10+ 自研」的准确说法** —— 现在 `about.html` 写的是
      "在售 100+ 款插件资源，其中 10+ 款完全自研，其余经过实机测试与本地化整理后上架"，
      如果你的实际情况不是这样，告诉我，我改。
- [ ] 真实在售插件清单：名称、价格、功能点（现在 `content.json` 里是 12 款**示例**）
- [ ] 插件截图 / 演示视频
- [ ] Logo 图片
- [ ] 服务报价确认（现在：开服 ¥800 起、定制 ¥300 起、汉化 ¥30 起、修 BUG ¥50 起、指导 ¥200/小时）
- [ ] 客户评价（现在是 4 条示例，建议换成真实反馈）
- [ ] 域名（可选，先用免费二级域名也行）

---

## 十、免责声明

本站为第三方 FiveM 资源开发与技术服务站点，与 Rockstar Games、Take-Two Interactive、Cfx.re
无任何隶属或合作关系。所售插件均为独立开发或经授权整理，不含任何官方素材。
请遵守相关平台服务条款使用。
