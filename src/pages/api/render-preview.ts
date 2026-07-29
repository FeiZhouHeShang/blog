// /api/render-preview — 共享 markdown 渲染管线的 SSR 入口。
// 编辑器实时预览、文章预览快照、新文章草稿预览等都走这里。
// dev: 由 Astro dev server 直接运行；prod: 若配了 SSR adapter 也能用，否则 prod 走静态 HTML 副本。
//
// 调用方式：POST { markdown, frontmatter? } → { html }

// 注意：早期版本曾用 `export const prerender = false` 强制 SSR，但这要求部署平台
// 配置 Astro SSR adapter（如 @astrojs/vercel）。本项目以静态构建部署（Vercel 静态输出），
// prod 预览走构建期生成的静态 HTML 副本（public/posts-content/*.html，见 scripts/gen-posts-content.mjs）。
// 因此这里不再声明 prerender=false —— 默认走静态预渲染，构建即可通过；
// dev 模式 Astro 仍会动态提供该端点（POST 实时预览照常工作）。
import { renderMarkdown } from "@/utils/markdown-render.mjs";

export async function GET() {
	return new Response(
		JSON.stringify({ ok: true, hint: "POST { markdown } → { html }" }),
		{ status: 200, headers: { "Content-Type": "application/json" } },
	);
}

export async function POST({ request }) {
	let body = {};
	try {
		const txt = await request.text();
		body = txt ? JSON.parse(txt) : {};
	} catch {
		return new Response(JSON.stringify({ error: "invalid JSON body" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
	const md = typeof body.markdown === "string" ? body.markdown : "";
	try {
		const html = await renderMarkdown(md, { frontmatter: body.frontmatter || {} });
		return new Response(JSON.stringify({ html }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
			},
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
