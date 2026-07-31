import type { SiteConfig } from "@/types/config";
import { fontConfig } from "./fontConfig";
import { analyticsConfig } from "./analyticsConfig";

// 定义站点语言
// 语言代码，例如：'zh_CN', 'zh_TW', 'en', 'ja', 'ru'。
const SITE_LANG = "zh_CN";

// 主题基于 MmzMing 的 my-blog 二次开发
export const siteConfig: SiteConfig = {
	// 站点标题
	title: "非洲和尚的个人博客",

	// 站点副标题
	subtitle: "非洲和尚",

	// 站点 URL
	site_url: "https://55633000.ccwu.cc",

	// 站点描述
	description: "非洲和尚的个人博客，记录魔兽争霸、技术学习、生活感悟",

	// 站点关键词
	keywords: [
		"非洲和尚",
		"魔兽争霸",
		"萌新大佬",
		"AI",
		"QQ",
		"博客",
		"技术博客",
	],

	// 主题色
	themeColor: {
		// 主题色的默认色相，范围从 0 到 360。例如：红色：0，青色：200，蓝绿色：250，粉色：345
		hue: 165,
		// 是否对访问者隐藏主题色选择器
		fixed: false,
		// 默认模式："light" 亮色，"dark" 暗色
		defaultMode: "dark",
	},

	// 页面整体宽度（单位：rem）
	// 数值越大可以让页面内容区域更宽
	// 在使用单侧栏边栏时，建议调低一些宽度以获得更好的视觉效果。
	pageWidth: 100,

	// Favicon 配置
	// [已修改] Favicon 改为 QQ 图片
	favicon: [
		{
			src: "/gallery/mxdl-2026/QQ.png",
			sizes: "any",
		},
	],

	// 导航栏配置
	navbar: {
		// 导航栏Logo
		// 支持三种类型：
		// 1. Astro图标库: { type: "icon", value: "material-symbols:home-pin-outline" }
		// 2. 本地图片（public目录，不优化）: { type: "image", value: "/assets/images/logo.webp", alt: "Logo" }
		// 3. 本地图片（src目录，自动优化但会增加构建时间，推荐）: { type: "image", value: "assets/images/logo.webp", alt: "Logo" }
		// 4. 网络图片: { type: "url", value: "https://example.com/logo.png", alt: "Logo" }
		logo: {
			type: "image",
			// [已修改] Logo 改为 QQ 图片
			value: "/gallery/mxdl-2026/QQ.png",
			alt: "logo",
		},
		// 导航栏标题
		title: "非洲和尚的个人博客",
		// 全宽导航栏，导航栏是否占满屏幕宽度
		widthFull: false,
	},

	// 站点开始日期，用于统计运行天数 - [已修改] 设置为今天作为建站第一天
	siteStartDate: "2026-07-27",

	// 站点时区（IANA 时区字符串），用于格式化bangumi、rss里的构建日期时间等等..
	// 示例："Asia/Shanghai", "UTC", 如果为空，则按照构建服务器的时区进行时区转换
	timezone: "Asia/Shanghai",

	// 上下班时间配置（24小时制），用于首页头像涟漪动效和状态按钮
	workHours: {
		start: 9, // 上班时间 9:00
		end: 18, // 下班时间 18:00
		// 工作日范围，0=周日 1=周一 ... 6=周六，默认周一到周五
		workDays: [1, 2, 3, 4, 5, 6],
	},

	// 提醒框（Admonitions）配置，修改后需要重启开发服务器才能生效
	// 主题：'github' | 'obsidian' | 'vitepress'，每个主题风格和语法不同，可根据喜好选择
	rehypeCallouts: {
		theme: "github",
	},

	// 文章页底部的"上次编辑时间"卡片开关
	showLastModified: true,

	// 文章过期阈值（天数），超过此天数才显示"上次编辑"卡片
	outdatedThreshold: 30,

	// 是否开启分享海报生成功能
	sharePoster: true,

	// OpenGraph图片功能：开启后每篇文章构建时生成带标题的专属分享卡(1200x630 PNG)。
	// 当前仅 2 篇文章，构建开销可忽略；文章变多后构建会变慢，可在本地调试时临时关。
	generateOgImages: true,

	defaultOgImage: "/assets/images/aut.webp",

	// 页面开关配置 - 控制特定页面的访问权限，设为false会返回404
	pages: {
		// 友链页面开关
		friends: true,
		// 赞助页面开关（已关闭，2026-07-30）
		sponsor: false,
		// 留言板页面开关（已移除：留言板页面与组件整体删除，Waline 是原作者私人服务器）
		guestbook: false,
		// 相册页面开关
		gallery: true,
		// 收藏API页面开关
		collections: true,
		// 日历页面开关
		calendar: true,
	},

	// 分类导航栏开关，在首页和归档页顶部显示分类快捷导航
	categoryBar: true,

	// 文章列表布局配置
	postListLayout: {
		// 默认布局模式："list" 列表模式（单列布局），"grid" 网格模式（多列布局）
		defaultMode: "list",
		// 移动端默认布局模式，不设置则跟随 defaultMode
		mobileDefaultMode: "list",
		// 是否在文章列表中显示标签
		showTags: true,
		// 文章简介显示行数，设为 0 则不截断
		descriptionLines: 2,
		// 是否允许用户切换布局
		allowSwitch: true,
		// 网格布局配置，仅在 defaultMode 为 "grid" 或允许切换布局时生效
		grid: {
			// 是否开启瀑布流布局，同时有封面图和无封面图的混合文章推荐开启
			masonry: false,
			// 网格模式卡片最小宽度(px)，浏览器根据容器宽度自动计算列数
			columnWidth: 320,
		},
	},

	// 分页配置
	pagination: {
		// 每页显示的文章数量
		postsPerPage: 9,
	},

	// 统计分析（配置已抽到 src/config/analyticsConfig.ts，便于 PagesCMS 后台管理；
	// 各统计组件仍经 siteConfig.analytics 读取，无需改动）
	analytics: analyticsConfig,

	// 归档统计配置
	archiveStats: {
		// 年度文章目标，用于计算归档页的完成率
		annualPostGoal: 50,
		github: {
			enabled: false,
			username: "", // 填写 GitHub 用户名后启用
		},
	},

	// 图像优化及响应式配置
	// 图像优化压缩只保留avif或webp
	// 响应式图像是为在不同设备上提高性能而调整的图像。这些图像可以调整大小以适应其容器，并且可以根据访问者的屏幕尺寸和分辨率以不同的大小提供。
	// Astro 仅能对 src 目录下的图像进行优化，src 目录下的图像越多，构建时间会越长
	// Astro 图像文档 https://docs.astro.build/zh-cn/guides/images/
	imageOptimization: {
		// 输出图片格式
		// - "avif": 仅输出 AVIF 格式（最新技术，最小体积，目前兼容性较低）
		// - "webp": 仅输出 WebP 格式（体积适中，兼容性好）
		// - "both": 同时输出 AVIF 和 WebP（推荐，浏览器自动选择最佳格式）
		formats: "webp",
		// 图片压缩质量 (1-100)，值越低体积越小但质量越差，推荐 70-85
		quality: 85,
		// 为特定域名的图片添加 referrerpolicy="no-referrer" 属性
		// 支持通配符 *，例如：["i0.hdslb.com", "*.bilibili.com"]
		// 可解决指定域名图片加载时的 403 问题（如防盗链图片）
		noReferrerDomains: ["*.alcy.cc"],
	},

	// 字体配置
	// 在src/config/fontConfig.ts中配置具体字体
	font: fontConfig,

	// 站点语言，在本配置文件顶部SITE_LANG定义
	lang: SITE_LANG,
};
