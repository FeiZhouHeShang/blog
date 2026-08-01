import type { HomeConfig } from "../types/config";

export const homeConfig: HomeConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	// [已修改] 头像改为 QQ 图片
	avatar: "/gallery/测试/QQ.png",

	// 上班时间头像（为空则使用上方 avatar）
	avatarOnWork: "",

	// 下班时间头像（为空则始终使用上方 avatar）
	avatarOffWork: "",

	// 名字
	name: "非洲和尚",

	// 首页展示名字（留空则使用 name）
	displayName: "非洲和尚",

	// 名字右侧徽章文字（如 QQ 号）
	nameBadge: "萌新大佬",

	// 职业/身份标签 - [已修改] 改为学习理念
	occupation: "学习 交流 实践 进步",

	// 个人签名（支持多条，会循环打字+删除效果）
	bio: ["且视他人之疑目如盏盏鬼火，大胆地去走你的夜路"],

	hero: {
		backgroundImage: "/assets/images/home/home.webp",
		backgroundImageMobile: "/assets/images/home/home-mobile.webp",
		speechAccentImage: "/assets/images/home/home2-1.webp",
		// galgame 对话框（写死暗黑主题）。内容全部由此驱动，可自由增删
		dialogue: {
			enabled: true,
			speakers: {
				host: "提命大", // [已修改] 原哈基墩
				visitor: "访客",
			},
			menuTitle: "想聊点什么？",
			typingSpeed: 45,
			autoDelay: 1600,
			// 默认逐句播放的简介，末句后弹出话题菜单
			// [已修改] 移除了QQ群相关内容，更新了对话人物
			intro: [
				{ speaker: "host", text: "欢迎光临～随便坐，别客气。" },
				{ speaker: "host", text: "我是提命大，这儿归我管了～" },
				{
					speaker: "host",
					text: "站长理念：学习、交流、实践、进步。",
				},
				{ speaker: "host", text: "想聊点什么？戳戳下面的话题吧～" },
			],
			// 话题菜单：点击进入逐句对话，末句后返回菜单
			// [已修改] 更新对话内容，移除全栈、QQ群等引用
			topics: [
				{
					title: "关于博客",
					lines: [
						{ speaker: "visitor", text: "这个博客主要写什么？" },
						{
							speaker: "host",
							text: "主要记录技术学习、项目实践、魔兽争霸相关内容。",
						},
						{
							speaker: "host",
							text: "技术方面涵盖Java、前端、AI等方向。",
						},
						{ speaker: "visitor", text: "看起来内容挺丰富的。" },
						{
							speaker: "host",
							text: "忙归忙，但好玩呀——折腾本身就是浪漫～慢慢逛，有问题可以留言～",
						},
					],
				},
				{
					title: "团队介绍",
					lines: [
						{ speaker: "visitor", text: "萌新大佬是什么团队？" },
						{
							speaker: "host",
							text: "萌新大佬是魔兽争霸小团队，成立于2017年。",
						},
						{
							speaker: "host",
							text: "一群热爱魔兽的朋友，一起打游戏、一起成长。",
						},
						{ speaker: "host", text: "有兴趣的话可以通过友链找我们交流～" },
					],
				},
			],
		},
		rightPanel: {
			pill: "BLOG",
			title: "博客",
			diamond: "✦",
			microText: "Welcome To My Blog", // [已修改] 原日文系统提示
		},
		// 玻璃雨珠 + 撞击水花（仅桌面端生效，自动尊重 prefers-reduced-motion）
		rain: {
			enabled: true,
			intensity: 0.6,
			// 留空则随主题自动取色（暗色→白 / 浅色→深灰）；也可填 "#7fb0ff" 或 "127,176,255"
			color: "#ffffff",
		},
	},

	dataLayer: {
		visitImage: "/assets/images/home/home-data-1.webp",
		archiveImage: "/assets/images/home/home-data-2.webp",
		contactImage: "/assets/images/home/home-data-3.webp",
		skillsImage: "/assets/images/home/home-data-4.webp",
	},

	// 展示层：垂直线 → 长柱 → 字体显隐 → 柱子扩全屏 → 衔接百叶窗
	// [已修改] 更新展示层文案
	displayLayer: {
		enabled: true,
		kicker: "内容展示",
		title: "EXPLORE MORE",
		description:
			"记录技术学习的点滴，分享实践与思考，探索无限可能。",
		scrollDistance: 4000,
		pillarFinalWidth: "18vw",
		emitterImage: "/assets/images/home-truncated/td.webp",
	},

	// [已修改] 更新底部滚动条面板内容
	portfolioShutter: {
		enabled: true,
		kicker: "Welcome",
		title: "感谢你的到访",
		description: "欢迎来到非洲和尚的个人博客",
		scrollDistance: 3000,
		finalImage: {
			midgroundImage: "/assets/images/home-truncated/utl-back1.webp",
			backgroundVideo: "/assets/images/home-truncated/utl-back2.webm",
			foregroundImage: "/assets/images/home-truncated/utl-1.webp",
			alt: "2026年 加油！",
		},
		interlude: {
			foreground: "/assets/images/home-truncated/b-1.webp",
			stripLeft: "/assets/images/home-truncated/b-2.webp",
			stripRight: "/assets/images/home-truncated/b-3.webp",
			copyLeft: "萌新",
			copyRight: "大佬",
		},
		panels: [
			{
				title: "技术笔记",
				english: "TECH NOTES",
				description: "Java · 前端 · AI",
				image: "/assets/images/home-truncated/1.webp",
				alt: "技术笔记",
			},
			{
				title: "学习心得",
				english: "LEARNING",
				description: "持续学习 · 不断进步",
				image: "/assets/images/home-truncated/2.webp",
				alt: "学习心得",
			},
			{
				title: "项目实践",
				english: "PROJECTS",
				description: "动手实践 · 记录过程",
				image: "/assets/images/home-truncated/3.webp",
				alt: "项目实践",
			},
			{
				title: "魔兽争霸",
				english: "WARCRAFT",
				description: "萌新大佬 · 团队时光",
				image: "/assets/images/home-truncated/4.webp",
				alt: "魔兽争霸",
			},
			{
				title: "生活随笔",
				english: "LIFE",
				description: "记录生活 · 分享感悟",
				image: "/assets/images/home-truncated/5.webp",
				alt: "生活随笔",
			},
		],
	},

	// 首页技能图标
	skills: [
		{ name: "Astro", icon: "simple-icons:astro", group: "Frontend" },
		{ name: "Svelte", icon: "simple-icons:svelte", group: "Frontend" },
		{ name: "TypeScript", icon: "simple-icons:typescript", group: "Language" },
		{ name: "React", icon: "simple-icons:react", group: "Frontend" },
		{ name: "Tailwind", icon: "simple-icons:tailwindcss", group: "Style" },
		{ name: "Java", icon: "mdi:language-java", group: "Backend" },
		{ name: "Python", icon: "simple-icons:python", group: "Language" },
		{ name: "Spring", icon: "simple-icons:spring", group: "Backend" },
		{ name: "Redis", icon: "simple-icons:redis", group: "Storage" },
		{ name: "MySQL", icon: "simple-icons:mysql", group: "Storage" },
		{ name: "MongoDB", icon: "simple-icons:mongodb", group: "Storage" },
		{ name: "RabbitMQ", icon: "simple-icons:rabbitmq", group: "Backend" },
		{ name: "Docker", icon: "simple-icons:docker", group: "DevOps" },
		{ name: "Linux", icon: "simple-icons:linux", group: "DevOps" },
		{ name: "Nginx", icon: "simple-icons:nginx", group: "DevOps" },
	],

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	// [关键词: home-links] 首页链接配置 - 修改首页底部链接
	links: [
		{
			name: "邮箱",
			icon: "material-symbols:mail",
			url: "mailto:5563000@qq.com",
			showName: false,
		},
		{
			name: "联系我",
			icon: "material-symbols:edit-note-rounded",
			url: "/contact/",
			showName: false,
		},
		{
			name: "RSS",
			icon: "fa7-solid:rss",
			url: "/rss/",
			showName: false,
		},
	],
};
