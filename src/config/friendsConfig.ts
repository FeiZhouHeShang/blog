import type { FriendsPageConfig } from "../types/config";

/**
 * ============================================================================
 * 友链配置文件 - 使用说明
 * ============================================================================
 *
 * 【关键词: friends-config】友链配置主文件
 *
 * 【友链申请审核流程】（评论系统已移除，改为表单/邮箱申请 + 后台集合）
 * 1. 访客在友链页面点击"如何申请友链"按钮 → 查看申请指南弹窗
 * 2. 访客按弹窗里的模板，通过 applyLink 表单（或邮箱）提交友链申请
 *    - applyLink 在下方 friendsPageConfig.applyLink 配置（如腾讯文档/飞书表单）
 * 3. 你（站长）收到申请后审核；通过则在后台「🔗 友链」集合添加新友链
 *    - 友链列表已不在本文件，改存 src/content/friends/*.md（见 content.config.ts）
 * 4. 添加后 Vercel 自动重建，友链即在页面上线；拒绝则无需操作
 *
 * 【关键词: friends-site-info】本站信息配置（用于申请弹窗展示）
 * - name:   站点名称（会显示在申请指南弹窗中供申请人复制）
 * - desc:   站点描述
 * - url:    站点链接（留空则使用 siteConfig 配置的 URL）
 * - avatar: 站点头像 URL
 * - email:  联系邮箱
 *
 * 【关键词: friends-notes】友链注意事项（弹窗中展示的审核标准）
 * - title:   规则标题
 * - content: 规则描述
 *
 * 【关键词: friends-apply-link】友链申请链接
 * - applyLink: 填写后友链页面会显示"自助申请友链"按钮
 *              可填写第三方友链申请表单链接（如腾讯文档、飞书表单等）
 *              留空则不显示该按钮，仅通过评论区申请
 *
 * 【关键词: friends-add】添加新友链
 * 在下方 friendsConfig 数组中添加对象，格式如下：
 * {
 *   title:   "站点名称",           // [必填] 友链显示名称
 *   imgurl:  "https://.../logo.png", // [必填] 站点头像/Logo URL
 *   desc:    "一句话描述",          // [必填] 站点描述
 *   siteurl: "https://example.com", // [必填] 站点链接
 *   tags:    ["Blog"],             // [可选] 分类标签，用于筛选
 *   weight:  5,                    // [可选] 权重，数字越大越靠前，默认5
 *   enabled: true,                 // [必填] 是否启用，false 可临时隐藏
 * }
 *
 * 【关键词: friends-delete】删除/隐藏友链
 * - 永久删除：直接从数组中删除对应对象
 * - 临时隐藏：将 enabled 设为 false
 *
 * 【关键词: friends-sort】友链排序规则
 * - 默认按 weight 降序，同 weight 时后添加的靠前
 * - randomizeSort 设为 true 时会忽略 weight，每次构建随机排序
 *
 * 【关键词: friends-comment】评论区（已移除）
 * - 评论系统已于 2026-07-30 整体移除（原 Waline 是源码原作者私人服务器），
 *   本 showComment 字段保留仅为兼容性占位，不再控制任何 UI。
 * ============================================================================
 */

// [关键词: friends-page-config] 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，留空则使用 i18n 翻译
	title: "",

	// 页面描述，留空则使用 i18n 翻译
	description: "",

	// [关键词: friends-comment] 是否显示评论区（需 commentConfig.ts 启用评论系统）
	showComment: true,

	// [关键词: friends-sort] 是否开启随机排序（开启后忽略 weight，每次构建随机）
	randomizeSort: false,

	// [关键词: friends-apply-link] 友链自助申请链接
	// 填写后友链页面会显示"自助申请友链（推荐）"按钮
	// 可填写：第三方表单链接 / 邮箱链接 / 自建申请页面
	// 留空则不显示该按钮
	applyLink: "",

	// [关键词: friends-site-info] 本站信息（展示在申请指南弹窗中）
	// 申请人会参考此信息添加你的友链
	siteInfo: {
		name: "非洲和尚的个人博客",
		desc: "萌新大佬的技术分享站",
		url: "",
		avatar: "",
		email: "5563000@qq.com",
	},

	// [关键词: friends-notes] 友链审核标准/注意事项
	// 展示在"如何申请友链"弹窗中，供申请人查看
	notes: [
		{
			title: "互换原则",
			content: "请先将本站添加到您的友链页面，确认后会添加您的友链",
		},
		{
			title: "链接维护",
			content: "友链网站长期无法访问或内容违规，将会被移除",
		},
		{
			title: "内容要求",
			content: "内容积极向上，不含有任何含色情/反动/暴力等违法违规内容",
		},
		{
			title: "站点要求",
			content: "支持 HTTPS，以原创内容为主，能够正常访问且有持续更新",
		},
	],
};

// [关键词: friends-list-moved] 友链列表已迁至后台内容集合
// 自 2026-07-30 起，友链不再写在此配置文件，而是放在 src/content/friends/*.md，
// 由 PagesCMS 后台「🔗 友链」集合管理（萌新零代码增删改）。
// 编辑/添加友链请走后台；本文件仅保留 friendsPageConfig（本站信息 / 注意事项 / 申请入口）。
// 渲染读取见 src/content.config.ts 的 friendsCollection + src/pages/friends.astro。
