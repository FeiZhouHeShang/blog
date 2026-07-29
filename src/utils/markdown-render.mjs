// 共享 Markdown 渲染管线 —— 编辑器预览 / 构建时预渲染 / Astro content 共用一份插件链。
// 修改此文件即可让编辑器预览与发布页同步（添加/删除 remark/rehype 插件只改这一处）。
//
// 调用方式：
//   import { markdownProcessor, renderMarkdown } from "@/utils/markdown-render.mjs";
//   // 1) 供 astro.config.mjs 注入 markdown.processor
//   markdown: { processor: markdownProcessor }
//   // 2) 供 API / 构建脚本 / 测试调用（返回完整 HTML 字符串）
//   const html = await renderMarkdown(mdString);

import {
	createMarkdownProcessor,
	unified,
} from "@astrojs/markdown-remark";
import katex from "katex";
import "katex/dist/contrib/mhchem.mjs";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeCallouts from "rehype-callouts";
import rehypeComponents from "rehype-components";
import rehypeEmailProtection from "../plugins/rehype-email-protection.mjs";
import rehypeExternalLinks from "../plugins/rehype-external-links.mjs";
import { rehypeFigure } from "../plugins/rehype-figure.mjs";
import rehypeKatex from "rehype-katex";
import { rehypeMermaid } from "../plugins/rehype-mermaid.mjs";
import { rehypePlantuml } from "../plugins/rehype-plantuml.mjs";
import rehypeSlug from "rehype-slug";
import { GithubCardComponent } from "../plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "../plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "../plugins/remark-excerpt.js";
import { remarkImageGrid } from "../plugins/remark-image-grid.js";
import { remarkMermaid } from "../plugins/remark-mermaid.js";
import { remarkPlantuml } from "../plugins/remark-plantuml.js";
import { remarkReadingTime } from "../plugins/remark-reading-time.mjs";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";

// ============ 镜像自 src/config/*.ts 的少量常量 ============
// 为了让本 .mjs 模块既能在 Astro/Vite 中加载（不需要额外配置），
// 也能在 Node 脚本（scripts/gen-posts-content.mjs）中直接 require，
// 避免 .mjs → .ts 的跨扩展名解析问题。
// 如有改动，请同步 src/config/plantumlConfig.ts 与 src/config/siteConfig.ts。
const PLANTUML_CONFIG = {
	enable: true,
	server: "https://www.plantuml.com/plantuml",
	lightTheme: "",
	darkTheme: "cyborg",
};
const SITE_URL = "https://55633000.ccwu.cc"; // src/config/siteConfig.ts: site_url
const REHYPE_CALLOUTS_THEME = "github"; // src/config/siteConfig.ts: rehypeCallouts.theme

// ============ 插件列表（与发布页完全一致） ============
const remarkPlugins = [
	remarkMath,
	remarkReadingTime,
	remarkImageGrid,
	remarkExcerpt,
	remarkDirective,
	remarkSectionize,
	parseDirectiveNode,
	remarkMermaid,
	[remarkPlantuml, PLANTUML_CONFIG],
];

const rehypePlugins = [
	[rehypeKatex, { katex }],
	[
		rehypeCallouts,
		{
			theme: REHYPE_CALLOUTS_THEME,
			// 自定义 callout 类型：info（与 note 同色系，蓝）
			// 合并进主题默认类型，note/tip/important/warning/caution 不受影响。
			// 前后端共用本管线，故预览与发布页完全一致。
			callouts: {
				info: {
					title: "信息",
					indicator:
						'<svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>',
				},
			},
		},
	],
	rehypeSlug,
	rehypeMermaid,
	rehypePlantuml,
	rehypeFigure,
	[rehypeExternalLinks, { siteUrl: SITE_URL }],
	[rehypeEmailProtection, { method: "base64" }],
	[
		rehypeComponents,
		{
			components: {
				github: GithubCardComponent,
			},
		},
	],
	[
		rehypeAutolinkHeadings,
		{
			behavior: "append",
			properties: { className: ["anchor"] },
			content: {
				type: "element",
				tagName: "span",
				properties: {
					className: ["anchor-icon"],
					"data-pagefind-ignore": true,
				},
				children: [{ type: "text", value: "#" }],
			},
		},
	],
];

// ============ 给 astro.config.mjs 用的 processor ============
// Astro 会调用 .createRenderer(shared) 然后 .render(content, {fileURL, frontmatter})
export const markdownProcessor = unified({
	remarkPlugins,
	rehypePlugins,
});

// ============ 给 dev API / 构建脚本用的渲染函数（异步懒加载） ============
let _processorPromise = null;
async function getProcessor() {
	if (!_processorPromise) {
		_processorPromise = createMarkdownProcessor({
			remarkPlugins,
			rehypePlugins,
		});
	}
	return _processorPromise;
}

/**
 * 渲染一段 Markdown 字符串，返回 HTML 字符串。
 * 这是 dev preview API 和 build-time pre-render 共用的入口。
 * @param {string} md
 * @param {object} [opts]
 * @param {object} [opts.frontmatter] - 模拟 frontmatter（heading 收集等元数据依赖此）
 * @returns {Promise<string>} HTML
 */
export async function renderMarkdown(md, opts = {}) {
	const proc = await getProcessor();
	const result = await proc.render(String(md || ""), {
		frontmatter: opts.frontmatter || {},
	});
	return result.code;
}
