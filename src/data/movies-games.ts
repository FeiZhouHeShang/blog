/**
 * 影视与游戏 收藏数据层
 * ----------------------------------------------------------------
 * 复刻 blog.tsh520.cn/movies-games 的 Bangumi 风格收藏墙。
 *
 * 数据修改方式（GitHub 编辑回链，零后端）：
 *   页面上的「在 GitHub 编辑」按钮会打开本文件在 GitHub 的网页编辑器，
 *   改完 Commit 即触发 Cloudflare 自动重建部署。无需本地运行服务。
 *
 * 封面方案：热链（远程 URL）。
 *   - 影视：TMDB 官方 CDN  `https://image.tmdb.org/t/p/w200/<path>.jpg`
 *   - 动漫：示例用了站长的图床热链，你也可换成 TMDB / 豆瓣 / 自己的图床
 *   - 若封面加载失败，卡片会优雅降级（隐藏破图，保留标题与状态标签）
 *   想本地存图就把 cover 填成 `/assets/mg/xxx.jpg` 并放到 public 下即可。
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
	/** 评分 0-10，可空 */
	score?: number;
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
 */
export const moviesGames: MediaItem[] = [
  {
    "id": "xuan-an",
    "title": "悬案",
    "cover": "https://image.tmdb.org/t/p/w200/IgAmsxI2xFxUcHZRvEyEpl1myv.jpg",
    "section": "tv",
    "status": "collect",
    "score": 9,
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
    "score": 8,
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
    "score": 8,
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
    "status": "doing",
    "tags": [
      "科幻",
      "热血"
    ],
    "comment": "追更中"
  },
  {
    "id": "dou-po-cang-qiong",
    "title": "斗破苍穹",
    "cover": "https://ph.0824.uk/file/anime/斗破苍穹.jpg",
    "section": "anime",
    "status": "collect",
    "score": 8,
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
    "score": 7,
    "tags": [
      "玄幻"
    ]
  },
  {
    "id": "gong-fu-nv-zu",
    "title": "功夫女足",
    "cover": "https://ph.0824.uk/file/anime/功夫女足.jpg",
    "section": "anime",
    "status": "collect",
    "score": 7,
    "tags": [
      "运动",
      "搞笑"
    ]
  },
  {
    "id": "wan-mei-shi-jie",
    "title": "完美世界",
    "cover": "https://ph.0824.uk/file/anime/完美世界.jpg",
    "section": "anime",
    "status": "on_hold",
    "score": 8,
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
    "score": 7,
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
    "score": 8,
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
    "score": 7,
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
    "score": 7,
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
    "score": 7,
    "tags": [
      "战争",
      "历史"
    ]
  }
];
