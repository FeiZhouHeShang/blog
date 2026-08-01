/**
 * 影视与游戏 收藏数据层
 * ----------------------------------------------------------------
 * 复刻 blog.tsh520.cn/movies-games 的 Bangumi 风格收藏墙。
 *
 * 【怎么改数据】
 *   方式一（推荐，零后端）：打开 /movies-games/ 页面 → 点「✏️ 编辑列表」
 *     → 在标题框输入作品名 → 点「🔍 智能匹配」会从 TMDB 自动拉取
 *        类型 / 评分 / 简介 / 外链（标题框失焦或按回车也会自动搜索，
 *        且若只搜到 1 条就直接自动填入，连候选都不用点）。
 *     → 改完点「💾 存本地」，再在右下角「上传中心」统一推送（合并成 1 次提交）。
 *   方式二（不熟编辑器）：点页面底部「在 GitHub 编辑」直达本文件网页编辑器，
 *     手动改完 Commit 即触发 Vercel 重新部署，无需本地跑服务。
 *
 * 【封面 cover 怎么填（重要）】
 *   智能匹配会先尝试填 TMDB 官方的 image.tmdb.org 封面。但 **国内访问
 *   image.tmdb.org 经常被墙 / 很慢**，所以封面你大概率要手动给：
 *     - 留空          → 卡片显示「标题首字」占位（不会破图，最省事）。
 *     - 远程热链      → 直接填图片直链，如豆瓣条目页的图片、Bangumi 封面、
 *                       或你自己的图床链接（形如 https://...xxx.jpg）。
 *     - 本地图片      → 把图片放进仓库 `public/assets/images/movies-games/xxx.jpg`，
 *                       这里填 `/assets/images/movies-games/xxx.jpg` 即可
 *                       （随站点一起部署，最稳，不受墙影响）。
 *   编辑器里「封面 URL」输入框下方有同款提示；自动匹配填的 TMDB 链接若加载
 *   不出，直接在该框手动换成上面任一方式即可。
 *
 * 【字段说明】（完整接口见下方 MediaItem）
 *   id         唯一标识，建议拼音/英文 slug，如 "xian-ni"（同 slug 会被判冲突）。
 *   title      作品名称（必填）。
 *   cover      封面图 URL，规则见上；留空 = 首字占位。
 *   section    类型：movie 电影 / tv 电视剧 / anime 动漫 / documentary 纪录片 / game 游戏。
 *   status     状态：collect 看过 / doing 在看(游戏=在玩) / wish 想看 / on_hold 搁置 / dropped 抛弃。
 *   tags       类型副标签，如 ["悬疑","犯罪"]。
 *   comment    悬停评语（一句话感想）。
 *   bangumiUrl 外链，如 Bangumi / 豆瓣条目页；留空则卡片不可点击跳转。
 */

export type MediaSection = "movie" | "tv" | "anime" | "documentary" | "game";

export type MediaStatus = "collect" | "doing" | "wish" | "on_hold" | "dropped";

export interface MediaItem {
	/** 唯一标识（建议用拼音/英文 slug） */
	id: string;
	/** 作品名称 */
	title: string;
	/** 封面图远程 URL；留空则渲染占位渐变 */
	cover: string;
	/** 类型：电影/电视剧/动漫/纪录片/游戏 */
	section: MediaSection;
	/** 状态：看过/在看/想看/搁置/抛弃（游戏在看=在玩） */
	status: MediaStatus;
	/** 类型副标签，如 ["悬疑","犯罪"] */
	tags?: string[];
	/** 悬停评语 */
	comment?: string;
	/** 可选：外链（如 Bangumi / 豆瓣条目） */
	bangumiUrl?: string;
}

/**
 * 示例数据：以下 cover 直接热链参考站图床 / TMDB，仅作骨架演示。
 * 把这里替换成你自己的影视/游戏记录即可。
 *
 * ── 一条「带完整注释」的范例，照抄改字就行 ───────────────────────────
 * {
 *   id: "xian-ni",                      // 唯一 slug，别和别的条目重复
 *   title: "仙逆",                       // 作品名（必填）
 *   cover: "/assets/images/movies-games/xian-ni.jpg", // 留空=首字占位；本地图放 public/assets/images/movies-games/ 下；或填豆瓣/Bangumi/图床直链
 *   section: "anime",                   // movie 电影 / tv 电视剧 / anime 动漫 / documentary 纪录片 / game 游戏
 *   status: "collect",                  // collect 看过 / doing 在看 / wish 想看 / on_hold 搁置 / dropped 抛弃
 *   tags: ["玄幻", "热血"],              // 副标签，可空
 *   comment: "国漫扛把子",               // 悬停评语（你自己的观后感/心得），可空
 *   bangumiUrl: "https://bangumi.tv/subject/12345", // 外链，可空（留空卡片不跳转）
 * },
 * ──────────────────────────────────────────────────────────────
 */
export const moviesGames: MediaItem[] = [
  {
    "id": "xuan-an",
    "title": "悬案123",
    "cover": "https://image.tmdb.org/t/p/w200/IgAmsxI2xFxUcHZRvEyEpl1myv.jpg",
    "section": "tv",
    "status": "collect",
    "tags": [
      "悬疑",
      "犯罪"
    ],
    "comment": "近期为数不多的还不错的悬疑剧"
  },
  {
    "id": "xian-ni",
    "title": "仙逆",
    "cover": "https://ph.0824.uk/file/anime/仙逆.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "玄幻",
      "热血"
    ],
    "comment": "国漫扛把子，剧情渐入佳境"
  },
  {
    "id": "jiang-shi-xiao-yuan",
    "title": "僵尸校园",
    "cover": "https://ph.0824.uk/file/anime/僵尸校园.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "丧尸",
      "惊悚"
    ],
    "comment": "韩漫改，节奏紧凑"
  },
  {
    "id": "tun-shi-xing-kong",
    "title": "吞噬星空",
    "cover": "https://ph.0824.uk/file/anime/吞噬星空.jpg",
    "section": "anime",
    "status": "on_hold",
    "tags": [
      "科幻",
      "热血"
    ],
    "comment": "追更中，先搁置"
  },
  {
    "id": "dou-po-cang-qiong",
    "title": "斗破苍穹",
    "cover": "https://ph.0824.uk/file/anime/斗破苍穹.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "玄幻"
    ]
  },
  {
    "id": "dou-luo-da-lu",
    "title": "斗罗大陆",
    "cover": "https://ph.0824.uk/file/anime/斗罗大陆.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "玄幻"
    ]
  },
  {
    "id": "shao-lin-zu-qiu",
    "title": "少林足球",
    "cover": "https://image.tmdb.org/t/p/w200/wWba3TaojhK7NdycRhoQpsG0Fv6.jpg",
    "section": "movie",
    "status": "collect",
    "tags": [
      "喜剧",
      "运动"
    ],
    "comment": "星爷经典，百看不厌"
  },
  {
    "id": "gong-fu-nv-zu",
    "title": "功夫女足",
    "cover": "https://ph.0824.uk/file/anime/功夫女足.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "运动",
      "搞笑"
    ]
  },
  {
    "id": "da-wang-rao-ming",
    "title": "大王饶命",
    "cover": "https://ph.0824.uk/file/anime/大王饶命.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "搞笑",
      "异能"
    ],
    "comment": "吕树是真的皮"
  },
  {
    "id": "wan-mei-shi-jie",
    "title": "完美世界",
    "cover": "https://ph.0824.uk/file/anime/完美世界.jpg",
    "section": "anime",
    "status": "on_hold",
    "tags": [
      "玄幻"
    ],
    "comment": "画风好，更新慢"
  },
  {
    "id": "zi-chuan",
    "title": "紫川",
    "cover": "https://ph.0824.uk/file/anime/紫川.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "战争",
      "权谋"
    ]
  },
  {
    "id": "hua-jiang-hu",
    "title": "画江湖之不良人",
    "cover": "https://ph.0824.uk/file/anime/画江湖之不良人.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "武侠",
      "国漫"
    ]
  },
  {
    "id": "shen-yin-wang-zuo",
    "title": "神印王座",
    "cover": "https://ph.0824.uk/file/anime/神印王座.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "玄幻"
    ]
  },
  {
    "id": "xing-chen-bian",
    "title": "星辰变",
    "cover": "https://ph.0824.uk/file/anime/星辰变.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "玄幻",
      "修真"
    ]
  },
  {
    "id": "nuo-man-di",
    "title": "诺曼底72小时",
    "cover": "https://ph.0824.uk/file/anime/诺曼底72小时.jpg",
    "section": "anime",
    "status": "collect",
    "tags": [
      "战争",
      "历史"
    ]
  }
];
