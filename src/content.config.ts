import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// [关键词: 功能说明书-排除约定]
// --------------------------------------------------------------------------
// 每个内容文件夹（posts / spec / moments）里可以放一份「功能说明书」
// 文件名带功能前缀方便查找，例如：日常吐槽-功能说明书.md / 文章-功能说明书.md /
// 单页记录-功能说明书.md（或 README.md、下划线开头文件），给维护者看操作手册。
// 这些文档【绝不能】被前端当成真实内容渲染，也【不能】出现在后台编辑列表。
//
// Astro 的 glob loader 不支持 exclude 参数（它直接把 pattern 丢给 tinyglobby），
// 所以这里用「否定模式数组」来排除文档文件（先写匹配 .md/.mdx 的正模式，
// 再写以 ! 开头的否定模式，例如 "!**/*功能说明书*.md" 这类）：
//   pattern: ["**/*.md 匹配所有", "!**/*功能说明书*.md", "!**/README.md", "!**/_*.md"]
// 已实测：肯定模式在前、否定模式在后，tinyglobby 会正确剔除这些文档。
// 同时 .pages.yml 的对应集合也要加同样的 exclude，防止后台把文档当可编辑条目。
const DOC_EXCLUDE = ["!**/*功能说明书*.md", "!**/README.md", "!**/_*.md"];

const postsCollection = defineCollection({
	loader: glob({
		pattern: ["**/*.{md,mdx}", ...DOC_EXCLUDE],
		base: "./src/content/posts",
	}),
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
	loader: glob({
		pattern: ["**/*.{md,mdx}", ...DOC_EXCLUDE],
		base: "./src/content/spec",
	}),
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
	loader: glob({
		pattern: ["**/*.{md,mdx}", ...DOC_EXCLUDE],
		base: "./src/content/moments",
	}),
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

/**
 * [关键词: friends-collection] 友链 内容集合（后台可管理，对齐 moments 模式）
 * --------------------------------------------------------------------------
 * 数据来源：src/content/friends/*.md（每个友链一个文件）
 * 编辑方式：后台 PagesCMS「🔗 友链」集合（见仓库根 .pages.yml）
 *   —— 在后台增删改即可，提交后 Vercel 自动重建上线（无需改代码）。
 * 字段说明（均为可选，最少只需 title + siteurl + imgurl + desc）：
 *  - title    站点名称（必填显示）
 *  - imgurl   站点头像/Logo URL（必填显示）
 *  - desc     一句话描述（必填显示）
 *  - siteurl  站点链接（必填，点击跳转）
 *  - tags     分类标签数组（可选），用于筛选
 *  - weight   权重数字（可选，默认 5，越大越靠前）
 *  - enabled  是否启用（可选，默认 true；false 可临时隐藏）
 *
 * 注意：与 moments/posts 一样，本集合用 DOC_EXCLUDE 排除「*功能说明书*.md」等文档，
 * 文档不会被渲染、也不会进后台编辑列表。
 */
const friendsCollection = defineCollection({
	loader: glob({
		pattern: ["**/*.{md,mdx}", ...DOC_EXCLUDE],
		base: "./src/content/friends",
	}),
	schema: z.object({
		title: z.string().optional().default(""),
		imgurl: z.string().optional().default(""),
		desc: z.string().optional().default(""),
		siteurl: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		weight: z.number().optional().default(5),
		enabled: z.boolean().optional().default(true),
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	moments: momentsCollection,
	friends: friendsCollection,
};
