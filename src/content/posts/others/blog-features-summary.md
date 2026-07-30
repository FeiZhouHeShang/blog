---
title: 博客功能全解析 | 配置指南与二次开发手册
published: 2026-07-28
updated: 2026-07-30
description: 全面解析博客的所有功能模块、配置选项、修改方法和二次开发指南。包含主题、组件、API集成、部署等完整说明。
tags: [博客, 配置指南, 二开, Firefly, Astro, 萌新]
category: 学习文档
pinned: true
draft: false
---

# 博客功能全解析 | 配置指南与二次开发手册

> [!info] 概述
> 本文档全面总结了本博客（Firefly-Mod）的功能特性、技术架构、配置选项和二次开发方法。无论你是想了解博客的完整能力，还是准备进行个性化定制，都能在这里找到答案。
>
> **本文档已置顶**，每次博客有重要更新都会在此追加日志（见末尾「[更新日志](#十三更新日志)」）。

## 一、技术栈概览

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| [Astro](https://astro.build/) | 6.4.6 | 静态站点生成器，基于文件路由 |
| [Svelte](https://svelte.dev/) | 5.x | 交互组件（`client:load` 加载） |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | 类型安全 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | 原子化样式（与 CSS 变量混用） |

### 辅助库

| 技术 | 用途 |
|------|------|
| `@swup/astro` | 页面过渡动画 |
| GSAP + ScrollTrigger | 滚动动画和数字过渡 |
| `@vfx-js/core` | 标题文字特效 |
| `@astrojs/rss` | RSS 订阅生成 |
| Three.js | 音乐播放器 3D 可视化 |
| Pagefind | 全文搜索 |
| Waline / Twikoo / Giscus | 评论系统（可选） |
| Live2D | 看板娘 |
| marked + DOMPurify | Markdown 渲染与安全过滤 |

### 构建与部署

- **包管理器**: pnpm
- **构建工具**: Astro 内置 Vite
- **部署平台**: Cloudflare Pages / Vercel
- **后端**: Cloudflare Workers（AI 搜索、GitHub 贡献、Umami 代理）

---

## 二、萌新快速上手

> [!tip] 第一次接触这个博客？
> 1. 想改文字/链接/图片？ → 直接看 [第八章 修改指南速查](#八修改指南速查)
> 2. 想加新功能？       → 看 [第九章 二次开发入门](#九二次开发入门)
> 3. 想搞懂整体结构？   → 从 [第三章 目录结构](#十项目目录结构) 开始
> 4. 改完没生效？       → 看 [第十一章 常见问题](#十一faq)

### 关键词标记约定

整个项目用 `[关键词: xxx]` 作为锚点，你想找某段代码时直接用编辑器全局搜索 `关键词:` 就能快速定位。比如想改头像就搜 `profile-avatar`。

### 配置文件 vs 组件代码

- **配置文件**（`src/config/`）只放**开关/链接/文字**这类简单内容，改完马上生效
- **组件代码**（`src/components/`）才是 UI 的核心，含 HTML 模板 + 样式 + 客户端脚本

---

## 三、页面结构

### 主要页面路由

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | Hero 展示、文章推荐、统计数据 |
| 文章列表 | `/list` | 三栏布局（左右仪表盘 + 中间文章） |
| 归档页 | `/archive` | 按时间组织的文章归档 |
| 分类页 | `/categories` | 分类导航 |
| 标签页 | `/tags` | 标签导航 |
| 搜索页 | `/search` | Pagefind 全文搜索 |
| 相册页 | `/gallery` | 图片相册展示 |
| 日历页 | `/calendar` | 日历视图（与右仪表盘同步数据） |
| 收藏页 | `/collections` | 收藏 API 展示 |
| 友链页 | `/friends` | 友情链接 |
| 留言板 | `/guestbook` | 访客留言（QQ 群聊风格） |
| 赞助页 | `/sponsor` | 赞助信息 |
| 关于页 | `/about` | 个人介绍 |
| 音乐页 | `/music` | 音乐可视化（Three.js） |
| RSS | `/rss.xml` | RSS 订阅 |

> [!note] 本地路径注意
> `astro.config.mjs` 设置了 `trailingSlash: "always"`，所以本地访问要带斜杠：`http://localhost:4321/list/`（不是 `/list`）。

### 页面开关配置

在 `src/config/siteConfig.ts` 中控制：

```typescript
pages: {
  friends: true,    // 友链页面
  sponsor: true,    // 赞助页面
  guestbook: true,  // 留言板
  gallery: true,    // 相册页面
  collections: true,// 收藏页面
  calendar: true,   // 日历页面
}
```

---

## 四、组件系统

### 全局侧栏架构

> [!note] 布局说明
> 除首页/文章页外，大多数内容页（关于、友链、归档、相册、赞助、收藏、搜索、RSS 等）都用 **三栏布局**：左 `LeftSidebar` + 中内容 + 右 `RightSidebar`。
>
> **例外**：`/guestbook/` 留言板页面**不接入左右侧栏**（详见 guestbook.astro 文件头注释）——留言板本身是仿聊天面板的紧凑布局，自带"访客信息""今日一言"等浮卡，叠加三栏 grid 会导致组件相互重叠。处理方法：直接不传 `sidebar-left`/`sidebar-right` 插槽即可，`MainGridLayout` 会自动 `data-sidebar-position="none"`，CSS 切单栏布局，0 JS/CSS 改动。
> **文章页（列表页 `/list/` 与文章详情页）是参考站风格**：左栏 `<Categories>`（分类导航）+ 右栏 `<SidebarTOC>`（文章目录），不走下方通用侧栏。
> 侧栏显隐：≤1280px 隐藏右栏，≤1024px 隐藏全部。

| 槽位 | 聚合组件 | 实际包含 |
|------|----------|----------|
| 左 `sidebar-left` | `src/components/layout/LeftSidebar.astro` | ProfileCard + IpInfoCard + WeatherWidget + SiteStats |
| 右 `sidebar-right` | `src/components/layout/RightSidebar.astro` | QuoteCard + DouyinHotSearch + RecentUpdates |

> [!warning] 已移除组件（2026-07-28）
> `RightDashboard.astro`（最新文章）与 `CalendarCard.astro`（日历）已删除 —— 日历用不上、最新文章与 `RecentUpdates` 重复，避免功能重叠。

#### ProfileCard 修改要点

```typescript
// [关键词: profile-avatar] 修改头像
const avatarSrc = "/gallery/mxdl-2026/QQ.png";

// [关键词: profile-social-links] 社交按钮配置
const socialLinks = [
  { icon: "simple-icons:qq", href: `tencent://message/?uin=${qqNumber}`, label: "QQ" },
  // 增删按钮都改这里
];
```

#### QuoteCard 修改要点

```typescript
// [关键词: quote-api-category] Hitokoto 分类参数
// 可选值见组件顶部注释（a~z 共 26 个分类）
const hitokotoCategories = "c=i&c=k&c=d&c=b";
```

#### IpInfoCard 修改要点

```typescript
// [关键词: ip-info-blogger-location] 博主位置（用于计算「与博主距离」）
// 不知道经纬度？打开百度地图 https://map.baidu.com/ 搜你城市，右键「这是哪儿」即得
const bloggerLocation = {
  lat: 29.563,    // 纬度
  lng: 106.551,   // 经度
  city: "重庆",
};

// [关键词: ip-info-geo-fixed] 强制锁定显示的城市（绕过 IP 定位）
//   null  = 真实访客 IP 定位（但免费库偶尔会跨省误判，如把重庆误判成云南德宏）
//   "重庆" = 强制所有访客显示「中国 重庆」（仅当你 IP 库总误判、且只想看固定城市时临时用）
const GEO_FIXED = null;
```

### 右侧栏组件修改要点

```typescript
// QuoteCard：[关键词: quote-api-category] Hitokoto 分类参数（a~z 共 26 个分类）
const hitokotoCategories = "c=i&c=k&c=d&c=b";

// DouyinHotSearch：[关键词: hot-board-source] 三源热榜 API（抖音/头条/百度，来自博主自有 dabenshi.cn）
//   https://dabenshi.cn/other/api/hot.php?type=douyinhot
//   https://dabenshi.cn/other/api/hot.php?type=toutiaoHot
//   https://dabenshi.cn/other/api/hot.php?type=baidu

// WeatherWidget：[关键词: weather-geo-fixed] 天气城市锁定（与 IpInfoCard 共用，保证天气位置=地理位置）
//   null = 真实访客 IP 定位（每个访客显示各自城市）； "重庆" = 强制显示重庆（IP 库误判时临时固定）
var GEO_FIXED = null;
```

### 导航组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Navbar | `src/components/navbar/Navbar.astro` | 顶部导航栏，支持下拉菜单 |
| MobileDock | `src/components/navbar/MobileDock.astro` | 移动端底部导航坞 |
| FloatingDock | `src/components/controls/FloatingDock.astro` | 桌面端浮动导航坞 |
| DropdownMenu | `src/components/controls/DropdownMenu.astro` | 下拉菜单 |

### 功能组件

| 组件 | 说明 |
|------|------|
| `MusicPlayer.astro` + `MusicVisualizer.svelte` | 音乐播放器 + Three.js 3D 可视化 |
| `TypewriterText.astro` | 打字机文字效果 |
| `FloatingLyrics.astro` | 浮动歌词 |
| `Live2DWidget.astro` | Live2D 看板娘（鸣潮角色模型） |
| `PageLoader.astro` | 页面加载动画 |
| `EncryptedPost.astro` | 加密文章（frontmatter 加 `password` 字段） |
| `PioMessageBox.astro` | 看板娘消息盒 |
| `SidebarTOC.astro` | 文章页目录导航 |

---

## 五、核心配置文件

### siteConfig.ts（站点主配置）

```typescript
{
  // 基本信息
  title: "非洲和尚的个人博客",
  subtitle: "非洲和尚",
  site_url: "https://tblog.mmzhiku.xyz",
  description: "非洲和尚的个人博客，记录魔兽争霸、技术学习、生活感悟",
  
  // 主题
  themeColor: {
    hue: 165,           // 主题色色相 (0-360)
    fixed: false,       // 是否固定主题色（true 则隐藏切换器）
    defaultMode: "dark" // 默认模式 "light" | "dark" | "system"
  },
  
  // 站点元数据
  siteStartDate: "2026-07-27",
  timezone: "Asia/Shanghai",
  lang: "zh_CN",
  
  // 导航栏
  navbar: {
    logo: { type: "image", value: "/gallery/mxdl-2026/QQ.png" },
    title: "非洲和尚的个人博客",
    widthFull: false,
  },
  
  // 文章列表布局
  postListLayout: {
    defaultMode: "list",   // "list" | "grid"
    showTags: true,
    descriptionLines: 2,
    allowSwitch: true,
    postsPerPage: 9,
  },
  
  // 全局宽度（侧栏+中间区总宽）
  pageWidth: "100rem",     // 1600px
}
```

### homeConfig.ts（首页配置）

控制首页 Hero 区域、统计数据、链接等内容。

### navBarConfig.ts（导航配置）

```typescript
// [关键词: nav-config] 调整顺序
// 当前顺序：主页 → 文章 → 工具导航 → 动态 → 记录 → 关于
// 「动态」是新增的菜单（容纳相册，原「我的」下拉已迁出）
// 「记录」=原「交友互动」改名；「关于」=原「我的」改名
const links = [
  LinkPreset.Home,                  // 主页（图标：home）
  postsNav,                         // 文章（下拉；归档/分类/列表）
  ...(collectionsEnabled ? [LinkPreset.Collections] : []),  // 工具导航（图标：bookmark）
  ...(galleryEnabled ? [momentsNav] : []),                  // 动态（下拉；相册）
  ...(contactEnabled ? [contactNav] : []),                  // 记录（下拉；友链/留言/QQ）
  myNav,                            // 关于（下拉；日历/赞助/关于）
];
```

> **关键修复（2026-07-28）**：一级导航 trigger 图标默认隐藏、只在当前菜单 active 时显示——这是 `dropdown-menu.css` 里有意的设计（避免图标占位导致 hover slider 计算偏移）。用户反馈"参考站所有菜单前都带图标"后改为 `display: inline-flex` 默认显示；slider 由 JS `getBoundingClientRect()` 动态计算，宽度变化自动适配。

### commentConfig.ts（评论系统）

支持 Waline / Twikoo / Giscus / Artalk / Disqus，配置完启用哪个就把其他注释掉。

### fontConfig.ts（字体）

支持本地字体和在线字体（Google Fonts / 字体库）。

---

## 六、主题与样式系统

### CSS 变量体系

主题由 CSS 变量驱动，亮/暗模式自动适配：

```css
:root {
  --primary: hsl(var(--hue) 70% 50%);        /* 主题色 */
  --page-bg: hsl(var(--hue) 20% 98%);       /* 页面背景 */
  --float-panel-bg: hsl(var(--hue) 15% 100%); /* 面板背景 */
  --deep-text: hsl(var(--hue) 30% 15%);     /* 深色文字 */
  --content-meta: hsl(var(--hue) 15% 45%); /* 次要文字 */
  --line-divider: hsl(var(--hue) 15% 90%);  /* 分割线 */
}

:root.dark {
  --page-bg: hsl(var(--hue) 15% 10%);
  --deep-text: hsl(var(--hue) 20% 95%);
  /* ... */
}
```

### 主题定制速查

| 想做的事 | 改哪里 |
|----------|--------|
| 改主题色 | `siteConfig.ts` 的 `themeColor.hue`（0-360） |
| 改默认模式 | `themeColor.defaultMode` |
| 隐藏主题选择器 | `themeColor.fixed = true` |
| 调整全局宽度 | `siteConfig.ts` 的 `pageWidth` |

---

## 七、API 集成

| API | 用途 | 文件位置 |
|-----|------|----------|
| [Hitokoto](https://hitokoto.cn) | 每日一言 | `QuoteCard.astro` |
| [dabenshi.cn 热榜](https://dabenshi.cn) | 三源热榜（抖音/头条/百度） | `DouyinHotSearch.astro` |
| 访客定位（vore.top → pconline → ipwho.is） | IP 归属地（多级容错） | `IpInfoCard.astro` / `WeatherWidget.astro` |
| [IPPure](https://ippure.com) | IP 信息卡图片 | `IpInfoCard.astro` |
| [wttr.in](https://wttr.in) | 天气（按城市查询） | `WeatherWidget.astro` |
| [Umami](https://umami.is) | 站点统计 | `siteConfig.ts` → `analytics.umamiAnalytics` |
| Waline / Twikoo / Giscus | 评论 | `commentConfig.ts` |

> [!note] 定位链路说明
> 访客地理位置的解析优先级为：**/api/ip9.json**（CF Worker / dev Astro endpoint 代理 `ip9.com.cn`，国内最准、中文、带经纬度）→ **vore.top**（UTF-8 中文、CORS）→ **pconline**（JSONP 免 CORS）→ **ipwho.is**（英文回退）。
> 默认 `GEO_FIXED = null`，**每个访客显示自己真实的城市**（重庆访客显示重庆，北京访客显示北京）。若你的 IP 库偶尔把本地误判到别的省份、且你只想固定显示一个城市，可把 `GEO_FIXED` 设成如 `"重庆"` 临时锁定。

### Umami 统计示例

```typescript
analytics: {
  umamiAnalytics: {
    websiteId: "5907656e-d254-4c9e-ad73-5ce40bf184bb",
    scriptUrl: "https://stats.mmzhiku.xyz/script.js",
    pageviews: { enabled: true },
  },
}
```

---

## 八、内容管理

### 文章 Frontmatter 格式

```markdown
---
title: 文章标题
published: 2026-07-28
description: 文章摘要
tags: [标签1, 标签2]
category: 分类名
pinned: true/false   # 是否置顶
draft: false          # 草稿不发布
cover: ./cover.webp   # 封面图（可选）
password: "123456"    # 加密文章（可选）
---
```

### 置顶文章

在 frontmatter 加 `pinned: true` 即可置顶。

### 文章分类

文章放 `src/content/posts/` 的子目录中：
- `ai/` - AI 相关文章
- `others/` - 其他（学习文档、随笔等）
- `projects/` - 项目实战

---

## 九、修改指南速查

| 需求 | 文件 | 搜索关键词 |
|------|------|------------|
| 改站点名称 | `src/config/siteConfig.ts` | `title` / `subtitle` |
| 改 Logo/头像 | `siteConfig.ts` / `ProfileCard.astro` | `profile-avatar` |
| 改主题色 | `siteConfig.ts` | `themeColor` 或 `hue` |
| 改导航顺序 | `src/config/navBarConfig.ts` | `nav-config` |
| 改社交链接 | `src/components/layout/ProfileCard.astro` | `profile-social-links` |
| 改每日一言分类 | `src/components/layout/QuoteCard.astro` | `quote-api-category` |
| 改博主位置 | `src/components/layout/IpInfoCard.astro` | `ip-info-blogger-location` |
| 锁定访客显示城市（防 IP 误判） | `IpInfoCard.astro` / `WeatherWidget.astro` | `ip-info-geo-fixed` / `weather-geo-fixed` |
| 改热榜数据源/条数 | `src/components/layout/DouyinHotSearch.astro` | `hot-board-source` |
| 改列表页三栏宽度 | `src/pages/list.astro` | `list-page-layout` |
| 改分页数量 | `siteConfig.ts` | `postsPerPage` |

### 图标查找

所有图标来自 [icones.js.org](https://icones.js.org/)，搜图标名复制即可。

常用库：
- `material-symbols:xxx` - Material Symbols
- `simple-icons:xxx` - Simple Icons（品牌）
- `mdi:xxx` - Material Design Icons
- `lucide:xxx` - Lucide

---

## 十、二次开发入门

### 如何添加新页面？

1. 在 `src/pages/` 下创建 `.astro` 文件（Astro 文件路由自动生成 URL）
2. 在 `src/config/navBarConfig.ts` 中加导航入口
3. 在 `src/config/siteConfig.ts` 的 `pages` 里加开关（如需）

### 如何添加新组件？

1. 在 `src/components/` 对应子目录建 `.astro`（静态）或 `.svelte`（交互）
2. 用 `[关键词: xxx]` 标记所有可改的地方
3. 在需要的地方 `import` 使用

### 组件文件规范

每个组件文件建议结构：
```
---
// ① 配置区：所有可改常量集中放这里
const xxx = "...";

// ② 数据准备：拉文章、调工具函数
---

<!-- ③ HTML 模板 -->
<div class="...">...</div>

<script is:inline>
  // ④ 浏览器端 JS
</script>

<style>
  /* ⑤ 样式（用 CSS 变量，自动适配主题） */
</style>
```

### 如何启用加密文章？

1. 在 frontmatter 加 `password: "你的密码"`
2. 用 `EncryptedPost.astro` 组件渲染内容

### 如何自定义字体？

在 `src/config/fontConfig.ts` 配置。

---

## 十一、FAQ

### 改完代码浏览器没反应？

- **硬刷新**：Ctrl+Shift+R（Windows）/ Cmd+Shift+R（Mac）
- **检查 dev server**：浏览器开 `http://localhost:4321/`，看是不是 200
- **看终端日志**：编译错误会直接打在那里
- **Vite 缓存异常**：删 `node_modules/.vite` 和 `.astro` 目录后重启 dev

### 图片不显示？

检查 `siteConfig.ts` 的 `imageOptimization.noReferrerDomains`，给防盗链域名加配置。

### 列表页宽度怎么调？

打开 `src/pages/list.astro`，搜索 `list-page-layout`，改 `grid-template-columns` 那行的 `300px` 即可（左右侧栏宽度）。

### 评论系统怎么选？

- 想简单：Waline（自带后端，推荐）
- 想无后端：Giscus（基于 GitHub Discussions）
- 想 QQ 群聊风格：参考本博客留言板改 Waline 主题

### 部署到 Cloudflare Pages 失败？

- 检查 `wrangler.jsonc` 配置
- Cloudflare Workers（后端）需要单独部署 `worker/` 目录
- 静态前端可以直接推 `dist/` 到任何静态托管

---

## 十二、项目目录结构

```
src/
├── components/            # 组件目录
│   ├── common/            # 通用组件（Icon、Button、PageTitle）
│   ├── navbar/            # 导航栏相关
│   ├── layout/            # 布局组件（Sidebar、Dashboard）
│   ├── controls/          # 交互控件（FloatingDock、AnimatedTabs）
│   ├── features/          # 功能组件（Music、Live2D、Comment）
│   ├── widget/            # 小部件（Tags、Calendar、SidebarTOC）
│   ├── pages/             # 页面专用组件（ArticleVirtualList）
│   └── styles/            # 组件专属样式
├── config/                # 所有配置（site、home、nav、comment、font…）
├── content/               # 内容
│   └── posts/             # Markdown 文章
├── pages/                 # 页面路由（Astro 文件路由）
├── layouts/               # 布局模板
│   ├── Layout.astro       # 最外层（head、body、根 CSS 变量）
│   └── MainGridLayout.astro  # 主内容区布局
├── styles/                # 全局样式
│   ├── main.css           # 入口
│   ├── pages/             # 各页面专属
│   ├── layout/            # 布局相关
│   └── components/        # 组件通用样式
├── utils/                 # 工具函数
├── i18n/                  # 国际化
├── plugins/               # Markdown 插件（rehype/remark）
├── types/                 # TypeScript 类型
└── constants/             # 常量
```

---

## 十三、更新日志

> [!tip] 本节记录博客重要的修改与修复

### 2026-07-28 日常吐槽 · 图床按文件名跨会话查重

- 修图床重复：之前每次开编辑器再传同图都会重复入库（4 张一样）。现在加了**两层去重**
  1. **跨会话去重（localStorage）**：浏览器记「`目录/原文件名` → URL」表，30 天内同文件直接复用，**零网络请求**。这是默认行为，不需要任何 token
  2. **跨浏览器同步（API Token）**：可选。在 `.env`（本地）与部署平台环境变量配置 `PUBLIC_IMG_UPLOAD_TOKEN`（图床后台「安全设置 → API Token」生成，已勾选 list + upload 权限），前端会拉 `/api/manage/list?dir=日常吐槽` 拿到真实目录做 5min 缓存，**多浏览器共享查重**。未配置时降级为 localStorage
- **上传文件名匹配必须**：上传 URL 已带 `uploadNameType=origin` —— 用原文件名（不再随机串）。这样 localStorage 才能用 `file.name` 匹配。CF ImgBed 默认转 WebP 仍会产生 `.webp` 副本（衍生品，不影响）
- **UI 提示**细化为「复用图床已有 N 张（零上传）」/「已上传 N 张 · 复用 M」/「跳过同会话 M」，让用户能感知去重在工作
- 修 bug：旧版本 final tip 把循环里的「复用」字样覆盖成「已上传 0 张」，现在按场景分支保留关键信息
- 状态栏加「图床查重 · 📁 目录 · 📚 本地 N 个 · 🌐 跨浏览器 已/未启用」让配置透明
- 9 项去重单测全过（`_test_imgbed_dedup.mjs`）；14 项 Playwright 端到端验证（`_verify_imgbed_dedup.mjs`）覆盖 localStorage 命中 / SHA-256 命中 / 新文件 / 清空索引 / 状态栏
- 仍无图床 Token 时也立即生效；想 100% 去重 + 多设备共享则填 API Token

### 2026-07-28 图床秘钥移出源码（环境变量注入）

- 参考 fqzlr 的 Waline+ImgBed 方案，把图床秘钥从 `editorSecrets.ts` **移出源码**，改走环境变量，源码仓库不再含任何图床秘钥
  1. `PUBLIC_IMG_UPLOAD_TOKEN`：单令牌（list **+ upload** 权限），构建时注入客户端 JS。`Authorization: Bearer` 同时驱动上传（`/upload`）与跨浏览器查重（`/api/manage/list`）
  2. `PUBLIC_IMGBED_UPLOAD_CODE`：**可选兜底**——仅当令牌缺 upload 权限时用的 authCode；当前令牌已含 upload，可删
- 已创建根目录 `.env`（已被 `.gitignore` 忽略，不提交），并同步更新 `.env.example` 与 `src/env.d.ts` 类型声明
- `moments.astro` 的图床 url/token/folder 改为构建时从 `import.meta.env` 读取；上传鉴权**优先 Bearer 单令牌**（fqzlr 方案），无令牌时降级 authCode
- ⚠️ 部署提醒：本博客静态站部署在 **Vercel**（vercel.json 驱动 `pnpm build` → `dist/`）。`PUBLIC_` 前缀变量在 Vercel 构建时注入客户端 JS，所以**你已在 Vercel 控制台配的 `PUBLIC_IMG_UPLOAD_TOKEN` 正是生效的那份**，无需动 Cloudflare（图床 tc.d15.cc.cd 与本地 wrangler dev 的 CF Worker 才是 Cloudflare 相关）。

### 2026-07-28 影视游戏可视化编辑 · 「日常吐槽」模块 · 图床直传去重

**一、影视游戏（movies-games）可视化编辑**
- 新增前端编辑器：页面「编辑列表」→ 对话框 → 填 GitHub fine-grained PAT（仅存浏览器 localStorage，绝不烘焙进公开仓库）→ 经由 GitHub Contents API（GET sha+base64 → 修改后 PUT）直接保存，触发 Cloudflare 自动部署
- TMDB 智能匹配：编辑表单「标题」右侧「🔍 智能匹配」按钮，输入名称即按 TMDB 自动校对并列出候选，一键回填标题 / 封面 / 跳转链接 / 类型；只读 v4 令牌已**烘焙**进 `editorSecrets.ts`，开箱即用
- 编辑器已彻底移除 TMDB key 输入框（不挂在任何前端 DOM 里），公开页零令牌字样

**二、影视游戏入口调整**
- 从顶部独立导航项移入「记录」子菜单（友链 / 留言 / QQ / 影视游戏）

**三、转载图床上传教程并注明出处**
- 新增文章《后台图片自动上传到图床教程》（原作者：团子和蛋糕，来源 blog.tsh520.cn，首发 2026-07-25）
- 出处双重标注：frontmatter `author` + `sourceLink` 自动渲染到文章底部 License 块；正文顶部另加 `[!NOTE]` 转载声明

**四、新增「日常吐槽」模块（/moments/）**
- 复刻「团子和蛋糕」说说模块 + 参考 fqzlr.com 的前端编辑保存逻辑：SSR 列表（Markdown 正文、图片网格、标签、置顶、日期、地点）+ 前端编辑器（GitHub Contents API 保存）
- 图床图片直传：上传到你的 CloudFlare ImgBed（`https://tc.d15.cc.cd/`），上传目录固定为「日常吐槽」，认证码烘焙进 `editorSecrets.ts`
- 导航位置：「日常吐槽」作为「动态」下拉的子项（与相册并列），不替换「动态」本身

**五、图床上传去重**
- 文件 SHA-256 哈希去重：本次会话内同一文件只上传一次，避免图床产生重复副本（同文件重复选择会生成多份副本即此原因）
- URL 去重：同一条目不重复存相同链接；进入编辑态会自动合并已存的重复 URL
- 上传提示区分「已上传 N 张 / 跳过重复 M 张」

**六、相册归属调整**
- 相册（Gallery）从「动态」子项移入「记录」子项（现「记录」含：友链 / 留言 / QQ / 影视游戏 / 相册）

**七、凭据安全分界（重要）**
- ✅ 可烘焙进源码：TMDB 只读令牌、图床上传 authCode（泄露风险低，可随时在对应后台吊销）
- ❌ 绝不烘焙：GitHub PAT（写权限，公开仓库暴露即丢失仓库控制权）→ 仅存浏览器 localStorage

### 2026-07-28（续）侧栏系统重构 · 三源热榜 · 天气/定位修复

**一、文章页改为参考站风格**
- 列表页 `/list/` 与文章详情页：删除原通用侧栏，改为左 `<Categories>`（分类导航）+ 右 `<SidebarTOC>`（文章目录），对齐 blog.tsh520.cn 排版
- 修复 `src/utils/toc-utils.ts` 选择器过宽、误抓隐藏 `PrivacyModal` 标题进目录的 bug（容器限定为 `#main-grid > main #swup-container`）

**二、删除功能重叠组件**
- 删除原右侧浮层目录 `ArticleOutlineRail`（与 `SidebarTOC` 重复），从 `MainGridLayout` 移除
- 删除 `RightDashboard.astro`（最新文章）与 `CalendarCard.astro`（日历）：日历用不上、最新文章与 `RecentUpdates` 重复

**三、三源热榜（DouyinHotSearch）**
- 用博主自有 API `dabenshi.cn` 三 type（douyinhot / toutiaoHot / baidu）替换原抖音热搜，集成到一个仪表盘
- 默认显示抖音热搜 5 条；「更多」展开到 10 条；Tab 切换数据源；「点击加载更多」每次 +10 条（下滑加载改为点击，沙箱内滑动事件不生效）
- 样式按截图重做：标题 + 刷新同行；每条「排名红 + 标题 + 热度 + 缩略图」；刷新与更多放一起

**四、天气 / 访客位置**
- 天气卡与「访客信息」共用同一套定位解析，保证**天气城市 = 地理位置**
- 天气中文化：天气代码 → 中文描述（晴 / 有雷阵雨…），显示「最低 X°C ~ 最高 Y°C」
- 访客位置中文化：国家/省/市翻中文，港澳台合并「中国香港/中国澳门/中国台湾」；省=市去重（重庆市 → 重庆）

**五、定位源升级 + 锁定开关（修复「云南德宏」误判）**
- 根因：免费 IP 库（ipwho.is 底层国际库）把重庆 IP 跨省误判成 `Dehong Daizu Jingpozu Zizhizhou`
- 主库由 pconline（JSONP，偶被网络拦截）升级为 **vore.top**（UTF-8 中文 + CORS + 国内城市级最准）；**并修正 vore.top 解析**：数据包裹在 `j.ipdata` 内、经纬度为 `loc:"lng,lat" 字符串`，归一化已兼容
- `GEO_FIXED` 锁定开关：**默认 `null`（恢复真实访客定位，每个访客显示各自城市）**；仅当你 IP 库总误判、且只想要固定城市时，临时设 `"重庆"` 等绕过
- 解析链路：vore.top → pconline → ipwho.is，多级容错

**六、接入 ip9.com.cn（最准国内库，经 CF Worker 代理绕过 CORS）**
- 新增 `src/workers/cloudflare/ip9/handler.ts` + `src/worker.ts` 注册 `/api/ip9.json` 路由
- 原因：ip9.com.cn 既不支持 CORS、也不支持 JSONP，浏览器端无法直接 fetch；由 Cloudflare Worker 端代理（无浏览器同源限制），前端只调同源 `/api/ip9.json`
- 前端优先级：`/api/ip9.json` > vore.top > pconline > ipwho.is（IpInfoCard / WeatherWidget 的 resolveLocation 均接入 `fetchIp9`）
- 部署注意：仅部署到 **Cloudflare Pages**（你的 wrangler.jsonc 主部署）时 `/api/ip9.json` 由 Worker 接管生效；Vercel 部署下 dev 走 `src/pages/api/ip9.json.ts`（Astro SSR endpoint）做本地回退
- 新增锚点：`ip9-proxy`

**七、代码注释 / 关键词标记**
- 为 `IpInfoCard` / `WeatherWidget` / `DouyinHotSearch` 补全「配置区 / 工具函数 / 业务逻辑 / 事件绑定」分层注释
- 新增锚点：`ip-info-geo-fixed`、`weather-geo-fixed`、`hot-board-source`，全局搜「关键词:」可快速定位

### 2026-07-28 仪表盘优化与代码注释完善

**问题修复：**
- 🐛 修复访客信息卡片中「与博主距离」四个字被强制换行的问题
  - **原因**：`.ip-info-row__label` 写死 `width: 50px`，装不下 4 个中文字
  - **解决**：改为 `min-width: 50px + flex-shrink: 0 + white-space: nowrap`，label 自适应内容且永不换行

**布局调整：**
- 📐 列表页三栏宽度 280px → **300px**，左右仪表盘更舒展
- 中间文章区相应收窄 40px，但仍有约 1000px 阅读宽度

**代码质量：**
- 📝 重写 `IpInfoCard.astro`，拆出**配置区**（萌新改这里就行）、**工具函数**（纯函数）、**业务逻辑**、**事件绑定**四层
- 📝 为 `RightDashboard`、`ProfileCard`、`QuoteCard` 三个仪表盘组件添加完整文件说明和修改指南
- 📝 所有 CSS 规则、JS 函数、HTML 节点前都加了简短注释，搜索「关键词: xxx」能快速定位
- 🏷️ 全部使用 BEM 命名（`block__element--modifier`）

**文档：**
- 📚 本文新增「[第二章 萌新快速上手](#二萌新快速上手)」「[第九章 二次开发入门](#十二次开发入门)」「[第十三章 更新日志](#十三更新日志)」
- 🔧 修正过时的 Astro 版本号（5.x → 6.4.6）、补充新的辅助库
- 📋 重写修改指南速查表，搜索关键词更明确

### 2026-07-28 文章前端编辑器 · 会话令牌 · 标题目录

> 新增网页端「文章编辑器」（`/posts-editor/`，挂在导航「文章」下拉下），可像日常吐槽一样在浏览器里直接写/改/删博客文章，不再需要开 GitHub。

**1. 写 / 改 / 删文章（GitHub Contents API）**
- 列表页展示全部文章（种子来自构建期生成的 `src/data/posts-index.ts`），每项可「编辑 / 删除 / GitHub 回链」
- 编辑：拉取 `.md` 文件 → 表单填 frontmatter（标题/分类目录/文件名/分类标签/描述/标签/日期/置顶/草稿）+ Markdown 正文 → 保存即 `PUT` 到仓库并触发部署
- 新建：填表后 `PUT` 新文件；**改文件名或分类目录 = 移动文件**（自动先删旧路径再建新路径）
- 删除：`DELETE` 文件（带 sha 防冲突）

**2. 会话令牌（本次浏览免重复输入）**
- 输入 GitHub PAT 后点「✅ 验证令牌」→ 调 `GET /user` 校验 → 正确则存入 **sessionStorage**
- 校验后，本次浏览（同一 tab）内所有保存/删除自动带令牌，**不再弹窗要求输入**
- 关闭浏览器或重开 tab → sessionStorage 清空 → 需重新验证（比旧版 localStorage 持久化更安全）
- 日常吐槽编辑器（`/moments/`）同步采用同一套会话令牌机制

**3. 文章图片按「标题目录」归档 + 变更提示**
- 编辑器上传图片时，目录自动为 `/文章/<标题>/`（如标题「笑嘻嘻」→ 图床目录 `文章/笑嘻嘻`）
- 编辑已有文章时**若修改标题**，立即弹出黄色提示：「原图片目录 `/文章/<旧标题>/` 下的图片将失效，请重新上传或手动迁移」——避免改名后图片 404 无感知

**4. 置顶收敛**
- 仅本文（`blog-features-summary.md`）保持 `pinned: true`；`others-blog-firefly-mod.md` 与 `ai-blog-ai-zero-editing.md` 改为 `pinned: false`

### 2026-07-29 全局本地草稿 + 统一上传中心 + 文章编辑器单按钮

**一、全局本地草稿 + 统一上传中心（所有前端可编辑操作合并为 1 次提交）**
- **痛点**：文章 / 日常吐槽 / 影视游戏三个网页编辑器原本各自直推 GitHub，改多篇文章要推多次，且开发 / 线上反复编辑来不及确认
- **新架构**：所有前端可编辑功能的修改**先存本地草稿**（浏览器 IndexedDB，库名 `blog-editor-drafts`），右下角 `FloatingDock` 悬浮坞内出现主题色同步的「上传」按钮（带实时角标），按功能分组列出所有待推送修改
- **点「全部上传」** → 经 GitHub **Git Data API** 把所有改动（多个文件、可跨多个功能）**合并为恰好 1 次 commit** → 触发 Vercel 部署（1 次部署即可上线全部修改）
- **覆盖当前 + 未来**：新增可编辑功能只需 `putDraft({feature, id, label, files})` 即可自动纳入统一上传，无需改上传中心 / 上传管理器
- 图片上传（图床 CDN / 仓库直传）仍即时联网，不计入「1 次提交」（不产生额外 commit）

**二、文章编辑器改为单【修改保存】按钮（脏检测）**
- 原顶栏「💾 存草稿 + 🚀 存本地」两个按钮收敛为**单个、默认隐藏**的【修改保存】
- **脏检测**：打开编辑器时按钮不显示；只有当当前文本与载入时的原始文本**不一致**时，【修改保存】才出现
- 点【修改保存】→ 内容存入**本地草稿**（不直推 GitHub）；全部改完后统一在「上传中心」推送
- 顺带修复严重 bug：此前把编辑器脚本从内联抽出为 ES 模块时丢失一整批辅助函数，导致编辑器自 `45c33e1` 起打开即崩溃；已补全 `collectForm` / `autoSizeTitle` / `mdAction` / `renderPreview` 等 13 个函数，Playwright 端到端验证 4/4 通过

**三、推荐的使用顺序**
1. 在各编辑器里改内容 → 自动 / 手动存为本地草稿
2. 右下角「上传中心」查看所有待推送修改
3. 确认无误 → 点「全部上传」一次性推送并部署

### 2026-07-29 UX 修复（5 项）

围绕"网页端编辑体验"做了 5 项修复，全部经 Playwright 端到端验证（11/12 通过；唯一 FAIL 为与本次无关的预存 `analyticsConfig.ts` 空桩告警，不阻塞构建）。

**① 列表页「写新文章」按钮回归**
- 7-28 全局侧栏重构时把 `PostEditorCard` 从 `list.astro` 移除了，导致列表页左栏只剩分类、看不到「写新文章」入口
- 现已在 `list.astro` 的 `sidebar-left` 重新加回 `<PostEditorCard>`（不传 currentSlug → 只显示「写新文章」），与「编辑当前文章」widget 同源

**② 所有修改可靠存本地（调试 / 线上通用）**
- 编辑器 `collectForm()` 收集全部字段 + `saveDraftLocal()` 写入浏览器 IndexedDB 本地草稿
- 该逻辑在调试态（dev）与推送后的线上态**同源生效**，无需额外改动；配合「上传中心」构成「改 → 存 → 一键推送」闭环

**③ 编辑器新增「一键恢复」（容错）**
- 打开已有文章时冻结载入时的**原始快照**（`_originalRaw` / `_originalPath`）
- 顶栏新增低调的【↩ 恢复原始】按钮：仅当"编辑已有文章 + 已检测到改动"时出现；点击 → 二次确认 → 丢弃未上传的本地草稿并回填原始内容（**不影响已发布的线上内容**）
- 与 ② 的本地草稿、脏检测共同构成"改 → 存 → 可回退"的容错体系

**④ 顶部导航「文章」点击直达列表**
- 之前父项 trigger 仅 hover 展开子菜单、点标签不跳转
- 现在给有子项且自身带 url 的父项（如「文章」）加了 `data-parent-url`，点标签即 SPA 跳转（`navigateToPage('/list/')`）；点 caret 仍展开子菜单。`NavPosts` 的 url 本身即 `/list/`，故直达文章列表

**⑤ 上传按钮融入悬浮坞（去遮挡 + 配色同步）**
- 原来的独立紫色渐变浮动按钮（`#uc-fab`）会遮住右下角功能、且过于醒目
- 已移除，改为在桌面端 `FloatingDock`（右下角悬浮坞）展开栈里新增一个**主题色同步**的「上传」按钮（含未推送数量角标）；折叠态在开关上显示红点，展开后随主题色显示数字角标
- 配色全部改用 `--primary` / `--card-bg` 等主题变量，不再有突兀的紫色

### 2026-07-30 文章编辑器体验大优化（三连布局 · 实时预览 · 滚动锁定同步）

围绕「网页写文章更顺手」做了系统优化，全部经 Playwright 端到端验证。

**一、编辑 / 预览三连布局（属性栏可收起）**
- 编辑器改为「左编辑 · 右实时预览 · 右侧属性栏」三栏；属性栏默认**收起**，编辑 + 预览各占一半满宽（约 2 倍视野）
- 顶栏「⚙ 属性」按钮随时展开 / 收起属性栏（`localStorage` 记忆偏好）
- 「⤢ 全屏」按钮隐藏左右外侧仪表盘、最大化编辑区，默认开启（`localStorage` 记忆）

**二、实时预览（客户端兜底渲染）**
- 因 Astro 6.4 dev server 会把预览接口的 POST body 吞掉（已知坑），预览改为**纯客户端** `mini-markdown.mjs` 行级解析器兜底渲染，编辑即所见
- 支持 H1–H6、嵌套列表、任务列表、表格、callout、围栏代码（带语言角标）、引用、`$$` 公式 / `:::mermaid` 占位等，由 `prose` 排版，观感接近发布页
- 图片插入走顶部工具栏「🖼 插入图片」弹层：可上传文件到图床，也可直接粘贴图片 URL 即时插入光标处

**三、滚动同步改为「锚点锁定式」（核心体验）**
- **默认不同步**：左右各自独立滚动，互不干扰
- **锁定不跳**：把两边滚到你认为了对齐的位置 → 点「🔗 锁同步」→ 记录当前相对位置为锚点，**两边纹丝不动**（不再像旧版那样强行按顶部比例对齐、把你对好的对齐打散）
- **之后按比例联动**：以锚点为基准，编辑区每滚 X 距离，预览按实时比例因子跟随；反向滚亦然；图片 / 字体异步加载等高度变化也保持锚点相对位置

**四、其他**
- 编辑器内左右外侧栏收窄到 200px，给编辑 / 预览让出更多空间

### 2026-07-27 博客初版发布

- 🎉 基于 Firefly 主题（fork 自 fuwari）的二次魔改版本 v2.6.2 上线
- 集成 AI 语义搜索（Cloudflare Vectorize + RAG）
- 集成 QQ 群聊风格留言板
- 集成日历、归档、相册、音乐、Live2D 看板娘等功能
- 部署到 Cloudflare Pages

---

## 十四、文章前端编辑器（网页写 / 改 / 删）

> [!tip] 入口
> 导航栏「文章」下拉 → **文章编辑器**（`/posts-editor/`）。与日常吐槽编辑器同源，均用 GitHub PAT + 图床令牌校验。

**它能干嘛**
- 在浏览器里**新建、编辑、删除**博客文章（`.md` 文件），无需打开 GitHub 网页或本地编辑器
- 编辑时直接修改 frontmatter（标题、分类目录、文件名、分类标签、描述、标签、发布/更新日期、置顶、草稿）和 Markdown 正文
- 正文里**直接上传图片**，图片按「标题」自动归档到图床 `/文章/<标题>/` 目录
- 所有写操作先存为**本地草稿**（浏览器 IndexedDB）；确认无误后，在右下角「上传中心」点「全部上传」，经 GitHub **Git Data API** 把所有改动合并为 1 次提交并触发 Vercel 部署（约 1 分钟生效）

**会话令牌（重点）**
- 第一次输入 GitHub PAT 后点「✅ 验证令牌」，校验通过即存入 **sessionStorage**
- 之后**同一浏览标签内**的保存、删除都自动带令牌，**不再反复要求输入**
- 关闭浏览器 / 重开标签页 → sessionStorage 清空 → 需重新验证（比 localStorage 持久化更安全）

**图片目录与标题联动**
- 上传目录 = `/文章/<文章标题>/`（例：标题「笑嘻嘻」→ `文章/笑嘻嘻`）
- 编辑已有文章**改了标题** → 立即黄色提示：旧标题目录下的图片会失效，需重传或手动迁移图床目录里的文件

**一键恢复（容错）**
- 打开已有文章时，编辑器会冻结载入时的**原始内容快照**
- 一旦检测到内容被改动，顶栏低调出现【↩ 恢复原始】按钮：点它 → 二次确认 → 丢弃未上传的本地草稿并回填原始内容（**不影响已发布的线上内容**），把误操作一键回退
- 与本地草稿、脏检测共同构成"改 → 存 → 可回退"的容错闭环

**编辑器界面与实时预览**
- **三连布局**：左编辑 / 右实时预览 / 右侧属性栏（默认收起，编辑 + 预览各占满宽一半）
- 顶栏「⚙ 属性」展开 / 收起属性栏、「⤢ 全屏」隐藏外侧栏最大化编辑区（均 `localStorage` 记忆）
- 实时预览是**纯客户端**渲染（`src/scripts/mini-markdown.mjs` 行级解析器），编辑即所见；支持标题 / 列表 / 表格 / callout / 代码块 / 引用等，观感接近发布页
- 「🖼 插入图片」弹层支持「上传文件到图床」与「粘贴图片 URL」两种方式，URL 方式免令牌即时插入光标处

**滚动同步（锚点锁定）**
- 默认左右**独立滚动**；把两边滚到你认为了对齐的位置后，点顶栏「🔗 锁同步」**锁死当前相对位置**
- 锁定后两边按比例联动、不再跳回顶部；再点一次取消锁定，回到各自独立滚动
- 关闭 dev server 的预览接口因 Astro 6.4 会吞 POST body，故预览走客户端兜底；发布页仍是服务端 `markdown-render.mjs` 同源渲染

**二次开发**
- 页面：`src/pages/posts-editor.astro`
- 种子列表：`src/data/posts-index.ts`（由 `scripts/gen-posts-index.mjs` 生成，改完文章后可重跑刷新）
- 图床/令牌：`src/config/editorSecrets.ts` + 环境变量 `PUBLIC_IMG_UPLOAD_TOKEN` / `PUBLIC_IMGBED_UPLOAD_CODE`（详见「图床秘钥移出源码」一节）

## 十五、开发约定：代码推送策略

> [!warning] 与 AI 协作时的推送节奏
> 为避免提交历史里塞满琐碎 commit，约定如下：
> - **常规改动**：每 3–5 次更新**累积推送一次**，不要每次小改都推
> - **重大更新**：确认无误后再推送（如新增整页功能、接口变更）
> - **其他情况**：推送前**先询问**是否要推，由你决定
> - AI 在本地会照常 `commit`（便于回滚），但是否 `push` 按上述节奏

---

> [!info] 持续更新
> 本文档将随博客功能迭代持续更新。如有疑问或建议，欢迎在 [留言板](/guestbook/) 交流！
