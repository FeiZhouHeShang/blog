# PagesCMS 后台使用手册

> 适用：Firefly 博客 PagesCMS 后台（仓库根的 `.pages.yml` 驱动）
> 站点：https://55633000.ccwu.cc ｜ 部署：Vercel（git push 自动构建）
> 配套文档：`docs/博客代码功能综合总结.md`（代码视角）｜ `.workbuddy/memory/MEMORY.md`（架构/坑点）

---

## 一、后台总览

### 1.1 怎么访问 PagesCMS

PagesCMS 是基于 `.pages.yml` 的云端编辑器，从 GitHub 登录后可直接编辑仓库文件。访问路径取决于你配置时的仓库绑定（通常 `https://app.pagescms.org/feizhouheshang/blog`），登录后会自动加载 `.pages.yml` 显示 6 大模块。

### 1.2 6 大模块速查

| 模块 | 干什么 | 改的频率 |
|------|--------|---------|
| 📝 内容页面 | 写/改文章、关于页、友链页、留言、隐私、协议 | 经常 |
| ⚙️ 站点设置 | 站点主配置、个人信息、公告、许可、日历、AI 搜索 | 偶尔 |
| 🎨 布局与外观 | 导航栏、侧边栏、页脚、字体、封面、壁纸、代码块 | 很少 |
| 🔧 功能配置 | 评论、统计、音乐、打赏、友链、樱花、相册、看板娘、PlantUML、工具导航 | 偶尔 |
| 🖼️ 媒体库（左侧栏） | 上传图片到 14 个分组 | 经常 |

### 1.3 保存机制（重要！）

- 在 PagesCMS 后台改文件 → **直接 commit 到 GitHub**（走你登录的账号，commit message 默认包含「Update xxx via Pages CMS」）
- GitHub 收到 push → **Vercel 自动构建** → 约 2-5 分钟生效
- 所以 PagesCMS 改完必须**等待 Vercel 构建完成**，不能立刻在站点看到效果
- 故障排查：https://vercel.com/dashboard → 选项目 → Deployments → 看最新一条状态

---

## 二、6 大模块字段全表（按 `.pages.yml` 顺序）

### 2.1 📝 内容页面

#### ① 博客文章 (`posts`)

| 字段 | 必填 | 说明 | 实际位置 |
|------|------|------|---------|
| `title` | ✓ | 文章标题 | frontmatter.title |
| `published` | ✓ | 发布日期 | frontmatter.published |
| `updated` |   | 最后更新日期 | frontmatter.updated |
| `draft` |   | 草稿（true 则不公开） | frontmatter.draft |
| `description` |   | SEO 摘要（留空自动从正文截取） | frontmatter.description |
| `image` |   | 封面图（图片选择器 → 媒体库） | frontmatter.image |
| `tags` |   | 标签，**下拉 = 实际文章聚合**（详见第五章） | frontmatter.tags[] |
| `category` |   | 分类，下拉 = 实际文章聚合 | frontmatter.category |
| `lang` |   | 语言（zh 默认/en/ja/zh_TW/ru） | frontmatter.lang |
| `pinned` |   | 置顶 | frontmatter.pinned |
| `author` |   | 覆盖默认作者 | frontmatter.author |
| `sourceLink` |   | 转载/翻译原文出处 | frontmatter.sourceLink |
| `licenseName` |   | 许可协议名（如 CC BY-NC-SA 4.0） | frontmatter.licenseName |
| `licenseUrl` |   | 许可协议链接 | frontmatter.licenseUrl |
| `comment` |   | 是否启用评论（默认 true） | frontmatter.comment |
| `password` |   | 文章密码（留空公开） | frontmatter.password |
| `passwordHint` |   | 密码提示 | frontmatter.passwordHint |
| `body` | ✓ | 正文（富文本编辑） | frontmatter 之后的 Markdown 主体 |

**实际文件路径**：`src/content/posts/<目录>/<slug>.md`
- **目录**自动从分类反查：
  - 含「项目|实践」→ `projects/`
  - 含「AI|部署|技术|设计」→ `ai/`
  - 其他 → `others/`
- **slug** 默认从标题生成，重复会自动加后缀

**示例**（写一篇「AI 入门指南」）：
```
title: AI 入门指南
published: 2026-07-30
category: 学习文档        # 目录自动 = others/
tags: [AI, 入门, 教程]   # 这 3 个标签会出现在未来后台标签下拉
body: |
  # AI 入门指南
  ...正文 Markdown...
```

#### ② 关于页面 (`about`)
- 路径：`src/content/spec/about.md`
- 字段：`title`、`body`（富文本）

#### ③ 友链 (`friends`)
- 路径：`src/content/spec/friends.md`（已从 mdx 改为 md）
- 字段：`title`、`description`、`body`（**实际友链数据不在这里编辑**，见下方）

> ⚠️ **重要**：友链的实际数据列表（头像、链接、描述）在 `src/config/friendsConfig.ts` 编辑，不在 PagesCMS 后台。后台只改 `title`/`description`。

#### ④ 留言板 (`guestbook`)
- 路径：`src/content/spec/guestbook.md`
- 字段：`title`、`body`

#### ⑤ 隐私政策 (`privacy`)
- 路径：`src/content/spec/privacy.md`

#### ⑥ 用户协议 (`user-agreement`)
- 路径：`src/content/spec/user-agreement.md`

### 2.2 ⚙️ 站点设置

| 后台标签 | 实际文件 | 用途 |
|----------|---------|------|
| 🌐 站点主配置 | `src/config/siteConfig.ts` | 站点标题、URL、主题色、分页、归档统计、图片优化 |
| 👤 个人信息 | `src/config/homeConfig.ts` | 头像、昵称、签名、社交链接、技能、首页作品 |
| 📢 公告栏 | `src/config/announcementConfig.ts` | 顶部公告栏内容 |
| 📜 许可协议 | `src/config/licenseConfig.ts` | 文章底部版权声明 |
| 📅 日历配置 | `src/config/calendarConfig.ts` | 日历页节假日/生日/日程 |
| 🤖 AI 搜索配置 | `src/config/aiSearchConfig.ts` | RAG 模型/Embedding/向量索引 |

> 这些是 TypeScript 文件，PagesCMS 用 **代码模式** 编辑（语法高亮 + 校验）。改前**先看注释**（每个文件顶部都有中文说明）。

### 2.3 🎨 布局与外观

| 后台标签 | 实际文件 | 用途 |
|----------|---------|------|
| 🧭 导航栏 | `src/config/navBarConfig.ts` | 导航菜单（改顺序/增删菜单项） |
| 📐 侧边栏布局 | `src/config/sidebarConfig.ts` | 左右侧栏组件的开关和排序 |
| 📏 页脚设置 | `src/config/footerConfig.ts` | 页脚自定义 HTML（备案号/版权） |
| 🔤 字体设置 | `src/config/fontConfig.ts` | 全局字体、Google Fonts |
| 🖼️ 文章封面图 | `src/config/coverImageConfig.ts` | 封面图显示 + 随机图 API |
| 🏞️ 背景壁纸 | `src/config/backgroundWallpaper.ts` | 视频背景/水波纹/渐变（**当前未启用**） |
| 💻 代码块样式 | `src/config/expressiveCodeConfig.ts` | 代码高亮主题/折叠/语言徽章 |

### 2.4 🔧 功能配置

| 后台标签 | 实际文件 | 用途 |
|----------|---------|------|
| 💬 评论系统 | `src/config/commentConfig.ts` | Twikoo/Waline/Giscus/Artalk/Disqus |
| 📊 数据统计 | `src/config/analyticsConfig.ts` | Google Analytics/Clarity/Umami/51la |
| 🎵 音乐播放器 | `src/config/musicConfig.ts` | Meting API/本地音乐/歌词 |
| 💰 打赏页面 | `src/config/sponsorConfig.ts` | 支付方式/赞助者列表 |
| 🔗 友链数据 | `src/config/friendsConfig.ts` | **实际友链列表**（这里加友链） |
| 📬 留言板配置 | `src/config/guestbookConfig.ts` | 留言规则公告 |
| 🌸 樱花特效 | `src/config/effectsConfig.ts` | 樱花数量/速度/尺寸（**当前未启用**） |
| 🖼️ 相册配置 | `src/config/galleryConfig.ts` | 相册列表（ID/名称/描述/地点/日期/标签/密码） |
| 🎭 看板娘 | `src/config/pioConfig.ts` | Spine/Live2D 模型/位置/交互/气泡 |
| 📐 PlantUML 图表 | `src/config/plantumlConfig.ts` | PlantUML 服务器 + 明暗主题 |
| 🧰 工具导航/收藏 API | `src/config/collectionsApiConfig.ts` | /collections 页分组与条目 |

### 2.5 🖼️ 媒体库（左侧栏）

14 个分组 → 14 个目录一一对应：

| 后台分组 | 实际目录 | 站点 URL 前缀 |
|----------|---------|--------------|
| 站点资源(全部) | `public/assets/` | `/assets` |
| 文章配图 | `src/content/posts/images/` | `/images` |
| 站点头图 | `public/assets/images/` | `/assets/images` |
| 首页资源 | `public/assets/images/home/` | `/assets/images/home` |
| 个人信息头像 | `public/assets/images/profile/` | `/assets/images/profile` |
| 影视游戏封面 | `public/assets/images/movies-games/` | `/assets/images/movies-games` |
| 日常吐槽图片 | `public/assets/images/moments/` | `/assets/images/moments` |
| 相册图片 | `public/assets/images/gallery/` | `/assets/images/gallery` |
| 友链头像 | `public/assets/images/friends/` | `/assets/images/friends` |
| 留言板图片 | `public/assets/images/guestbook/` | `/assets/images/guestbook` |
| 打赏二维码 | `public/assets/images/sponsor/` | `/assets/images/sponsor` |
| 关于页图片 | `public/assets/images/about/` | `/assets/images/about` |
| 音乐封面 | `public/assets/music/cover/` | `/assets/music/cover` |
| 看板娘模型 | `public/assets/images/pio/` | `/assets/images/pio` |
| 站点视频 | `public/assets/videos/` | `/assets/videos` |

> 上传到「文章配图」时，文件会落到 `src/content/posts/images/<原文件名>`，**URL 是 `/images/<文件名>`**。
> 其他分组都落在 `public/assets/images/...` 下，**URL 与目录结构一一对应**（public/ 目录直接对外可访问）。

---

## 三、常见操作指南

### 3.1 改导航栏

**文件**：`src/config/navBarConfig.ts`

**改导航顺序**（line 87-94）：
```ts
const links: (NavBarLink | LinkPreset)[] = [
  LinkPreset.Home,        // 主页
  postsNav,               // 文章（带下拉）
  ...(siteConfig.pages.collections ? [LinkPreset.Collections] : []), // 工具导航
  momentsNav,             // 动态
  ...(contactNav ? [contactNav] : []), // 记录
  myNav,                  // 关于
];
```
按需调整顺序即可。

**增删导航项**：在 `src/constants/link-presets.ts` 里加枚举 + URL/图标；或从 `LinkPreset` 类型中选已有的。详见该文件 line 117 附近的注释。

**改下拉菜单子项**（如「文章」下拉）：
- `postsNav.children`（line 27）：`[LinkPreset.Archive, LinkPreset.Categories, LinkPreset.PostList]`
- 想加/去某项：编辑这个数组

### 3.2 改主题色 / 站点标题

**文件**：`src/config/siteConfig.ts`

- `siteTitle`：浏览器标签页 + 站点主标题
- `siteUrl`：站点 URL（影响 RSS、OG、sitemap）
- `themeColor.hue`：主题色色相（0-360，默认 165 = 青绿）
- `pagination.pageSize`：每页文章数

改完即生效（Vercel 重新构建后）。

### 3.3 增/改 友链

**文件**：`src/config/friendsConfig.ts`

```ts
export const friendsConfig = {
  friends: [
    {
      name: "好友站点名",
      avatar: "/assets/images/friends/avatar.png", // 媒体库「友链头像」分组上传
      description: "一句话简介",
      url: "https://example.com",
      tags: ["博客", "技术"],         // 显示用
      weight: 5,                      // 排序权重（越大越靠前）
    },
    // ... 更多
  ],
};
```

### 3.4 改公告栏

**文件**：`src/config/announcementConfig.ts`

```ts
{
  enable: true,
  title: "公告标题",
  content: "公告正文",
  link: { enable: false, text: "", url: "" },
}
```

### 3.5 增文章（最常用）

1. 登录 PagesCMS → 「内容页面」 → 「博客文章」 → 「新建」
2. 填字段（title 必填，published 必填）
3. **tags** 选已有 或 点「+ 新建」输入新标签
4. **category** 选已有 或 新建
5. **body** 富文本编辑（支持 Markdown 快捷语法）
6. 点击「保存」→ PagesCMS 会 commit 到 GitHub

**注意**：
- 新建文章用的目录 = 分类反查的目录，**普通文章默认进 `others/`**，项目类进 `projects/`，技术类进 `ai/`
- 改完需等 2-5 分钟 Vercel 构建

### 3.6 改首页作品（推荐位）

**文件**：`src/config/homeConfig.ts` 里的 `works` 数组。

```ts
works: [
  { title: "作品 1", description: "...", image: "/assets/images/home/...", url: "/posts/...", tags: ["..."] },
],
```

---

## 四、标签/分类自动同步机制

### 4.1 前后台为什么对不上？

`.pages.yml` 早期硬编码了 9 个示例标签（演示/示例/Markdown/...），跟实际文章完全脱节。已修复。

### 4.2 现在怎么同步？

**机制**：每次 Vercel 构建，prebuild 钩子会跑 `scripts/gen-posts-index.mjs`，该脚本会：

1. 扫描 `src/content/posts/**/*.md`
2. 聚合所有 frontmatter.tags → 去重 + 排序（按文章数降序）
3. 写入 `cms-data/tags.json`（44 个标签，当前）
4. 同样聚合 category → `cms-data/categories.json`

**`.pages.yml` 引用这两个文件**：
```yaml
tags:
  options:
    values: data://cms-data/tags.json    # 标签下拉 = 实际文章聚合
category:
  options:
    values: data://cms-data/categories.json  # 分类下拉 = 实际文章聚合
```

PagesCMS 启动时读这两个文件 → 后台下拉 = 前台编辑器下拉 = 实际文章里的标签/分类。

### 4.3 怎么让新标签出现？

1. 在某篇文章 frontmatter.tags 里加新标签（通过 PagesCMS 编辑 或 GitHub 直接 push）
2. 等待 Vercel 重新构建（约 2-5 分钟）
3. PagesCMS 后台刷新 → 「文章 → 字段 → tags」下拉里就有新标签了

### 4.4 不想等构建？

本地开发：
```bash
node scripts/gen-posts-index.mjs   # 重跑聚合
git add cms-data/ && git commit -m "chore: refresh tags aggregation"
git push                            # 触发 Vercel 重建
```

---

## 五、/posts-editor/ 前端编辑器（高级用户）

> 这是「站内编辑器」，比 PagesCMS 更强但需要 GitHub PAT 写权限。**普通编辑用 PagesCMS 就够了。**

### 5.1 三连布局

打开 `/posts-editor/`：
- **左列**：标题 + Markdown 工具栏（B/I/H1-3/代码块/列表/链接/图片/分割线）+ 正文 textarea
- **中列**：实时预览（输入即渲染，dev 走完整管线 = 发布页，prod 走客户端 mini-markdown 兜底）
- **右列**：属性面板（Slug、封面、描述、标签三连框、分类、发布日期、草稿/置顶、图片上传）

左右两侧是全局仪表盘（MainGridLayout 的 LeftSidebar/RightSidebar），编辑时它们贴边显示，中间三列变宽。

### 5.2 三种保存方式

| 操作 | 行为 | 需要 PAT |
|------|------|---------|
| 💾 保存草稿 | 写进浏览器 IndexedDB（不推送） | 不需要 |
| 🔑 导入密钥 | 读 PAT 文件 → 写入 sessionStorage | — |
| 🚀 发表呀 | 保存草稿 + 打开「上传中心」统一推送 | 需要 |

「上传中心」是全站统一推送 UI（站点任意页右下角悬浮按钮），合并所有本地草稿 → 1 次 commit。

### 5.3 PAT 怎么生成

工具栏「🔑 导入密钥」→ 点击 → 文件选择器 → 选你的 PAT `.txt` 文件（PAT 内容贴进 `.txt` 即可，文件名随意）

PAT 在 GitHub 生成：
- 访问 `https://github.com/settings/personal-access-tokens/new`
- 选 **Fine-grained token**（不是 classic）
- Repository access: `FeiZhouHeShang/blog`（Only this）
- Permissions:
  - **Contents**: Read and Write
  - **Metadata**: Read-only（自动）
- 生成后把 token 字符串保存到 `.txt` 文件（如 `github-pat.txt`）
- 通过文件选择器导入（PAT 只在 sessionStorage，不会持久化）

> **会话级**：PAT 存 sessionStorage，关浏览器就清空。不会上传服务器。

---

## 六、故障排查

### 6.1 后台改了文件但线上没更新

1. 看 https://github.com/FeiZhouHeShang/blog/commits/main 是否有新 commit
   - 没有 → PagesCMS 没保存成功（重新点保存）
   - 有 → Vercel 还没构建完
2. 看 https://vercel.com/dashboard → 选项目 → Deployments
   - 最新一条是「Building」→ 等待（通常 2-5 分钟）
   - 最新一条是「Error」→ **点开看日志，把报错贴给 AI 修**
3. 部署成功但页面还显示旧内容 → **硬刷新**（Ctrl+Shift+R）清浏览器缓存

### 6.2 标签/分类下拉还是旧的

1. 看 `cms-data/tags.json` 是不是最新的（在 GitHub 仓库里看）
2. 旧 → Vercel prebuild 没跑（`scripts/gen-posts-index.mjs` 失败）
3. 强制刷新聚合：
   ```bash
   node scripts/gen-posts-index.mjs
   git add cms-data/
   git commit -m "chore: 刷新标签聚合"
   git push
   ```

### 6.3 编辑器报构建错误

**最常见**：Vercel 报 `[NoAdapterInstalled]` → SSR 端点 + 无 adapter。

**修复模式**（参见 .workbuddy/memory/MEMORY.md）：
- 静态博客不能有 `prerender=false` 的 SSR 路由
- 编辑器实时预览改走 dev 模式（`/api/render-preview/`）+ prod 客户端兜底（`src/scripts/mini-markdown.mjs`）

如果 Vercel 报错，把错误**完整截图**贴给 AI：包括 `path:` `Error:` `at ` 三段。

### 6.4 后台改 `friendsConfig.ts` 后刷新还是旧的友链

`friendsConfig.ts` 是构建期静态生成的（不是运行时读），Vercel 重新构建后生效。

### 6.5 媒体库上传后 URL 404

1. 看 `cms-data/` 之外是否同步进了 `public/` 或 `src/content/posts/images/`
2. PagesCMS 媒体库的配置路径（在 `.pages.yml` 的 `media` 段）写了 `input` → 文件实际落到 `input` 目录
3. `output` 是 URL 前缀，必须以 `/` 开头

---

## 七、推送约定（与 AI 协作）

按用户定：
- **常规改动**：累积 3-5 次后一次性推（PagesCMS 改完直接 push 即可）
- **重大改动**（如本次「三连布局重构」）：先在本地完成 → AI 截图/录屏 → 确认后再推
- **询问**：其他变更先问 AI

AI 本地默认 **照常 commit**（即使没推），方便你随时决定推送节奏。
