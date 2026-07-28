/**
 * 日常吐槽（Daily Grumble）
 * --------------------------------------------------------------------------
 * 数据来源：本文件，由前端编辑器（src/pages/moments.astro）直接读写。
 * 内容完全由站长自己维护；不搬运任何第三方「说说」内容。
 *
 * 字段说明：
 *  - id       唯一标识（URL 锚点用，也用于编辑器定位）
 *  - content  正文，支持 Markdown
 *  - images   图片 URL 数组（上传到图床后回填）
 *  - date     发布时间，格式 "YYYY-MM-DD HH:mm"
 *  - location 地点（可选，如「中国」「杭州」）
 *  - tags     话题标签数组（可选，如 ["测试","吐槽"]）
 *  - pinned   是否置顶（可选）
 */

export interface DailyGrumble {
	id: string;
	content: string;
	images?: string[];
	date?: string;
	location?: string;
	tags?: string[];
	pinned?: boolean;
}

export const dailyGrumbles: DailyGrumble[] = [
	{
		id: "test-upload-image",
		content:
			"吐槽 测试上传图片\n\n这是一条测试吐槽，用来验证图片上传功能。\n点右上角「编辑列表」→ 新增条目，在「图片」栏上传图片到图床即可。",
		date: "2026-07-28 19:41",
		location: "中国",
		tags: ["测试", "吐槽"],
		pinned: true,
	},
];
