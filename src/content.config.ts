import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
		author: z.string().optional().default(""),
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),
		comment: z.boolean().optional().default(true),
		password: z.string().optional().default(""),
		passwordHint: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spec" }),
	schema: z.object({}),
});

/**
 * [关键词: moments-collection] 日常吐槽 / 说说 内容集合
 * --------------------------------------------------------------------------
 * 数据来源：src/content/moments/*.md（每条说说一个文件）
 * 编辑方式：后台 PagesCMS「💬 日常吐槽（说说）」集合（见仓库根 .pages.yml）
 *   —— 在后台增删改即可，提交后 Vercel 自动重建上线（无需改代码）。
 * 正文 = Markdown 文件主体（PagesCMS 自动提供编辑器）；
 * 其余字段都是可选，最少只需写正文就能发一条。
 *
 * 字段说明：
 *  - date     发布时间，字符串 "YYYY-MM-DD HH:mm"（24h，空格分隔）。留空则按文件修改时间。
 *  - location 地点（可选），如「杭州」「中国」。
 *  - tags     标签数组（可选），如 ["测试","吐槽"]。
 *  - pinned   是否置顶（可选，默认 false）。
 *  - images   图片地址数组（可选）。可填图床外链，或后台「站点资源→日常吐槽图片」上传后的本地路径。
 *  - videos   视频地址数组（可选）。mp4/webm 等直链，页面上以 ▶ 缩略图呈现，点击进入灯箱加载播放（不预加载，省流量）。
 *
 * 注意：images/tags/videos 在后台以「列表」形式编辑，PagesCMS 可能序列化为
 *   标量数组（["a","b"]）或对象数组（[{url:"a"},{tag:"b"}]）。
 *   下方 schema 用 z.union 兼容两种形态；页面渲染时统一用 normList() 拍平为字符串数组。
 */
const momentsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/moments" }),
	schema: z.object({
		date: z.string().optional().default(""),
		location: z.string().optional().default(""),
		tags: z
			.array(z.union([z.string(), z.object({ tag: z.string() }).passthrough()]))
			.optional()
			.default([]),
		pinned: z.boolean().optional().default(false),
		images: z
			.array(z.union([z.string(), z.object({ url: z.string() }).passthrough()]))
			.optional()
			.default([]),
		videos: z
			.array(z.union([z.string(), z.object({ url: z.string() }).passthrough()]))
			.optional()
			.default([]),
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	moments: momentsCollection,
};
