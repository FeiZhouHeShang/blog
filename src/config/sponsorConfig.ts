import type { SponsorConfig } from "../types/config";

export const sponsorConfig: SponsorConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	// [已修改] 2026-07-30 赞助页关闭，配置清空
	title: "赞助",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "感谢您的支持",

	// 赞助用途说明
	usage: "",

	// 是否显示赞助者列表
	showSponsorsList: false,

	// 赞助方式列表（已清空）
	methods: [],

	// 赞助者列表（已清空）
	sponsors: [],
};
