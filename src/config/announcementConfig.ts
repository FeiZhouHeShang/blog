import type { AnnouncementConfig } from "../types/config";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "公告",

	// [已修改] 公告列表 - 适配新博客内容
	items: [
		{
			tag: "公告",
			title: "欢迎来访",
			content: "欢迎来到非洲和尚的个人博客！记录魔兽争霸、技术学习、生活感悟。",
			time: "2026-07-27",
			link: "/about/",
			sort: 1,
		},
		{
			tag: "更新",
			title: "最近动态",
			content: "博客刚刚上线，持续更新中！关注萌新大佬魔兽争霸团队，一起交流技术与游戏。",
			time: "2026-07-27",
			sort: 2,
		},
		{
			tag: "友链",
			title: "互换友链",
			content: "正在招募技术类博客友链，要求原创、稳定更新。点击了解更多。",
			time: "2026-07-27",
			link: "/friends/",
			sort: 3,
		},
	],

	// 是否允许用户关闭公告
	closable: true,
};